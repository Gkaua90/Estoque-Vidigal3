import { ICONS } from '../components/icons.js';
import { state, somenteLeitura } from '../state.js';
import { escapeHtml, todayISO } from '../utils.js';
import { showToast } from '../components/modal.js';
import { registrarEntrada } from '../services/movimentacoes.js';
import * as produtosSvc from '../services/produtos.js';

function ensureDraft() {
  if (!state.entradaDraft) {
    state.entradaDraft = { referencia: '', fornecedor: '', observacao: '', data: todayISO(), itens: [{ produtoId: state.produtos[0]?.id || '', qtd: '' }] };
  }
}

export function viewEntrada() {
  if (somenteLeitura()) return `<h2 class="section-title">Entrada de estoque</h2><div class="empty-state">${ICONS.warn}<p>Seu perfil é apenas de visualização.</p></div>`;
  if (state.produtos.length === 0) return `<h2 class="section-title">Entrada de estoque</h2><div class="empty-state">${ICONS.bottle}<p>Cadastre produtos antes de lançar uma entrada.</p></div>`;
  ensureDraft();
  const d = state.entradaDraft;
  const itensHtml = d.itens.map((item, i) => {
    const produto = state.produtos.find(p => p.id === item.produtoId);
    const qtd = parseFloat(item.qtd) || 0;
    const produtoOpts = state.produtos.map(p => `<option value="${p.id}" ${p.id === item.produtoId ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('');
    return `
      <div class="item-row" data-idx="${i}">
        <select class="ent-sel-produto" data-idx="${i}">${produtoOpts}</select>
        <input class="ent-inp-qtd" data-idx="${i}" type="number" inputmode="numeric" min="0" step="1" placeholder="Qtd" value="${item.qtd}">
        <button class="icon-btn danger ent-rm-item" data-idx="${i}">${ICONS.x}</button>
        <div class="item-sub">${produto ? `Estoque atual: ${produto.quantidade} → novo: ${produto.quantidade + qtd}` : ''}</div>
      </div>`;
  }).join('');
  return `
    <h2 class="section-title">Entrada de estoque</h2>
    <p class="subtle" style="margin:0 0 14px;">Use quando receber mercadoria dos seus fornecedores.</p>
    <div class="row">
      <div class="field grow"><label class="field-label">Data</label><input id="ent-data" type="date" value="${d.data}"></div>
      <div class="field grow"><label class="field-label">Nota/Documento</label><input id="ent-ref" value="${escapeHtml(d.referencia)}" placeholder="Ex.: 6501"></div>
    </div>
    <div class="field"><label class="field-label">Fornecedor</label><input id="ent-fornecedor" value="${escapeHtml(d.fornecedor)}" placeholder="Nome do fornecedor"></div>
    <label class="field-label" style="margin-top:6px;">Itens recebidos</label>
    ${itensHtml}
    <button class="btn btn-ghost btn-sm" id="btn-add-item-ent" style="margin:4px 0 10px;">${ICONS.plus} Adicionar item</button>
    <div class="field"><label class="field-label">Observação</label><input id="ent-obs" value="${escapeHtml(d.observacao)}" placeholder="Opcional"></div>
    <button class="btn btn-primary" id="btn-registrar-entrada" style="margin-top:8px;">Confirmar entrada no estoque</button>
  `;
}

export function bindEntrada(reRender) {
  const dataEl = document.getElementById('ent-data');
  if (!dataEl) return;
  dataEl.addEventListener('input', e => { state.entradaDraft.data = e.target.value; });
  document.getElementById('ent-ref').addEventListener('input', e => { state.entradaDraft.referencia = e.target.value; });
  document.getElementById('ent-fornecedor').addEventListener('input', e => { state.entradaDraft.fornecedor = e.target.value; });
  document.getElementById('ent-obs').addEventListener('input', e => { state.entradaDraft.observacao = e.target.value; });
  document.querySelectorAll('.ent-sel-produto').forEach(sel => sel.addEventListener('change', e => {
    state.entradaDraft.itens[+e.target.dataset.idx].produtoId = e.target.value; reRender();
  }));
  document.querySelectorAll('.ent-inp-qtd').forEach(inp => inp.addEventListener('input', e => {
    state.entradaDraft.itens[+e.target.dataset.idx].qtd = e.target.value; reRender();
    const again = document.querySelector(`.ent-inp-qtd[data-idx="${e.target.dataset.idx}"]`);
    if (again) again.focus();
  }));
  document.querySelectorAll('.ent-rm-item').forEach(btn => btn.addEventListener('click', e => {
    const idx = +e.currentTarget.dataset.idx;
    state.entradaDraft.itens.splice(idx, 1);
    if (state.entradaDraft.itens.length === 0) state.entradaDraft.itens.push({ produtoId: state.produtos[0]?.id || '', qtd: '' });
    reRender();
  }));
  document.getElementById('btn-add-item-ent').addEventListener('click', () => {
    state.entradaDraft.itens.push({ produtoId: state.produtos[0]?.id || '', qtd: '' });
    reRender();
  });
  document.getElementById('btn-registrar-entrada').addEventListener('click', async () => {
    const d = state.entradaDraft;
    const itensValidos = d.itens.filter(it => it.produtoId && parseFloat(it.qtd) > 0).map(it => ({ produtoId: it.produtoId, quantidade: parseFloat(it.qtd) }));
    if (itensValidos.length === 0) { showToast('Adicione ao menos um item com quantidade.'); return; }
    try {
      await registrarEntrada({ data: d.data, referencia: d.referencia, fornecedor: d.fornecedor, observacao: d.observacao, itens: itensValidos });
      state.produtos = await produtosSvc.listarProdutos();
      state.entradaDraft = null;
      showToast('Entrada registrada — estoque atualizado.');
      reRender();
    } catch (e) { showToast(e.message); }
  });
}
