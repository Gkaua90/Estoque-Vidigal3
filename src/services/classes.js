import { supabase } from './database.js';

export async function listarClasses() {
  const { data, error } = await supabase.from('classes').select('*').order('nome');
  if (error) throw error;
  return data;
}

export async function criarClasse(nome) {
  const { error } = await supabase.from('classes').insert({ nome });
  if (error) throw new Error(error.code === '23505' ? 'Essa classe já existe.' : error.message);
}

export async function excluirClasse(id) {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') throw new Error('Existem produtos usando essa classe.');
    throw error;
  }
}
