import { ICONS } from './icons.js';
import { state } from '../state.js';

export function renderHeader() {
  const primeiroNome = (state.perfil?.nome || '').split(' ')[0] || '—';
  return `
    <header class="topbar">
      <div class="brand-mark">${ICONS.glass}</div>
      <div class="brand-text">
        <h1>Estoque Vidigal</h1>
        <p>Controle de estoque e distribuição</p>
      </div>
      <div class="role-chip" id="role-chip">${ICONS.user} <span>${primeiroNome}</span></div>
    </header>`;
}
