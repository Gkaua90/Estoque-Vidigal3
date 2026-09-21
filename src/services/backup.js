import { supabase } from './database.js';

// ------------------------------------------------------------
// EXPORTAR: baixa um JSON com tudo que está no banco agora. Use isso
// periodicamente como backup manual (além dos backups automáticos que
// o próprio Supabase já faz — ver README, seção "Backup").
// ------------------------------------------------------------
export async function exportarBackupCompleto() {
  const tabelas = ['classes', 'stores', 'products', 'invoices', 'invoice_items', 'stock_movements', 'inventory_counts', 'inventory_count_items', 'profiles'];
  const resultado = { geradoEm: new Date().toISOString() };
  for (const t of tabelas) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) throw error;
    resultado[t] = data;
  }
  const blob = new Blob([JSON.stringify(resultado, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_estoque_vidigal_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------
// IMPORTAR DADOS DO SISTEMA ANTIGO (o arquivo HTML único, que usava
// window.storage). Essa função espera o formato exportado pelo botão
// "Exportar dados" da versão antiga (produtos, classes, lojas, notas,
// movimentos, contagens). Ela recria tudo no Supabase, mapeando os
// IDs antigos para os novos UUIDs, e preservando a ordem histórica.
//
// IMPORTANTE: rode isso UMA VEZ SÓ, logo depois de configurar o banco
// novo, antes de começar a usar o sistema novo no dia a dia. Rodar
// duas vezes duplica os dados (esta função não verifica duplicidade).
// ------------------------------------------------------------
export async function importarBackupAntigo(json, { onProgresso } = {}) {
  const log = (msg) => onProgresso && onProgresso(msg);
  const mapaClasses = {}; // nome -> uuid novo
  const mapaProdutos = {}; // id antigo -> uuid novo
  const mapaLojas = {}; // id antigo -> uuid novo

  log('Importando classes...');
  for (const nome of json.classes || []) {
    const { data: existente } = await supabase.from('classes').select('id').eq('nome', nome).maybeSingle();
    if (existente) { mapaClasses[nome] = existente.id; continue; }
    const { data, error } = await supabase.from('classes').insert({ nome }).select('id').single();
    if (error) throw error;
    mapaClasses[nome] = data.id;
  }

  log('Importando lojas...');
  for (const l of json.lojas || []) {
    const { data, error } = await supabase.from('stores').insert({
      nome: l.nome, razao_social: l.razaoSocial, cnpj: l.cnpj, endereco: l.endereco,
      estado: l.estado, banco: l.banco, agencia: l.agencia, conta: l.conta, status: l.status || 'ativo',
    }).select('id').single();
    if (error) throw error;
    mapaLojas[l.id] = data.id;
  }

  log('Importando produtos (fotos em base64 não são migradas automaticamente — reenvie-as depois pela tela de Estoque)...');
  for (const p of json.produtos || []) {
    const { data, error } = await supabase.from('products').insert({
      nome: p.nome, codigo: p.codigo, classe_id: mapaClasses[p.classe] || null,
      valor_unitario: p.valorUnitario, quantidade: p.quantidade, estoque_minimo: p.estoqueMinimo || 50,
      status: p.status || 'ativo',
    }).select('id').single();
    if (error) throw error;
    mapaProdutos[p.id] = data.id;
  }

  log('Importando notas e itens...');
  for (const n of json.notas || []) {
    const { data: nota, error } = await supabase.from('invoices').insert({
      numero: n.numero, data: n.data, store_id: mapaLojas[n.lojaId] || null, total: n.total, status: 'emitida',
    }).select('id').single();
    if (error) { log(`Nota ${n.numero} ignorada (${error.message}).`); continue; }
    for (const it of n.itens || []) {
      await supabase.from('invoice_items').insert({
        invoice_id: nota.id, product_id: mapaProdutos[it.produtoId] || null, produto_nome: it.produtoNome,
        classe_nome: it.classe, quantidade: it.quantidade, valor_unitario: it.valorUnitario, valor_total: it.valorTotal,
      });
    }
  }

  log('Importando histórico de movimentações...');
  for (const m of json.movimentos || []) {
    await supabase.from('stock_movements').insert({
      tipo: m.tipo, product_id: mapaProdutos[m.produtoId] || null, produto_nome: m.produtoNome,
      classe_nome: m.classe, quantidade: m.quantidade, estoque_resultante: m.estoqueResultante,
      referencia: m.referencia, descricao: m.descricao, data: m.data, usuario_nome: m.usuario,
    });
  }

  log('Importando contagens...');
  for (const c of json.contagens || []) {
    const { data: contagem, error } = await supabase.from('inventory_counts').insert({
      tipo: c.tipo, data: c.data, observacao: c.observacao, status: c.status || 'conferida',
    }).select('id').single();
    if (error) { log(`Contagem de ${c.data} ignorada (${error.message}).`); continue; }
    for (const it of c.itens || []) {
      await supabase.from('inventory_count_items').insert({
        count_id: contagem.id, product_id: mapaProdutos[it.produtoId] || null, produto_nome: it.produtoNome,
        classe_nome: it.classe, sistema: it.sistema, contado: it.contado,
      });
    }
  }

  log('Importação concluída.');
}
