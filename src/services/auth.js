import { supabase } from './database.js';

// O Supabase Auth identifica o usuário pelo e-mail (é o padrão da
// indústria e o mais simples de manter seguro). Por isso o login do
// sistema pede "e-mail" em vez de um "usuário" de texto livre — é a
// mesma conta, só que a forma de identificar é o e-mail cadastrado.

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduzErro(error.message));
  return data.user;
}

export async function sair() {
  await supabase.auth.signOut();
}

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function aoMudarSessao(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function buscarMeuPerfil(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function solicitarRecuperacaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(traduzErro(error.message));
}

export async function trocarMinhaSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw new Error(traduzErro(error.message));
}

function traduzErro(msg) {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha inválidos.';
  if (/email not confirmed/i.test(msg)) return 'Este e-mail ainda não foi confirmado.';
  return msg;
}
