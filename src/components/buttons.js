// Helpers simples para manter o mesmo padrão de botão em todas as
// páginas. Nenhum destes usa width:100% nem flex:1 — largura sempre
// pelo conteúdo (ver styles/components.css, classe ".btn").

export function btnPrimary(label, attrs = '') {
  return `<button class="btn btn-primary" ${attrs}>${label}</button>`;
}
export function btnGhost(label, attrs = '') {
  return `<button class="btn btn-ghost" ${attrs}>${label}</button>`;
}
export function btnDanger(label, attrs = '') {
  return `<button class="btn btn-danger" ${attrs}>${label}</button>`;
}
export function iconBtn(icon, attrs = '', danger = false) {
  return `<button class="icon-btn${danger ? ' danger' : ''}" ${attrs}>${icon}</button>`;
}
export function chip(label, active, attrs = '') {
  return `<button class="chip${active ? ' active' : ''}" ${attrs}>${label}</button>`;
}
