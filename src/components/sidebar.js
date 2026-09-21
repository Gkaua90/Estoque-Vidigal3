import { ICONS } from './icons.js';
import { state, isAdmin, perfilLabel } from '../state.js';

export const NAV_ITEMS_BASE = [
  { tab: 'dashboard', icon: ICONS.home, label: 'Início' },
  { tab: 'estoque', icon: ICONS.box, label: 'Estoque' },
  { tab: 'entrada', icon: ICONS.arrowdown, label: 'Entrada' },
  { tab: 'saida', icon: ICONS.send, label: 'Saída' },
  { tab: 'notas', icon: ICONS.list, label: 'Notas' },
  { tab: 'contagens', icon: ICONS.clipboard, label: 'Contagens' },
  { tab: 'historico', icon: ICONS.clock, label: 'Histórico' },
  { tab: 'relatorios', icon: ICONS.chart, label: 'Relatórios' },
  { tab: 'lojas', icon: ICONS.store, label: 'Lojas' },
];

export function navItems() {
  return NAV_ITEMS_BASE.concat(isAdmin() ? [{ tab: 'usuarios', icon: ICONS.users, label: 'Usuários' }] : []);
}

export function renderSidebar() {
  return `
    <aside class="sidebar">
      ${navItems().map(n => `<button data-tab="${n.tab}" class="${state.tab === n.tab ? 'active' : ''}">${n.icon}<span>${n.label}</span></button>`).join('')}
      <div class="side-sep"></div>
      <button data-action="backup">${ICONS.database}<span>Backup / importar</span></button>
      <button data-action="sair">${ICONS.logout}<span>Sair (${perfilLabel(state.perfil?.perfil)})</span></button>
    </aside>`;
}
