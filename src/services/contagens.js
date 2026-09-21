import { supabase } from './database.js';

export async function registrarContagem({ tipo, data, observacao, itens }) {
  const { data: countId, error } = await supabase.rpc('registrar_contagem', {
    p_tipo: tipo,
    p_data: data,
    p_observacao: observacao,
    p_itens: itens.map((it) => ({ product_id: it.produtoId, contado: it.contado })),
  });
  if (error) throw new Error(error.message);
  return countId;
}

export async function listarContagens() {
  const { data, error } = await supabase
    .from('inventory_counts')
    .select('*, inventory_count_items(*)')
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapContagem);
}

function mapContagem(row) {
  return {
    id: row.id, tipo: row.tipo, data: row.data, observacao: row.observacao,
    status: row.status, ajustadoEm: row.ajustado_em,
    itens: (row.inventory_count_items || []).map((it) => ({
      produtoId: it.product_id, produtoNome: it.produto_nome, classe: it.classe_nome,
      sistema: it.sistema, contado: it.contado, diferenca: it.diferenca,
    })),
  };
}

export async function aplicarAjustesContagem(countId) {
  const { error } = await supabase.rpc('aplicar_ajustes_contagem', { p_count_id: countId });
  if (error) throw new Error(error.message);
}
