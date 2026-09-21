export function openSheet(title, innerHtml, bind) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal-overlay" id="overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h3 class="modal-title">${title}</h3>
        ${innerHtml}
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);
  const overlay = document.getElementById('overlay');
  overlay.addEventListener('click', (e) => { if (e.target.id === 'overlay') closeSheet(); });
  if (bind) bind(overlay);
  return overlay;
}

export function closeSheet() {
  const ov = document.getElementById('overlay');
  if (ov) ov.remove();
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

export function confirmar(msg) {
  return window.confirm(msg);
}
