import { ICONS } from '../components/icons.js';
import { state, isAdmin } from '../state.js';
import { escapeHtml } from '../utils.js';
import { openSheet, closeSheet, showToast, confirmar } from '../components/modal.js';
import * as lojasSvc from '../services/lojas.js';

export function viewLojas() {
  const list = state.lojas.length === 0
    ? `<div class="empty-state">${ICONS.store}<p>Nenhuma loja cadastrada.</p></div>`
    : `<div class="stores-grid">${state.lojas.map(l => `
      <div class="card store-card">
        <div class="name">${escapeHtml(l.nome)} ${l.status === 'inativo' ? '<span class="badge badge-inativo">Inativa</span>' : ''}</div>
        <div class="line">${escapeHtml(l.razaoSocial || '')}</div>
        <div class="line">${escapeHtml(l.cnpj || '')}</div>
        <div class="line">${escapeHtml(l.endereco || '')}${l.estado ? (' · ' + escapeHtml(l.estado)) : ''}</div>
        ${l.banco ? `<div class="line">${escapeHtml(l.banco)} · Ag ${escapeHtml(l.agencia)} · Conta ${escapeHtml(l.conta)}</div>` : ''}
        <div class="store-actions">
          ${isAdmin() ? `<button class="icon-btn" data-action="edit-loja" data-id="${l.id}">${ICONS.edit}</button>` : ''}
          ${isAdmin() ? `<button class="icon-btn danger" data-action="del-loja" data-id="${l.id}">${ICONS.trash}</button>` : ''}
        </div>
      </div>`).join('')}</div>`;
  return `
    <h2 class="section-title">Lojas / clientes</h2>
    ${isAdmin() ? `<button class="btn btn-primary" data-action="nova-loja" style="margin-bottom:16px;">${ICONS.plus} Nova loja</button>` : ''}
    ${list}
  `;
}

export function bindLojas(reRender) {
  document.querySelectorAll('[data-action="nova-loja"]').forEach(b => b.addEventListener('click', () => openLojaModal(null, reRender)));
  document.querySelectorAll('[data-action="edit-loja"]').forEach(b => b.addEventListener('click', () => openLojaModal(state.lojas.find(x => x.id === b.dataset.id), reRender)));
  document.querySelectorAll('[data-action="del-loja"]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmar('Excluir esta loja? Se ela já tiver notas, será apenas desativada.')) return;
    try {
      const resultado = await lojasSvc.excluirOuDesativarLoja(b.dataset.id);
      state.lojas = await lojasSvc.listarLojas();
      reRender();
      showToast(resultado === 'desativado' ? 'Loja tinha notas — foi desativada.' : 'Loja excluída.');
    } catch (e) { showToast(e.message); }
  }));
}

function openLojaModal(loja, reRender) {
  const editando = !!loja;
  const l = loja || { id: '', nome: '', razaoSocial: '', cnpj: '', endereco: '', estado: 'Rio de Janeiro, RJ', banco: '', agencia: '', conta: '', status: 'ativo' };
  openSheet(editando ? 'Editar loja' : 'Nova loja', `
    <div class="field"><label class="field-label">Nome fantasia</label><input id="lf-nome" value="${escapeHtml(l.nome)}"></div>
    <div class="field"><label class="field-label">Razão social</label><input id="lf-razao" value="${escapeHtml(l.razaoSocial)}"></div>
    <div class="row">
      <div class="field grow"><label class="field-label">CNPJ</label><input id="lf-cnpj" value="${escapeHtml(l.cnpj)}"></div>
      <div class="field grow"><label class="field-label">Status</label><select id="lf-status"><option value="ativo" ${l.status === 'ativo' ? 'selected' : ''}>Ativa</option><option value="inativo" ${l.status === 'inativo' ? 'selected' : ''}>Inativa</option></select></div>
    </div>
    <div class="field"><label class="field-label">Endereço</label><input id="lf-endereco" value="${escapeHtml(l.endereco)}"></div>
    <div class="field"><label class="field-label">Cidade/Estado</label><input id="lf-estado" value="${escapeHtml(l.estado)}"></div>
    <div class="row">
      <div class="field grow"><label class="field-label">Banco</label><input id="lf-banco" value="${escapeHtml(l.banco)}"></div>
      <div class="field grow"><label class="field-label">Agência</label><input id="lf-agencia" value="${escapeHtml(l.agencia)}"></div>
      <div class="field grow"><label class="field-label">Conta</label><input id="lf-conta" value="${escapeHtml(l.conta)}"></div>
    </div>
    <div class="row" style="margin-top:6px;">
      ${editando ? `<button class="btn btn-danger" id="btn-del">${ICONS.trash} Excluir</button>` : ''}
      <button class="btn btn-ghost grow" id="btn-cancel">Cancelar</button>
      <button class="btn btn-primary grow" id="btn-save">Salvar</button>
    </div>
  `, (root) => {
    root.querySelector('#btn-cancel').addEventListener('click', closeSheet);
    if (editando) {
      root.querySelector('#btn-del').addEventListener('click', async () => {
        if (!confirmar('Excluir esta loja? Se já tiver notas, será apenas desativada.')) return;
        try {
          const resultado = await lojasSvc.excluirOuDesativarLoja(l.id);
          state.lojas = await lojasSvc.listarLojas();
          closeSheet(); reRender();
          showToast(resultado === 'desativado' ? 'Loja desativada (já tinha notas).' : 'Loja excluída.');
        } catch (e) { showToast(e.message); }
      });
    }
    root.querySelector('#btn-save').addEventListener('click', async () => {
      const nome = root.querySelector('#lf-nome').value.trim();
      if (!nome) { showToast('Dê um nome à loja.'); return; }
      const dados = {
        nome, razaoSocial: root.querySelector('#lf-razao').value.trim(), cnpj: root.querySelector('#lf-cnpj').value.trim(),
        endereco: root.querySelector('#lf-endereco').value.trim(), estado: root.querySelector('#lf-estado').value.trim(),
        banco: root.querySelector('#lf-banco').value.trim(), agencia: root.querySelector('#lf-agencia').value.trim(),
        conta: root.querySelector('#lf-conta').value.trim(), status: root.querySelector('#lf-status').value,
      };
      try {
        if (editando) await lojasSvc.atualizarLoja(l.id, dados); else await lojasSvc.criarLoja(dados);
        state.lojas = await lojasSvc.listarLojas();
        closeSheet(); reRender();
        showToast(editando ? 'Loja atualizada.' : 'Loja adicionada.');
      } catch (e) { showToast(e.message); }
    });
  });
}
