-- ============================================================
-- ESTOQUE VIDIGAL — POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Rode por último (depois de schema.sql e functions.sql).
--
-- Regra geral usada aqui:
-- - "SELECT" (ler) é liberado para qualquer usuário ATIVO logado
--   (administrador, operador ou visualização) — todos precisam ver
--   o mesmo estoque.
-- - "INSERT/UPDATE/DELETE" direto nas tabelas de movimento
--   (invoices, invoice_items, stock_movements, inventory_counts,
--   inventory_count_items) é BLOQUEADO para todo mundo — essas
--   tabelas só mudam através das funções RPC de functions.sql, que
--   fazem a validação e a baixa de estoque de forma atômica.
-- - Cadastros simples (products, stores, classes) aceitam
--   INSERT/UPDATE direto, mas só de "is_staff()" (administrador ou
--   operador); DELETE físico é só do administrador, e mesmo assim o
--   app usa "status=inativo" em vez de apagar quando já existe
--   histórico (ver services/produtos.js e services/lojas.js).
-- - "profiles" (usuários) só o administrador lê/edita todo mundo;
--   cada usuário also lê o próprio registro (para saber seu perfil
--   ao entrar no sistema).

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_count_items enable row level security;

-- ---------------- profiles ----------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
-- Não existe policy de INSERT/DELETE: o registro em "profiles" é criado
-- automaticamente pela trigger handle_new_user() quando a conta é criada
-- no Supabase Auth, e nunca é apagado por aqui (evita quebrar históricos
-- que referenciam esse usuário).

-- ---------------- classes ----------------
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select using (public.is_active_user());
drop policy if exists classes_write on public.classes;
create policy classes_write on public.classes for all using (public.is_admin()) with check (public.is_admin());

-- ---------------- stores ----------------
drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores for select using (public.is_active_user());
drop policy if exists stores_write on public.stores;
create policy stores_write on public.stores for all using (public.is_admin()) with check (public.is_admin());

-- ---------------- products ----------------
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (public.is_active_user());
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert with check (public.is_staff());
drop policy if exists products_update on public.products;
create policy products_update on public.products for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete using (public.is_admin());

-- ---------------- invoices / invoice_items (só via RPC) ----------------
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select using (public.is_active_user());
drop policy if exists invoices_no_direct_write on public.invoices;
create policy invoices_no_direct_write on public.invoices for insert with check (false);
-- Exceção só para o administrador: usada UMA VEZ na importação do backup
-- do sistema antigo (services/backup.js). No dia a dia, o app sempre usa
-- a função registrar_saida(), nunca este caminho direto.
drop policy if exists invoices_admin_import on public.invoices;
create policy invoices_admin_import on public.invoices for insert with check (public.is_admin());
drop policy if exists invoices_no_direct_update on public.invoices;
create policy invoices_no_direct_update on public.invoices for update using (false);
drop policy if exists invoices_no_direct_delete on public.invoices;
create policy invoices_no_direct_delete on public.invoices for delete using (false);

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items for select using (public.is_active_user());
drop policy if exists invoice_items_no_direct_write on public.invoice_items;
create policy invoice_items_no_direct_write on public.invoice_items for insert with check (false);
drop policy if exists invoice_items_admin_import on public.invoice_items;
create policy invoice_items_admin_import on public.invoice_items for insert with check (public.is_admin());
drop policy if exists invoice_items_no_direct_delete on public.invoice_items;
create policy invoice_items_no_direct_delete on public.invoice_items for delete using (false);

-- ---------------- stock_movements (só via RPC, somente leitura direta) ----------------
drop policy if exists movements_select on public.stock_movements;
create policy movements_select on public.stock_movements for select using (public.is_active_user());
drop policy if exists movements_no_direct_write on public.stock_movements;
create policy movements_no_direct_write on public.stock_movements for insert with check (false);
drop policy if exists movements_admin_import on public.stock_movements;
create policy movements_admin_import on public.stock_movements for insert with check (public.is_admin());

-- ---------------- inventory_counts / inventory_count_items (só via RPC) ----------------
drop policy if exists counts_select on public.inventory_counts;
create policy counts_select on public.inventory_counts for select using (public.is_active_user());
drop policy if exists counts_no_direct_write on public.inventory_counts;
create policy counts_no_direct_write on public.inventory_counts for insert with check (false);
drop policy if exists counts_admin_import on public.inventory_counts;
create policy counts_admin_import on public.inventory_counts for insert with check (public.is_admin());
drop policy if exists counts_no_direct_update on public.inventory_counts;
create policy counts_no_direct_update on public.inventory_counts for update using (false);

drop policy if exists count_items_select on public.inventory_count_items;
create policy count_items_select on public.inventory_count_items for select using (public.is_active_user());
drop policy if exists count_items_no_direct_write on public.inventory_count_items;
create policy count_items_no_direct_write on public.inventory_count_items for insert with check (false);
drop policy if exists count_items_admin_import on public.inventory_count_items;
create policy count_items_admin_import on public.inventory_count_items for insert with check (public.is_admin());

-- ============================================================
-- STORAGE — bucket de fotos dos produtos
-- ============================================================
-- Crie o bucket pelo painel (Storage → New bucket → nome:
-- "product-images" → marque "Public bucket"). As políticas abaixo
-- controlam quem pode ENVIAR/APAGAR arquivos (leitura é pública,
-- pois são só fotos de produtos, nada sensível).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_write on storage.objects;
create policy product_images_write on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects
  for update using (bucket_id = 'product-images' and public.is_staff());

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_staff());
