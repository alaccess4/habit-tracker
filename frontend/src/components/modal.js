import { icon } from '../icons.js';

let rootEl = null;

function ensureRoot() {
  if (!rootEl) {
    rootEl = document.getElementById('modal-root');
  }
  return rootEl;
}

export function openModal({ title = '', bodyHtml = '', onMount = null }) {
  const root = ensureRoot();
  root.innerHTML = `
    <div class="modal-scrim" data-close="1">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="sheet__handle"></div>
        <div class="sheet__header">
          <h2>${escapeHtml(title)}</h2>
          <button class="sheet__close" data-close="1" aria-label="Закрыть">${icon('close', { size: 18 })}</button>
        </div>
        <div class="sheet__body">${bodyHtml}</div>
      </div>
    </div>
  `;
  const scrim = root.querySelector('.modal-scrim');
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) closeModal();
  });
  root.querySelector('.sheet__close').addEventListener('click', closeModal);
  root.querySelector('.sheet').addEventListener('click', (e) => e.stopPropagation());
  if (onMount) onMount(root);
  document.addEventListener('keydown', escListener);
}

function escListener(e) {
  if (e.key === 'Escape') closeModal();
}

export function closeModal() {
  const root = ensureRoot();
  root.innerHTML = '';
  document.removeEventListener('keydown', escListener);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
