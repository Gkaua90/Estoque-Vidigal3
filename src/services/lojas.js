import { supabase } from './database.js';

export async function listarLojas() {
  const { data, error } = await supabase.from('stores').select('*').order('nome');
  if (error) throw error;
  return data.map(mapLoja);
}

function mapLoja(row) {
  return {
    id: row.id, nome: row.nome, razaoSocial: row.razao_social, cnpj: row.cnpj,
    endereco: row.endereco, estado: row.estado, banco: row.banco,
    agencia: row.agencia, conta: row.conta, status: row.status,
  };
}

export async function criarLoja(dados) {
  const { data, error } = await supabase.from('stores').insert(paraColunas(dados)).select().single();
  if (error) throw error;
  return mapLoja(data);
}

export async function atualizarLoja(id, dados) {
  const { data, error } = await supabase.from('stores').update(paraColunas(dados)).eq('id', id).select().single();
  if (error) throw error;
  return mapLoja(data);
}

export async function excluirOuDesativarLoja(id) {
  const { count, error: errCount } = await supabase
    .from('invoices').select('id', { count: 'exact', head: true }).eq('store_id', id);
  if (errCount) throw errCount;
  if (count && count > 0) {
    const { error } = await supabase.from('stores').update({ status: 'inativo' }).eq('id', id);
    if (error) throw error;
    return 'desativado';
  }
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw error;
  return 'excluido';
}

function paraColunas(d) {
  return {
    nome: d.nome, razao_social: d.razaoSocial, cnpj: d.cnpj, endereco: d.endereco,
    estado: d.estado, banco: d.banco, agencia: d.agencia, conta: d.conta, status: d.status,
  };
}
