import { supabase } from './database.js';

// Entrada e saída chamam funções RPC (ver supabase/functions.sql) que
// fazem tudo — validação, baixa/alta de estoque e o registro no
// histórico — em uma única transação no banco. Isso é o que garante
// que nunca fique "salvo pela metade" (nota gravada mas estoque não
// baixou, ou vice-versa), mesmo com duas pessoas mexendo ao mesmo tempo.

export async function registrarEntrada({ data, referencia, fornecedor, observacao, itens }) {
  const { error } = await supabase.rpc('registrar_entrada', {
    p_data: data,
    p_referencia: referencia,
    p_fornecedor: fornecedor,
    p_observacao: observacao,
    p_itens: itens.map((it) => ({ product_id: it.produtoId, quantidade: it.quantidade })),
  });
  if (error) throw new Error(error.message);
}

export async function ajustarEstoqueManual(produtoId, novoEstoque, motivo) {
  const { error } = await supabase.rpc('ajustar_estoque_manual', {
    p_product_id: produtoId, p_novo_estoque: novoEstoque, p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

export async function listarMovimentos({ tipo, de, ate, busca, limite = 100 } = {}) {
  let query = supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(limite);
  if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo);
  if (de) query = query.gte('data', de);
  if (ate) query = query.lte('data', ate);
  if (busca) query = query.or(`produto_nome.ilike.%${busca}%,referencia.ilike.%${busca}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((m) => ({
    id: m.id, tipo: m.tipo, produtoId: m.product_id, produtoNome: m.produto_nome,
    classe: m.classe_nome, quantidade: m.quantidade, estoqueResultante: m.estoque_resultante,
    referencia: m.referencia, descricao: m.descricao, data: m.data, usuario: m.usuario_nome,
    criadoEm: m.created_at,
  }));
}
