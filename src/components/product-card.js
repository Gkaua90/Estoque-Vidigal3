import { ICONS } from './icons.js';
import { podeEditar, isAdmin } from '../state.js';
import { escapeHtml, brl, classeBadgeClass, stockPillClass } from '../utils.js';

export function renderProductCard(p) {
  return `
    <div class="card product-card">
      ${p.imagemUrl ? `<img class="product-thumb" src="${p.imagemUrl}" loading="lazy">` : `<div class="product-thumb placeholder">${ICONS.bottle}</div>`}
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.nome)}</div>
        <div class="product-code">${escapeHtml(p.codigo || '')}</div>
        <div>
          <span class="badge ${classeBadgeClass(p.classe)}">${escapeHtml(p.classe)}</span>
          ${p.status === 'inativo' ? `<span class="badge badge-inativo">Inativo</span>` : ''}
        </div>
        <div class="product-meta">
          <span>${brl(p.valorUnitario)}/un</span>
          <span>Total: ${brl(p.quantidade * p.valorUnitario)}</span>
        </div>
      </div>
      <div class="product-actions">
        <span class="stock-pill ${stockPillClass(p)}">${p.quantidade}</span>
        <div class="row" style="gap:6px;">
          ${podeEditar() ? `<button class="icon-btn" data-action="ajustar-produto" data-id="${p.id}" title="Ajustar estoque">${ICONS.sliders}</button>` : ''}
          ${podeEditar() ? `<button class="icon-btn" data-action="edit-produto" data-id="${p.id}">${ICONS.edit}</button>` : ''}
          ${isAdmin() ? `<button class="icon-btn danger" data-action="del-produto" data-id="${p.id}">${ICONS.trash}</button>` : ''}
        </div>
      </div>
    </div>`;
}
