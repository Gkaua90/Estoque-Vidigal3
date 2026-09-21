import { ICONS } from '../components/icons.js';
import { state, isAdmin } from '../state.js';
import { escapeHtml, brl, fmtDate, classeBadgeClass } from '../utils.js';
import { showToast, confirmar } from '../components/modal.js';
import { listarNotas, cancelarNota } from '../services/notas.js';
import * as produtosSvc from '../services/produtos.js';

let NOTAS_CACHE = [];

export async function viewNotas() {
  const f = state.filtroNotas;
  NOTAS_CACHE = await listarNotas({ lojaId: f.loja, de: f.de, ate: f.ate, busca: f.busca });

  const lojaOpts = ['<option value="todas">Todas as lojas</option>'].concat(
    state.lojas.map(l => `<option value="${l.id}" ${f.loja === l.id ? 'selected' : ''}>${escapeHtml(l.nome)}</option>`)
  ).join('');

  const list = NOTAS_CACHE.length === 0
    ? `<div class="empty-state">${ICONS.list}<p>Nenhuma nota encontrada para esse filtro.</p></div>`
    : NOTAS_CACHE.map(n => `
      <details class="nota-card">
        <summary>
          <div class="nota-head-l">
            <div class="num">Nota ${escapeHtml(n.numero)} ${n.status === 'cancelada' ? '<span class="badge badge-inativo">Cancelada</span>' : ''}</div>
            <div class="sub">${fmtDate(n.data)} · ${escapeHtml(n.lojaNome)}</div>
          </div>
          <div class="nota-head-r"><div class="val">${brl(n.total)}</div><div class="sub" style="font-size:11px;">${n.itens.length} item(ns)</div></div>
        </summary>
        <div class="nota-items">
          ${n.itens.map(it => `<div class="nota-item-line"><span class="p">${it.quantidade}× ${escapeHtml(it.produtoNome)} <span class="badge ${classeBadgeClass(it.classe)}" style="margin:0;">${escapeHtml(it.classe || '')}</span></span><span>${brl(it.valorTotal)}</span></div>`).join('')}
          ${n.status === 'cancelada' ? `<p class="subtle" style="margin-top:8px;">Cancelada em ${fmtDate((n.canceladoEm || '').slice(0, 10))}${n.motivoCancelamento ? ' — ' + escapeHtml(n.motivoCancelamento) : ''}</p>` : ''}
          ${(isAdmin() && n.status !== 'cancelada') ? `<div class="nota-footer-actions"><button class="btn btn-danger btn-sm" data-action="cancelar-nota" data-id="${n.id}">${ICONS.ban} Cancelar nota</button></div>` : ''}
        </div>
      </details>`).join('');

  return `
    <h2 class="section-title">Notas emitidas</h2>
    <div class="card filter-card">
      <div class="row" style="margin-bottom:10px;">
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">De</label><input id="f-notas-de" type="date" value="${f.de}"></div>
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">Até</label><input id="f-notas-ate" type="date" value="${f.ate}"></div>
      </div>
      <div class="field" style="margin-bottom:10px;"><label class="field-label">Loja</label><select id="f-notas-loja">${lojaOpts}</select></div>
      <div class="searchbar" style="margin-bottom:0;">${ICONS.search}<input id="f-notas-busca" placeholder="Buscar por número..." value="${escapeHtml(f.busca)}"></div>
    </div>
    ${list}
    <p class="subtle" style="text-align:center;margin-top:8px;">Mostrando as notas mais recentes que combinam com o filtro.</p>
  `;
}

export function bindNotas(reRender) {
  const de = document.getElementById('f-notas-de');
  if (!de) return;
  de.addEventListener('change', e => { state.filtroNotas.de = e.target.value; reRender(); });
  document.getElementById('f-notas-ate').addEventListener('change', e => { state.filtroNotas.ate = e.target.value; reRender(); });
  document.getElementById('f-notas-loja').addEventListener('change', e => { state.filtroNotas.loja = e.target.value; reRender(); });
  document.getElementById('f-notas-busca').addEventListener('input', e => { state.filtroNotas.busca = e.target.value; reRender(); });
  document.querySelectorAll('[data-action="cancelar-nota"]').forEach(b => b.addEventListener('click', async (e) => {
    e.preventDefault();
    const motivo = window.prompt('Motivo do cancelamento (os itens voltam ao estoque automaticamente):', '');
    if (motivo === null) return;
    if (!confirmar('Confirmar cancelamento desta nota?')) return;
    try {
      await cancelarNota(b.dataset.id, motivo);
      state.produtos = await produtosSvc.listarProdutos();
      showToast('Nota cancelada e itens devolvidos ao estoque.');
      reRender();
    } catch (err) { showToast(err.message); }
  }));
}
