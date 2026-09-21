import { LOW_STOCK_DEFAULT } from './config.js';

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function brl(v) { return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
export function todayISO() { return new Date().toISOString().slice(0, 10); }
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
export function fmtDateObj(d) { return d.toLocaleDateString('pt-BR'); }
export function slug(s) { return (s || '').toLowerCase(); }
export function classeBadgeClass(classe) { return 'badge-' + slug(classe).replace(/\s+/g, '-').replace('é', 'e'); }
export function stockPillClass(p) {
  const q = p.quantidade, min = p.estoqueMinimo || LOW_STOCK_DEFAULT;
  if (q <= 0) return 'stock-out';
  if (q < min) return 'stock-low';
  return 'stock-ok';
}
export function isLowStock(p) { return p.quantidade < (p.estoqueMinimo || LOW_STOCK_DEFAULT); }
export function diffBadge(d) {
  if (d === 0) return `<span class="diff-badge diff-zero">0</span>`;
  if (d > 0) return `<span class="diff-badge diff-pos">+${d}</span>`;
  return `<span class="diff-badge diff-neg">${d}</span>`;
}
export function proximaDataGeral() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
}
export function proximaSegunda() {
  const hoje = new Date();
  const d = new Date(hoje);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 1);
  return d;
}
