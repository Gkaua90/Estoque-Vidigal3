import { ICONS } from '../components/icons.js';
import { state, somenteLeitura } from '../state.js';
import { escapeHtml, brl, todayISO } from '../utils.js';
import { showToast } from '../components/modal.js';
import { registrarSaida } from '../services/notas.js';
import * as produtosSvc from '../services/produtos.js';

function ensureDraft() {
  const lojasAtivas = state.lojas.filter(l => l.status !== 'inativo');
  if (!state.notaDraft) {
    state.notaDraft = { numero: '', data: todayISO(), lojaId: lojasAtivas[0]?.id || '', itens: [{ produtoId: state.produtos[0]?.id || '', qtd: '' }] };
  }
}

export function viewSaida() {
  if (somenteLeitura()) return `<h2 class="section-title">Nova nota</h2><div class="empty-state">${ICONS.warn}<p>Seu perfil é apenas de visualização.</p></div>`;
  const lojasAtivas = state.lojas.filter(l => l.status !== 'inativo');
  if (state.produtos.length === 0) return `<h2 class="section-title">Nova nota</h2><div class="empty-state">${ICONS.bottle}<p>Cadastre produtos antes de lançar uma saída.</p></div>`;
  if (lojasAtivas.length === 0) return `<h2 class="section-title">Nova nota</h2><div class="empty-state">${ICONS.store}<p>Cadastre uma loja ativa antes de lançar uma saída.</p></div>`;
  ensureDraft();
  const d = state.notaDraft;
  const lojaOpts = lojasAtivas.map(l => `<option value="${l.id}" ${l.id === d.lojaId ? 'selected' : ''}>${escapeHtml(l.nome)}</option>`).join('');

  let total = 0, temExcesso = false;
  const itensHtml = d.itens.map((item, i) => {
    const produto = state.produtos.find(p => p.id === item.produtoId);
    const qtd = parseFloat(item.qtd) || 0;
    const subtotal = produto ? qtd * produto.valorUnitario : 0;
    total += subtotal;
    const excede = produto && qtd > produto.quantidade;
    if (excede) temExcesso = true;
    const produtoOpts = state.produtos.filter(p => p.status !== 'inativo').map(p => `<option value="${p.id}" ${p.id === item.produtoId ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('');
    return `
      <div class="item-row" data-idx="${i}">
        <select class="sel-produto" data-idx="${i}">${produtoOpts}</select>
        <input class="inp-qtd" data-idx="${i}" type="number" inputmode="numeric" min="0" step="1" placeholder="Qtd" value="${item.qtd}">
        <button class="icon-btn danger btn-rm-item" data-idx="${i}">${ICONS.x}</button>
        <div class="item-sub">${produto ? `Estoque: ${produto.quantidade} · ${brl(produto.valorUnitario)}/un · Subtotal ${brl(subtotal)}` : ''}${excede ? ' <strong style="color:var(--danger);">· acima do estoque disponível</strong>' : ''}</div>
      </div>`;
  }).join('');

  return `
    <h2 class="section-title">Nova nota de saída</h2>
    <div class="field"><label class="field-label">Número da nota</label><input id="nota-numero" value="${escapeHtml(d.numero)}" placeholder="Ex.: 6505"></div>
    <div class="row">
      <div class="field grow"><label class="field-label">Data</label><input id="nota-data" type="date" value="${d.data}"></div>
      <div class="field grow"><label class="field-label">Loja</label><select id="nota-loja">${lojaOpts}</select></div>
    </div>
    <label class="field-label" style="margin-top:6px;">Itens</label>
    ${itensHtml}
    <button class="btn btn-ghost btn-sm" id="btn-add-item" style="margin:4px 0 6px;">${ICONS.plus} Adicionar item</button>
    ${temExcesso ? `<div class="alert-box">${ICONS.warn} Estoque insuficiente para um ou mais itens. Ajuste a quantidade — a nota não pode ser salva assim.</div>` : ''}
    <div class="total-strip"><span class="lbl">Total da nota</span><span class="val">${brl(total)}</span></div>
    <button class="btn btn-primary" id="btn-registrar-saida" ${temExcesso ? 'disabled' : ''} style="margin-top:14px;">Registrar saída e dar baixa</button>
  `;
}

export function bindSaida(reRender) {
  const numero = document.getElementById('nota-numero');
  if (!numero) return;
  numero.addEventListener('input', () => { state.notaDraft.numero = numero.value; });
  document.getElementById('nota-data').addEventListener('input', e => { state.notaDraft.data = e.target.value; });
  document.getElementById('nota-loja').addEventListener('change', e => { state.notaDraft.lojaId = e.target.value; });
  document.querySelectorAll('.sel-produto').forEach(sel => sel.addEventListener('change', e => {
    state.notaDraft.itens[+e.target.dataset.idx].produtoId = e.target.value; reRender();
  }));
  document.querySelectorAll('.inp-qtd').forEach(inp => inp.addEventListener('input', e => {
    state.notaDraft.itens[+e.target.dataset.idx].qtd = e.target.value; reRender();
    const again = document.querySelector(`.inp-qtd[data-idx="${e.target.dataset.idx}"]`);
    if (again) again.focus();
  }));
  document.querySelectorAll('.btn-rm-item').forEach(btn => btn.addEventListener('click', e => {
    const idx = +e.currentTarget.dataset.idx;
    state.notaDraft.itens.splice(idx, 1);
    if (state.notaDraft.itens.length === 0) state.notaDraft.itens.push({ produtoId: state.produtos[0]?.id || '', qtd: '' });
    reRender();
  }));
  document.getElementById('btn-add-item').addEventListener('click', () => {
    state.notaDraft.itens.push({ produtoId: state.produtos[0]?.id || '', qtd: '' });
    reRender();
  });
  const btnReg = document.getElementById('btn-registrar-saida');
  if (btnReg) btnReg.addEventListener('click', async () => {
    const d = state.notaDraft;
    if (!d.numero.trim()) { showToast('Informe o número da nota.'); return; }
    if (!d.lojaId) { showToast('Selecione a loja.'); return; }
    const itensValidos = d.itens.filter(it => it.produtoId && parseFloat(it.qtd) > 0).map(it => ({ produtoId: it.produtoId, quantidade: parseFloat(it.qtd) }));
    if (itensValidos.length === 0) { showToast('Adicione ao menos um item com quantidade.'); return; }
    try {
      const numero = d.numero.trim();
      await registrarSaida({ numero, data: d.data, lojaId: d.lojaId, itens: itensValidos });
      state.produtos = await produtosSvc.listarProdutos();
      state.notaDraft = null;
      showToast(`Nota ${numero} registrada — estoque atualizado.`);
      reRender();
    } catch (e) {
      // a validação de estoque insuficiente e de número duplicado
      // acontece DENTRO da função registrar_saida no banco — mesmo que
      // dois usuários tentem ao mesmo tempo, só um consegue.
      showToast(e.message);
    }
  });
}
