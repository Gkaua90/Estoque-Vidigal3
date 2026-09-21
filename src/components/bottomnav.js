import { ICONS } from './icons.js';
import { state } from '../state.js';

export function renderBottomNav() {
  const maisAtivo = ['notas', 'historico', 'relatorios', 'lojas', 'usuarios'].includes(state.tab);
  return `
    <nav class="bottomnav">
      <button data-tab="dashboard" class="${state.tab === 'dashboard' ? 'active' : ''}">${ICONS.home}<span>Início</span></button>
      <button data-tab="estoque" class="${state.tab === 'estoque' ? 'active' : ''}">${ICONS.box}<span>Estoque</span></button>
      <button data-action="abrir-mov" class="${['entrada', 'saida'].includes(state.tab) ? 'active' : ''}">${ICONS.swap}<span>Movimentar</span></button>
      <button data-tab="contagens" class="${state.tab === 'contagens' ? 'active' : ''}">${ICONS.clipboard}<span>Contagens</span></button>
      <button data-action="abrir-mais" class="${maisAtivo ? 'active' : ''}">${ICONS.more}<span>Mais</span></button>
    </nav>`;
}
