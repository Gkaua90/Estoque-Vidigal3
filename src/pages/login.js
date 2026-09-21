import { ICONS } from '../components/icons.js';
import { entrar, solicitarRecuperacaoSenha } from '../services/auth.js';
import { showToast } from '../components/modal.js';

function shell(inner) {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">${ICONS.glass}</div>
        <h1 class="auth-title">Estoque Vidigal</h1>
        <p class="auth-sub">Controle de estoque e distribuição</p>
        ${inner}
      </div>
    </div>`;
}

export function renderLogin(onEntrou) {
  const app = document.getElementById('app');
  app.innerHTML = shell(`
    <div id="login-erro"></div>
    <div class="field"><label class="field-label">E-mail</label><input id="lg-email" type="email" autocomplete="username"></div>
    <div class="field"><label class="field-label">Senha</label><input id="lg-senha" type="password" autocomplete="current-password"></div>
    <button class="btn btn-primary btn-block" id="btn-login">${ICONS.lock} Entrar</button>
    <p class="auth-note">
      <a href="#" id="link-esqueci">Esqueci minha senha</a>
    </p>
    <p class="auth-note">Login autenticado pelo Supabase — a senha nunca passa nem fica salva neste sistema, só no servidor de autenticação.</p>
  `);

  const tentarEntrar = async () => {
    const email = document.getElementById('lg-email').value.trim();
    const senha = document.getElementById('lg-senha').value;
    const erroEl = document.getElementById('login-erro');
    erroEl.innerHTML = '';
    if (!email || !senha) { erroEl.innerHTML = `<div class="auth-error">Preencha e-mail e senha.</div>`; return; }
    try {
      await entrar(email, senha);
      onEntrou();
    } catch (e) {
      erroEl.innerHTML = `<div class="auth-error">${e.message}</div>`;
    }
  };
  document.getElementById('btn-login').addEventListener('click', tentarEntrar);
  document.getElementById('lg-senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') tentarEntrar(); });
  document.getElementById('link-esqueci').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('lg-email').value.trim();
    if (!email) { showToast('Digite seu e-mail primeiro.'); return; }
    try {
      await solicitarRecuperacaoSenha(email);
      showToast('Enviamos um link de recuperação para o seu e-mail.');
    } catch (err) {
      showToast(err.message);
    }
  });
}
