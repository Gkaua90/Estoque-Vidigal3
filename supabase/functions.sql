-- ============================================================
-- ESTOQUE VIDIGAL — FUNÇÕES TRANSACIONAIS (RPC)
-- ============================================================
-- Rode DEPOIS de schema.sql e ANTES de policies.sql.
--
-- Por que "security definer"? Porque cada chamada aqui precisa alterar
-- várias tabelas de uma vez (products + invoices + invoice_items +
-- stock_movements, por exemplo) de forma tudo-ou-nada. Com "security
-- definer" a função roda com um privilégio fixo (o do dono dela) e faz
-- sua PRÓPRIA checagem de permissão logo na primeira linha — o cliente
-- (navegador) nunca decide sozinho se a operação é permitida.
-- Cada função roda inteira dentro de uma única transação implícita do
-- Postgres: se qualquer passo falhar (ex.: estoque insuficiente), TUDO
-- é desfeito — nunca fica "nota salva mas estoque não baixou".
-- O "select ... for update" trava a linha do produto durante a operação,
-- resolvendo o problema de concorrência (dois usuários mexendo no mesmo
-- produto ao mesmo tempo): a segunda chamada espera a primeira terminar
-- e enxerga o estoque JÁ atualizado antes de decidir se ainda há saldo.

-- ------------------------------------------------------------
-- registrar_saida: cria a nota + itens + baixa o estoque + histórico
-- ------------------------------------------------------------
create or replace function public.registrar_saida(
  p_numero text,
  p_data date,
  p_store_id uuid,
  p_itens jsonb -- [{"product_id": "...", "quantidade": 10}, ...]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_classe_nome text;
  v_store_nome text;
  v_qtd integer;
  v_valor_total numeric(12,2);
  v_total numeric(12,2) := 0;
begin
  if not public.is_staff() then
    raise exception 'Sem permissão para registrar saída.';
  end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'A nota precisa ter ao menos um item.';
  end if;

  select nome into v_store_nome from public.stores where id = p_store_id;
  if v_store_nome is null then raise exception 'Loja não encontrada.'; end if;

  insert into public.invoices (numero, data, store_id, criado_por, total, status)
  values (p_numero, p_data, p_store_id, auth.uid(), 0, 'emitida')
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::integer;
    if v_qtd is null or v_qtd <= 0 then
      raise exception 'Quantidade inválida para um dos itens.';
    end if;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid
      for update; -- trava a linha: resolve concorrência entre usuários

    if not found then raise exception 'Produto não encontrado.'; end if;
    if v_product.quantidade < v_qtd then
      raise exception 'Estoque insuficiente para %: disponível %, solicitado %.', v_product.nome, v_product.quantidade, v_qtd;
    end if;

    select nome into v_classe_nome from public.classes where id = v_product.classe_id;
    v_valor_total := v_qtd * v_product.valor_unitario;
    v_total := v_total + v_valor_total;

    insert into public.invoice_items (invoice_id, product_id, produto_nome, classe_id, classe_nome, quantidade, valor_unitario, valor_total)
    values (v_invoice_id, v_product.id, v_product.nome, v_product.classe_id, v_classe_nome, v_qtd, v_product.valor_unitario, v_valor_total);

    perform set_config('app.allow_quantity_change', 'on', true);
    update public.products set quantidade = quantidade - v_qtd where id = v_product.id;

    insert into public.stock_movements (tipo, product_id, produto_nome, classe_nome, quantidade, estoque_resultante, referencia, descricao, data, usuario_id, usuario_nome)
    values ('SAIDA', v_product.id, v_product.nome, v_classe_nome, -v_qtd, v_product.quantidade - v_qtd, 'Nota '||p_numero, 'Venda para '||v_store_nome, p_data, auth.uid(), (select nome from public.profiles where id = auth.uid()));
  end loop;

  update public.invoices set total = v_total where id = v_invoice_id;
  return v_invoice_id;
end;
$$;
revoke all on function public.registrar_saida(text,date,uuid,jsonb) from public;
grant execute on function public.registrar_saida(text,date,uuid,jsonb) to authenticated;

-- ------------------------------------------------------------
-- registrar_entrada: aumenta o estoque + histórico
-- ------------------------------------------------------------
create or replace function public.registrar_entrada(
  p_data date,
  p_referencia text,
  p_fornecedor text,
  p_observacao text,
  p_itens jsonb -- [{"product_id": "...", "quantidade": 10}, ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_classe_nome text;
  v_qtd integer;
  v_desc text;
begin
  if not public.is_staff() then
    raise exception 'Sem permissão para registrar entrada.';
  end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um item recebido.';
  end if;

  v_desc := trim(coalesce('Fornecedor: '||nullif(p_fornecedor,''), '') || ' ' || coalesce(p_observacao,''));

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::integer;
    if v_qtd is null or v_qtd <= 0 then raise exception 'Quantidade inválida para um dos itens.'; end if;

    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
    if not found then raise exception 'Produto não encontrado.'; end if;
    select nome into v_classe_nome from public.classes where id = v_product.classe_id;

    perform set_config('app.allow_quantity_change', 'on', true);
    update public.products set quantidade = quantidade + v_qtd where id = v_product.id;

    insert into public.stock_movements (tipo, product_id, produto_nome, classe_nome, quantidade, estoque_resultante, referencia, descricao, data, usuario_id, usuario_nome)
    values ('ENTRADA', v_product.id, v_product.nome, v_classe_nome, v_qtd, v_product.quantidade + v_qtd, coalesce(nullif(p_referencia,''),'—'), v_desc, p_data, auth.uid(), (select nome from public.profiles where id = auth.uid()));
  end loop;
end;
$$;
revoke all on function public.registrar_entrada(date,text,text,text,jsonb) from public;
grant execute on function public.registrar_entrada(date,text,text,text,jsonb) to authenticated;

-- ------------------------------------------------------------
-- ajustar_estoque_manual: correção pontual de um produto (com motivo)
-- ------------------------------------------------------------
create or replace function public.ajustar_estoque_manual(
  p_product_id uuid,
  p_novo_estoque integer,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_classe_nome text;
  v_delta integer;
begin
  if not public.is_staff() then raise exception 'Sem permissão para ajustar estoque.'; end if;
  if p_novo_estoque < 0 then raise exception 'Estoque não pode ficar negativo.'; end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;
  v_delta := p_novo_estoque - v_product.quantidade;
  if v_delta = 0 then return; end if;
  select nome into v_classe_nome from public.classes where id = v_product.classe_id;

  perform set_config('app.allow_quantity_change', 'on', true);
  update public.products set quantidade = p_novo_estoque where id = p_product_id;

  insert into public.stock_movements (tipo, product_id, produto_nome, classe_nome, quantidade, estoque_resultante, referencia, descricao, data, usuario_id, usuario_nome)
  values ('AJUSTE', v_product.id, v_product.nome, v_classe_nome, v_delta, p_novo_estoque, 'Ajuste manual', coalesce(nullif(p_motivo,''),'Ajuste de estoque'), current_date, auth.uid(), (select nome from public.profiles where id = auth.uid()));
end;
$$;
revoke all on function public.ajustar_estoque_manual(uuid,integer,text) from public;
grant execute on function public.ajustar_estoque_manual(uuid,integer,text) to authenticated;

-- ------------------------------------------------------------
-- registrar_contagem: salva o snapshot (cabeçalho + itens) de uma vez
-- NÃO mexe no estoque — é só um retrato do momento.
-- ------------------------------------------------------------
create or replace function public.registrar_contagem(
  p_tipo text,
  p_data date,
  p_observacao text,
  p_itens jsonb -- [{"product_id":"...", "contado": 810}, ...]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_classe_nome text;
begin
  if not public.is_staff() then raise exception 'Sem permissão para registrar contagem.'; end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then raise exception 'Nenhum produto para contar.'; end if;

  insert into public.inventory_counts (tipo, data, observacao, status, criado_por)
  values (p_tipo, p_data, p_observacao, 'conferida', auth.uid())
  returning id into v_count_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid;
    if not found then continue; end if;
    select nome into v_classe_nome from public.classes where id = v_product.classe_id;

    insert into public.inventory_count_items (count_id, product_id, produto_nome, classe_nome, sistema, contado)
    values (v_count_id, v_product.id, v_product.nome, v_classe_nome, v_product.quantidade, (v_item->>'contado')::integer);
  end loop;

  return v_count_id;
end;
$$;
revoke all on function public.registrar_contagem(text,date,text,jsonb) from public;
grant execute on function public.registrar_contagem(text,date,text,jsonb) to authenticated;

-- ------------------------------------------------------------
-- aplicar_ajustes_contagem: aplica as diferenças de UMA contagem ao
-- estoque atual. A contagem original (inventory_count_items) NUNCA é
-- alterada — só os produtos e o histórico são atualizados.
-- ------------------------------------------------------------
create or replace function public.aplicar_ajustes_contagem(
  p_count_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.inventory_counts%rowtype;
  v_item public.inventory_count_items%rowtype;
  v_product public.products%rowtype;
  v_delta integer;
  v_tipo_label text;
begin
  if not public.is_staff() then raise exception 'Sem permissão para aplicar ajustes.'; end if;

  select * into v_count from public.inventory_counts where id = p_count_id for update;
  if not found then raise exception 'Contagem não encontrada.'; end if;
  if v_count.status = 'ajustada' then raise exception 'Esta contagem já teve os ajustes aplicados.'; end if;

  v_tipo_label := case when v_count.tipo = 'geral' then 'Contagem geral' else 'Contagem semanal' end;

  for v_item in select * from public.inventory_count_items where count_id = p_count_id loop
    if v_item.diferenca = 0 then continue; end if;
    select * into v_product from public.products where id = v_item.product_id for update;
    if not found then continue; end if; -- produto pode ter sido excluído depois da contagem

    v_delta := v_item.contado - v_product.quantidade; -- reconcilia mesmo se o estoque mudou desde a contagem
    if v_delta = 0 then continue; end if;

    perform set_config('app.allow_quantity_change', 'on', true);
    update public.products set quantidade = v_item.contado where id = v_product.id;

    insert into public.stock_movements (tipo, product_id, produto_nome, classe_nome, quantidade, estoque_resultante, referencia, descricao, data, usuario_id, usuario_nome)
    values ('AJUSTE', v_product.id, v_product.nome, v_item.classe_nome, v_delta, v_item.contado, v_tipo_label||' de '||to_char(v_count.data,'DD/MM/YYYY'), v_tipo_label||' — ajuste aplicado', current_date, auth.uid(), (select nome from public.profiles where id = auth.uid()));
  end loop;

  update public.inventory_counts
    set status = 'ajustada', ajustado_por = auth.uid(), ajustado_em = now()
    where id = p_count_id;
end;
$$;
revoke all on function public.aplicar_ajustes_contagem(uuid) from public;
grant execute on function public.aplicar_ajustes_contagem(uuid) to authenticated;

-- ------------------------------------------------------------
-- cancelar_nota: cancela (nunca apaga) e devolve os itens ao estoque
-- ------------------------------------------------------------
create or replace function public.cancelar_nota(
  p_invoice_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_item public.invoice_items%rowtype;
  v_product public.products%rowtype;
begin
  if not public.is_admin() then raise exception 'Somente o administrador pode cancelar notas.'; end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Nota não encontrada.'; end if;
  if v_invoice.status = 'cancelada' then raise exception 'Esta nota já está cancelada.'; end if;

  for v_item in select * from public.invoice_items where invoice_id = p_invoice_id loop
    select * into v_product from public.products where id = v_item.product_id for update;
    if not found then continue; end if;

    perform set_config('app.allow_quantity_change', 'on', true);
    update public.products set quantidade = quantidade + v_item.quantidade where id = v_product.id;

    insert into public.stock_movements (tipo, product_id, produto_nome, classe_nome, quantidade, estoque_resultante, referencia, descricao, data, usuario_id, usuario_nome)
    values ('AJUSTE', v_product.id, v_product.nome, v_item.classe_nome, v_item.quantidade, v_product.quantidade + v_item.quantidade, 'Estorno nota '||v_invoice.numero, coalesce('Nota cancelada: '||nullif(p_motivo,''), 'Nota cancelada — itens devolvidos ao estoque'), current_date, auth.uid(), (select nome from public.profiles where id = auth.uid()));
  end loop;

  update public.invoices
    set status = 'cancelada', cancelado_por = auth.uid(), cancelado_em = now(), motivo_cancelamento = p_motivo
    where id = p_invoice_id;
end;
$$;
revoke all on function public.cancelar_nota(uuid,text) from public;
grant execute on function public.cancelar_nota(uuid,text) to authenticated;
