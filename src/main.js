import './config.js';
import { supabase } from './services/database.js';
import { sessaoAtual, aoMudarSessao, buscarMeuPerfil, sair } from './services/auth.js';
import { listarProdutos } from './services/produtos.js';
import { listarLojas } from './services/lojas.js';
import { listarClasses } from './services/classes.js';
import { renderLogin } from './pages/login.js';
import { renderHeader } from './components/header.js';
import { renderSidebar, navItems } from './components/sidebar.js';
import { renderBottomNav } from './components/bottomnav.js';
import { openSheet, closeSheet, showToast } from './components/modal.js';
import { openBackupSheet } from './pages/backup.js';
import { ICONS } from './components/icons.js';
import { state, perfilLabel } from './state.js';

import { viewDashboard } from './pages/dashboard.js';
import { viewEstoque, bindEstoque } from './pages/estoque.js';
import { viewEntrada, bindEntrada } from './pages/entrada.js';
import { viewSaida, bindSaida } from './pages/saida.js';
import { viewNotas, bindNotas } from './pages/notas.js';
import { viewContagens, bindContagens } from './pages/contagens.js';
import { viewHistorico, bindHistorico } from './pages/historico.js';
import { viewRelatorios, bindRelatorios } from './pages/relatorios.js';
import { viewLojas, bindLojas } from './pages/lojas.js';
import { viewUsuarios, bindUsuarios } from './pages/usuarios.js';

const PAGES = {
  dashboard: { view: viewDashboard, bind: null }, // dashboard.js já devolve seu próprio bind
  estoque: { view: viewEstoque, bind: bindEstoque },
  entrada: { view: viewEntrada, bind: bindEntrada },
  saida: { view: viewSaida, bind: bindSaida },
  notas: { view: viewNotas, bind: bindNotas },
  contagens: { view: viewContagens, bind: bindContagens },
  historico: { view: viewHistorico, bind: bindHistorico },
  relatorios: { view: viewRelatorios, bind: bindRelatorios },
  lojas: { view: viewLojas, bind: bindLojas },
  usuarios: { view: viewUsuarios, bind: bindUsuarios },
};

async function carregarDadosBase() {
  const [produtos, lojas, classes] = await Promise.all([listarProdutos(), listarLojas(), listarClasses()]);
  state.produtos = produtos; state.lojas = lojas; state.classes = classes;
}

async function iniciarApp() {
  try {
    await carregarDadosBase();
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="loading-screen">Não consegui carregar os dados: ${e.message}</div>`;
    return;
  }
  renderShell();
}

function renderShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderHeader()}
    <div class="layout-shell">
      ${renderSidebar()}
      <main id="content"></main>
    </div>
    ${renderBottomNav()}
  `;
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; renderShell(); }));
  document.getElementById('role-chip').addEventListener('click', abrirMenuConta);
  const backupBtn = document.querySelector('[data-action="backup"]');
  if (backupBtn) backupBtn.addEventListener('click', () => openBackupSheet(recarregarTudo));
  const sairBtn = document.querySelector('[data-action="sair"]');
  if (sairBtn) sairBtn.addEventListener('click', fazerLogout);
  const movBtn = document.querySelector('[data-action="abrir-mov"]');
  if (movBtn) movBtn.addEventListener('click', abrirMovimentarSheet);
  const maisBtn = document.querySelector('[data-action="abrir-mais"]');
  if (maisBtn) maisBtn.addEventListener('click', abrirMaisSheet);
  renderConteudo();
}

async function renderConteudo() {
  const el = document.getElementById('content');
  const pagina = PAGES[state.tab] || PAGES.dashboard;
  el.innerHTML = `<div class="loading-screen" style="height:200px;">Carregando…</div>`;
  try {
    if (state.tab === 'dashboard') {
      const { html, bind } = await viewDashboard();
      el.innerHTML = html;
      bind && bind();
      return;
    }
    const resultado = await pagina.view();
    el.innerHTML = typeof resultado === 'string' ? resultado : resultado.html;
    if (pagina.bind) pagina.bind(renderConteudo);
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${ICONS.warn}<p>Não foi possível carregar esta página: ${e.message}</p></div>`;
  }
}

async function recarregarTudo() {
  await carregarDadosBase();
  await renderConteudo();
}

function abrirMenuConta() {
  openSheet('Sua conta', `
    <p class="subtle" style="margin:-4px 0 14px;">Conectado como <strong>${state.perfil.nome}</strong> (${perfilLabel(state.perfil.perfil)}).</p>
    <div class="sheet-list">
      <button id="btn-sair">${ICONS.logout} Sair do sistema</button>
    </div>
  `, (root) => { root.querySelector('#btn-sair').addEventListener('click', fazerLogout); });
}

function abrirMovimentarSheet() {
  openSheet('Movimentar estoque', `
    <div class="sheet-list">
      <button data-go="entrada">${ICONS.arrowdown} Entrada de estoque</button>
      <button data-go="saida">${ICONS.send} Nova nota de saída</button>
    </div>
  `, (root) => {
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { closeSheet(); state.tab = b.dataset.go; renderShell(); }));
  });
}

function abrirMaisSheet() {
  const itens = [
    { go: 'notas', icon: ICONS.list, label: 'Notas emitidas' },
    { go: 'historico', icon: ICONS.clock, label: 'Histórico de movimentações' },
    { go: 'lojas', icon: ICONS.store, label: 'Lojas / clientes' },
  ];
  if (navItems().some(n => n.tab === 'usuarios')) itens.push({ go: 'usuarios', icon: ICONS.users, label: 'Usuários' });
  openSheet('Mais', `
    <div class="sheet-list">
      ${itens.map(i => `<button data-go="${i.go}">${i.icon} ${i.label}</button>`).join('')}
      <button data-action="backup2">${ICONS.database} Backup / importar</button>
      <button data-action="sair2">${ICONS.logout} Sair (${state.perfil.nome})</button>
    </div>
  `, (root) => {
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { closeSheet(); state.tab = b.dataset.go; renderShell(); }));
    root.querySelector('[data-action="backup2"]').addEventListener('click', () => { closeSheet(); openBackupSheet(recarregarTudo); });
    root.querySelector('[data-action="sair2"]').addEventListener('click', fazerLogout);
  });
}

async function fazerLogout() {
  closeSheet();
  await sair();
}

function mostrarCarregando(msg) {
  document.getElementById('app').innerHTML = `<div class="loading-screen">${msg}</div>`;
}

// ------------------------------------------------------------
// Bootstrap: observa o estado de autenticação do Supabase e decide
// se mostra login ou o app.
// ------------------------------------------------------------
let jaIniciado = false;

aoMudarSessao(async (session) => {
  if (!session) {
    jaIniciado = false;
    state.session = null; state.perfil = null;
    renderLogin(() => { /* onEntrou é tratado pelo próprio evento de sessão acima */ });
    return;
  }
  if (jaIniciado) return; // evita recarregar tudo a cada refresh de token
  jaIniciado = true;
  state.session = session;
  mostrarCarregando('Entrando…');
  try {
    state.perfil = await buscarMeuPerfil(session.user.id);
    if (state.perfil.status !== 'ativo') {
      await sair();
      mostrarCarregando('Sua conta está inativa. Fale com o administrador.');
      return;
    }
  } catch (e) {
    mostrarCarregando('Não foi possível carregar seu perfil: ' + e.message);
    return;
  }
  await iniciarApp();
});

(async () => {
  const session = await sessaoAtual();
  if (!session) renderLogin(() => {});
})();
