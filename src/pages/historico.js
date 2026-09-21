import { ICONS } from '../components/icons.js';
import { state } from '../state.js';
import { escapeHtml, fmtDate, classeBadgeClass } from '../utils.js';
import { listarMovimentos } from '../services/movimentacoes.js';

export async function viewHistorico() {
  const f = state.filtroHist;
  const movs = await listarMovimentos({ tipo: f.tipo, de: f.de, ate: f.ate, busca: f.busca });

  const chips = [['todos', 'Todos'], ['ENTRADA', 'Entradas'], ['SAIDA', 'Saídas'], ['AJUSTE', 'Ajustes']]
    .map(([v, l]) => `<button class="chip ${f.tipo === v ? 'active' : ''}" data-chip-tipo="${v}">${l}</button>`).join('');

  const list = movs.length === 0
    ? `<div class="empty-state">${ICONS.clock}<p>Nenhuma movimentação encontrada.</p></div>`
    : `<div class="card" style="padding:4px 14px;">${movs.map(m => `
      <div class="mov-row">
        <span class="mov-type ${m.tipo}">${m.tipo}</span>
        <div class="mov-body">
          <div class="p">${escapeHtml(m.produtoNome)} <span class="badge ${classeBadgeClass(m.classe)}" style="margin:0;">${escapeHtml(m.classe || '')}</span></div>
          <div class="d">${fmtDate(m.data)} · ${escapeHtml(m.referencia || '')}${m.descricao ? (' · ' + escapeHtml(m.descricao)) : ''} · ${escapeHtml(m.usuario || '')}</div>
        </div>
        <div class="mov-qty ${m.quantidade >= 0 ? 'pos' : 'neg'}">${m.quantidade >= 0 ? '+' : ''}${m.quantidade}</div>
      </div>`).join('')}</div>`;

  return `
    <h2 class="section-title">Histórico de movimentações</h2>
    <div class="card filter-card">
      <div class="chip-row" style="margin-bottom:10px;">${chips}</div>
      <div class="row" style="margin-bottom:10px;">
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">De</label><input id="h-de" type="date" value="${f.de}"></div>
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">Até</label><input id="h-ate" type="date" value="${f.ate}"></div>
      </div>
      <div class="searchbar" style="margin-bottom:0;">${ICONS.search}<input id="h-busca" placeholder="Buscar por produto ou referência..." value="${escapeHtml(f.busca)}"></div>
    </div>
    ${list}
    <p class="subtle" style="text-align:center;margin-top:8px;">Mostrando as 100 movimentações mais recentes que combinam com o filtro.</p>
  `;
}

export function bindHistorico(reRender) {
  document.querySelectorAll('[data-chip-tipo]').forEach(c => c.addEventListener('click', () => { state.filtroHist.tipo = c.dataset.chipTipo; reRender(); }));
  const de = document.getElementById('h-de');
  if (de) {
    de.addEventListener('change', e => { state.filtroHist.de = e.target.value; reRender(); });
    document.getElementById('h-ate').addEventListener('change', e => { state.filtroHist.ate = e.target.value; reRender(); });
    document.getElementById('h-busca').addEventListener('input', e => { state.filtroHist.busca = e.target.value; reRender(); });
  }
}
