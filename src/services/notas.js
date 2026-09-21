import { supabase } from './database.js';

export async function registrarSaida({ numero, data, lojaId, itens }) {
  const { data: invoiceId, error } = await supabase.rpc('registrar_saida', {
    p_numero: numero,
    p_data: data,
    p_store_id: lojaId,
    p_itens: itens.map((it) => ({ product_id: it.produtoId, quantidade: it.quantidade })),
  });
  if (error) {
    if (error.message.includes('duplicate key') || error.message.includes('invoices_numero_key')) {
      throw new Error('Já existe uma nota com esse número.');
    }
    throw new Error(error.message);
  }
  return invoiceId;
}

export async function listarNotas({ lojaId, de, ate, busca, limite = 60 } = {}) {
  let query = supabase
    .from('invoices')
    .select('*, stores(nome), invoice_items(*)')
    .order('data', { ascending: false })
    .order('numero', { ascending: false })
    .limit(limite);
  if (lojaId && lojaId !== 'todas') query = query.eq('store_id', lojaId);
  if (de) query = query.gte('data', de);
  if (ate) query = query.lte('data', ate);
  if (busca) query = query.ilike('numero', `%${busca}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapNota);
}

function mapNota(row) {
  return {
    id: row.id,
    numero: row.numero,
    data: row.data,
    lojaId: row.store_id,
    lojaNome: row.stores ? row.stores.nome : '—',
    status: row.status,
    total: Number(row.total),
    canceladoEm: row.cancelado_em,
    motivoCancelamento: row.motivo_cancelamento,
    itens: (row.invoice_items || []).map((it) => ({
      produtoId: it.product_id, produtoNome: it.produto_nome, classe: it.classe_nome,
      quantidade: it.quantidade, valorUnitario: Number(it.valor_unitario), valorTotal: Number(it.valor_total),
    })),
  };
}

export async function cancelarNota(invoiceId, motivo) {
  const { error } = await supabase.rpc('cancelar_nota', { p_invoice_id: invoiceId, p_motivo: motivo });
  if (error) throw new Error(error.message);
}
