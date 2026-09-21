import { ICONS } from '../components/icons.js';
import { state, podeEditar } from '../state.js';
import { escapeHtml, fmtDate, classeBadgeClass, diffBadge, todayISO } from '../utils.js';
import { openSheet, closeSheet, showToast, confirmar } from '../components/modal.js';
import { registrarContagem, listarContagens, aplicarAjustesContagem } from '../services/contagens.js';
import * as produtosSvc from '../services/produtos.js';

let CONTAGENS_CACHE = [];

function ensureDraft() {
  if (!state.contagemDraft) {
    state.contagemDraft = { tipo: 'semanal', data: todayISO(), observacao: '', contados: {} };
  }
}

export async function viewContagens() {
  if (state.contagemDraft) return viewNovaContagem();
  CONTAGENS_CACHE = await listarContagens();
  const list = CONTAGENS_CACHE.length === 0
    ? `<div class="empty-state">${ICONS.clipboard}<p>Nenhuma contagem registrada ainda.</p></div>`
    : CONTAGENS_CACHE.map(c => {
      const divergencias = c.itens.filter(it => it.diferenca !== 0).length;
      const diffTotal = c.itens.reduce((s, it) => s + it.diferenca, 0);
      return `
      <details class="contagem-card">
        <summary>
          <div class="nota-head-l"><div class="num">${c.tipo === 'geral' ? 'Contagem geral' : 'Contagem semanal'}</div><div class="sub">${fmtDate(c.data)} · ${c.itens.length} produto(s)</div></div>
          <div class="nota-head-r"><div class="val">${divergencias} diverg.</div><div class="sub" style="font-size:11px;">${c.status === 'ajustada' ? 'Ajustes aplicados' : 'Conferida'}</div></div>
        </summary>
        <div class="nota-items">
          ${c.observacao ? `<p class="subtle" style="margin:0 0 8px;">${escapeHtml(c.observacao)}</p>` : ''}
          <div class="table-wrap" style="margin-bottom:8px;">
            <table class="rep-table"><tr><th>Produto</th><th>Sistema</th><th>Contado</th><th>Diferença</th></tr>
              ${c.itens.map(it => `<tr><td>${escapeHtml(it.produtoNome)}</td><td>${it.sistema}</td><td>${it.contado}</td><td>${diffBadge(it.diferenca)}</td></tr>`).join('')}
            </table>
          </div>
          <div class="contagem-summary"><span>Diferença total: <strong>${diffTotal > 0 ? '+' : ''}${diffTotal}</strong></span></div>
          <div class="nota-footer-actions">
            ${(podeEditar() && c.status !== 'ajustada' && divergencias > 0) ? `<button class="btn btn-primary btn-sm" data-action="aplicar-ajustes" data-id="${c.id}">${ICONS.sliders} Aplicar ajustes ao estoque</button>` : ''}
          </div>
        </div>
      </details>`;
    }).join('');

  return `
    <h2 class="section-title">Contagens de estoque</h2>
    <p class="subtle" style="margin:0 0 14px;">Cada contagem é um retrato do estoque — contagens antigas nunca são recalculadas.</p>
    <div class="row wrap" style="margin-bottom:16px;">
      ${podeEditar() ? `<button class="btn btn-primary" data-action="nova-contagem">${ICONS.plus} Nova contagem</button>` : ''}
      ${CONTAGENS_CACHE.length >= 2 ? `<button class="btn btn-ghost" data-action="comparar-contagens">${ICONS.compare} Comparar contagens</button>` : ''}
    </div>
    ${list}
  `;
}

function viewNovaContagem() {
  ensureDraft();
  const d = state.contagemDraft;
  let produtos = state.produtos.filter(p => p.status !== 'inativo');
  if (state.filtroContagemClasse !== 'todas') produtos = produtos.filter(p => p.classe === state.filtroContagemClasse);
  const classeChips = ['todas', ...state.classes.map(c => c.nome)].map(c =>
    `<button class="chip ${state.filtroContagemClasse === c ? 'active' : ''}" data-chip-cclasse="${escapeHtml(c)}">${c === 'todas' ? 'Todas' : escapeHtml(c)}</button>`).join('');

  const linhas = produtos.map(p => {
    const contadoStr = d.contados[p.id] !== undefined ? d.contados[p.id] : String(p.quantidade);
    const contado = contadoStr === '' ? null : parseInt(contadoStr);
    const diff = (contado === null || isNaN(contado)) ? null : contado - p.quantidade;
    return `
      <div class="count-row">
        <div class="count-info">
          <div class="p">${escapeHtml(p.nome)} <span class="badge ${classeBadgeClass(p.classe)}" style="margin:0;">${escapeHtml(p.classe)}</span></div>
          <div class="d">Sistema: ${p.quantidade}</div>
        </div>
        <input class="count-input" data-pid="${p.id}" type="number" inputmode="numeric" pattern="[0-9]*" value="${contadoStr}">
        ${diff === null ? '' : diffBadge(diff)}
      </div>`;
  }).join('');

  return `
    <h2 class="section-title">Nova contagem</h2>
    <div class="row">
      <div class="field grow"><label class="field-label">Tipo</label>
        <select id="cg-tipo"><option value="geral" ${d.tipo === 'geral' ? 'selected' : ''}>Contagem geral mensal</option><option value="semanal" ${d.tipo === 'semanal' ? 'selected' : ''}>Contagem semanal</option></select>
      </div>
      <div class="field grow"><label class="field-label">Data</label><input id="cg-data" type="date" value="${d.data}"></div>
    </div>
    <div class="field"><label class="field-label">Observação (opcional)</label><input id="cg-obs" value="${escapeHtml(d.observacao)}"></div>
    <label class="field-label" style="margin-top:6px;">Filtrar por classe</label>
    <div class="chip-row">${classeChips}</div>
    <div class="card" style="padding:4px 14px;margin-bottom:14px;">
      ${linhas || '<p class="subtle" style="padding:14px 0;">Nenhum produto ativo nessa classe.</p>'}
    </div>
    <div class="row wrap">
      <button class="btn btn-ghost" id="btn-cancelar-contagem">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-contagem">${ICONS.clipboard} Salvar contagem</button>
    </div>
  `;
}

export function bindContagens(reRender) {
  document.querySelectorAll('[data-action="nova-contagem"]').forEach(b => b.addEventListener('click', () => { state.contagemDraft = null; ensureDraft(); reRender(); }));
  document.querySelectorAll('[data-action="aplicar-ajustes"]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmar('Aplicar os ajustes desta contagem ao estoque atual? Isso corrige a quantidade de cada produto com diferença e registra no histórico.')) return;
    try {
      await aplicarAjustesContagem(b.dataset.id);
      state.produtos = await produtosSvc.listarProdutos();
      showToast('Ajustes aplicados ao estoque.');
      reRender();
    } catch (e) { showToast(e.message); }
  }));
  document.querySelectorAll('[data-action="comparar-contagens"]').forEach(b => b.addEventListener('click', () => abrirComparacao()));

  const tipo = document.getElementById('cg-tipo');
  if (tipo) {
    tipo.addEventListener('change', e => { state.contagemDraft.tipo = e.target.value; });
    document.getElementById('cg-data').addEventListener('input', e => { state.contagemDraft.data = e.target.value; });
    document.getElementById('cg-obs').addEventListener('input', e => { state.contagemDraft.observacao = e.target.value; });
    document.querySelectorAll('[data-chip-cclasse]').forEach(c => c.addEventListener('click', () => { state.filtroContagemClasse = c.dataset.chipCclasse; reRender(); }));
    document.querySelectorAll('.count-input').forEach(inp => inp.addEventListener('input', e => {
      state.contagemDraft.contados[e.target.dataset.pid] = e.target.value;
      reRender();
      const again = document.querySelector(`.count-input[data-pid="${e.target.dataset.pid}"]`);
      if (again) again.focus();
    }));
    document.getElementById('btn-cancelar-contagem').addEventListener('click', () => { state.contagemDraft = null; reRender(); });
    document.getElementById('btn-salvar-contagem').addEventListener('click', async () => {
      const d = state.contagemDraft;
      let produtos = state.produtos.filter(p => p.status !== 'inativo');
      if (state.filtroContagemClasse !== 'todas') produtos = produtos.filter(p => p.classe === state.filtroContagemClasse);
      if (produtos.length === 0) { showToast('Nenhum produto para contar.'); return; }
      const itens = produtos.map(p => {
        const contadoStr = d.contados[p.id] !== undefined ? d.contados[p.id] : String(p.quantidade);
        const contado = contadoStr === '' ? p.quantidade : (parseInt(contadoStr) || 0);
        return { produtoId: p.id, contado };
      });
      try {
        await registrarContagem({ tipo: d.tipo, data: d.data, observacao: d.observacao, itens });
        state.contagemDraft = null;
        showToast('Contagem salva.');
        reRender();
      } catch (e) { showToast(e.message); }
    });
  }
}

function abrirComparacao() {
  const opts = CONTAGENS_CACHE.map(c => `<option value="${c.id}">${fmtDate(c.data)} · ${c.tipo === 'geral' ? 'Geral' : 'Semanal'}</option>`).join('');
  openSheet('Comparar contagens', `
    <div class="row">
      <div class="field grow"><label class="field-label">Contagem anterior</label><select id="cmp-a">${opts}</select></div>
      <div class="field grow"><label class="field-label">Contagem atual</label><select id="cmp-b">${opts}</select></div>
    </div>
    <div id="cmp-resultado"></div>
  `, (root) => {
    const render = () => {
      const a = CONTAGENS_CACHE.find(c => c.id === root.querySelector('#cmp-a').value);
      const b = CONTAGENS_CACHE.find(c => c.id === root.querySelector('#cmp-b').value);
      if (!a || !b) { root.querySelector('#cmp-resultado').innerHTML = ''; return; }
      const mapaA = {}; a.itens.forEach(it => mapaA[it.produtoId] = it.contado);
      const idsUnicos = Array.from(new Set([...a.itens.map(i => i.produtoId), ...b.itens.map(i => i.produtoId)]));
      const linhas = idsUnicos.map(pid => {
        const nome = (b.itens.find(i => i.produtoId === pid) || a.itens.find(i => i.produtoId === pid) || {}).produtoNome || '—';
        const va = mapaA[pid] !== undefined ? mapaA[pid] : '—';
        const itB = b.itens.find(i => i.produtoId === pid);
        const vb = itB ? itB.contado : '—';
        const diff = (typeof va === 'number' && typeof vb === 'number') ? vb - va : null;
        return `<tr><td>${escapeHtml(nome)}</td><td>${va}</td><td>${vb}</td><td>${diff === null ? '—' : diffBadge(diff)}</td></tr>`;
      }).join('');
      root.querySelector('#cmp-resultado').innerHTML = `<div class="table-wrap" style="margin-top:8px;"><table class="rep-table"><tr><th>Produto</th><th>Anterior</th><th>Atual</th><th>Diferença</th></tr>${linhas}</table></div>`;
    };
    root.querySelector('#cmp-a').addEventListener('change', render);
    root.querySelector('#cmp-b').addEventListener('change', render);
    if (CONTAGENS_CACHE.length >= 2) { root.querySelector('#cmp-b').selectedIndex = 0; root.querySelector('#cmp-a').selectedIndex = 1; }
    render();
  });
}
