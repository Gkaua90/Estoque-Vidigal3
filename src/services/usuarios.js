import { supabase } from './database.js';
import { SUPABASE_URL } from '../config.js';

export async function listarUsuarios() {
  const { data, error } = await supabase.from('profiles').select('*').order('nome');
  if (error) throw error;
  return data.map((u) => ({ id: u.id, nome: u.nome, perfil: u.perfil, status: u.status }));
}

// Atualiza nome/perfil/status de um login que JÁ EXISTE no Supabase Auth.
// (Para o passo a passo de criar o login em si, veja o README — seção
// "Como criar novos usuários": é feito uma vez pelo painel do Supabase,
// e a partir daí o administrador gerencia tudo por aqui.)
export async function atualizarUsuario(id, { nome, perfil, status }) {
  const { error } = await supabase.from('profiles').update({ nome, perfil, status }).eq('id', id);
  if (error) throw new Error(error.message);
}

// Caminho opcional e avançado: cria o LOGIN inteiro (e-mail + senha) via
// a Edge Function "create-user" (supabase/functions/create-user). Só
// funciona se essa função tiver sido publicada (ver README). Se não
// tiver sido, o botão mostra a mensagem explicando a alternativa manual.
export async function criarUsuarioCompleto({ nome, email, senha, perfil }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nome, email, senha, perfil }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(
      body.error ||
      'Não foi possível criar o login automaticamente. Crie manualmente em Supabase → Authentication → Users, ' +
      'e depois defina o perfil dele nesta tela (veja o README).'
    );
  }
  return body;
}
