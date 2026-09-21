import { ICONS } from '../components/icons.js';
import { state, isAdmin, perfilLabel } from '../state.js';
import { escapeHtml } from '../utils.js';
import { openSheet, closeSheet, showToast, confirmar } from '../components/modal.js';
import * as usuariosSvc from '../services/usuarios.js';

let USUARIOS_CACHE = [];

export async function viewUsuarios() {
  if (!isAdmin()) return `<h2 class="section-title">Usuários</h2><div class="empty-state">${ICONS.lock}<p>Apenas o administrador acessa esta área.</p></div>`;
  USUARIOS_CACHE = await usuariosSvc.listarUsuarios();
  const lista = `<div class="users-grid">${USUARIOS_CACHE.map(u => `
    <div class="card user-card">
      <div class="name">${escapeHtml(u.nome)} ${u.status === 'inativo' ? '<span class="badge badge-inativo">Inativo</span>' : ''}</div>
      <div><span class="badge badge-perfil">${perfilLabel(u.perfil)}</span></div>
      <div class="store-actions">
        <button class="icon-btn" data-action="edit-usuario" data-id="${u.id}">${ICONS.edit}</button>
      </div>
    </div>`).join('')}</div>`;
  return `
    <h2 class="section-title">Usuários</h2>
    <p class="subtle" style="margin:0 0 14px;">Somente o administrador cria e gerencia contas.</p>
    <div class="row wrap" style="margin-bottom:16px;">
      <button class="btn btn-primary" data-action="novo-usuario">${ICONS.plus} Novo usuário</button>
    </div>
    <div class="alert-box info">${ICONS.warn} Se o botão "Novo usuário" indicar que a criação automática não está disponível, crie o login em Supabase → Authentication → Users, e depois defina o nome/perfil dele aqui (veja o README).</div>
    ${lista}
  `;
}

export function bindUsuarios(reRender) {
  document.querySelectorAll('[data-action="novo-usuario"]').forEach(b => b.addEventListener('click', () => openNovoUsuarioModal(reRender)));
  document.querySelectorAll('[data-action="edit-usuario"]').forEach(b => b.addEventListener('click', () => openEditarUsuarioModal(USUARIOS_CACHE.find(x => x.id === b.dataset.id), reRender)));
}

function openNovoUsuarioModal(reRender) {
  openSheet('Novo usuário', `
    <div class="field"><label class="field-label">Nome</label><input id="nu-nome"></div>
    <div class="field"><label class="field-label">E-mail (login)</label><input id="nu-email" type="email"></div>
    <div class="field"><label class="field-label">Senha inicial</label><input id="nu-senha" type="password"></div>
    <div class="field"><label class="field-label">Perfil</label>
      <select id="nu-perfil">
        <option value="operador">Operador</option>
        <option value="visualizacao">Visualização</option>
        <option value="administrador">Administrador</option>
      </select>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-ghost grow" id="btn-cancel">Cancelar</button>
      <button class="btn btn-primary grow" id="btn-save">Criar</button>
    </div>
  `, (root) => {
    root.querySelector('#btn-cancel').addEventListener('click', closeSheet);
    root.querySelector('#btn-save').addEventListener('click', async () => {
      const nome = root.querySelector('#nu-nome').value.trim();
      const email = root.querySelector('#nu-email').value.trim();
      const senha = root.querySelector('#nu-senha').value;
      const perfil = root.querySelector('#nu-perfil').value;
      if (!nome || !email || senha.length < 6) { showToast('Preencha nome, e-mail e uma senha com 6+ caracteres.'); return; }
      try {
        await usuariosSvc.criarUsuarioCompleto({ nome, email, senha, perfil });
        closeSheet(); reRender();
        showToast('Usuário criado.');
      } catch (e) { showToast(e.message); }
    });
  });
}

function openEditarUsuarioModal(u, reRender) {
  openSheet('Editar usuário', `
    <div class="field"><label class="field-label">Nome</label><input id="eu-nome" value="${escapeHtml(u.nome)}"></div>
    <div class="row">
      <div class="field grow"><label class="field-label">Perfil</label>
        <select id="eu-perfil">
          <option value="administrador" ${u.perfil === 'administrador' ? 'selected' : ''}>Administrador</option>
          <option value="operador" ${u.perfil === 'operador' ? 'selected' : ''}>Operador</option>
          <option value="visualizacao" ${u.perfil === 'visualizacao' ? 'selected' : ''}>Visualização</option>
        </select>
      </div>
      <div class="field grow"><label class="field-label">Status</label>
        <select id="eu-status"><option value="ativo" ${u.status === 'ativo' ? 'selected' : ''}>Ativo</option><option value="inativo" ${u.status === 'inativo' ? 'selected' : ''}>Inativo</option></select>
      </div>
    </div>
    <p class="subtle">A troca de senha é feita pelo próprio usuário (link "Esqueci minha senha" na tela de login).</p>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-ghost grow" id="btn-cancel">Cancelar</button>
      <button class="btn btn-primary grow" id="btn-save">Salvar</button>
    </div>
  `, (root) => {
    root.querySelector('#btn-cancel').addEventListener('click', closeSheet);
    root.querySelector('#btn-save').addEventListener('click', async () => {
      const nome = root.querySelector('#eu-nome').value.trim();
      const perfil = root.querySelector('#eu-perfil').value;
      const status = root.querySelector('#eu-status').value;
      if (u.id === state.perfil.id && (perfil !== 'administrador' || status !== 'ativo')) {
        if (!confirmar('Você está removendo seu próprio acesso de administrador. Continuar?')) return;
      }
      try {
        await usuariosSvc.atualizarUsuario(u.id, { nome, perfil, status });
        closeSheet(); reRender();
        showToast('Usuário atualizado.');
      } catch (e) { showToast(e.message); }
    });
  });
}
