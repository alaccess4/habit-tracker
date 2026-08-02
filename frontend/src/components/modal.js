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
      <div class="modal sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h2>${escapeHtml(title)}</h2>
          <button class="icon-button" data-close="1" aria-label="Закрыть">${icon('close', { size: 18 })}</button>
        </div>
        <div class="modal__body">${bodyHtml}</div>
      </div>
    </div>
  `;
  root.classList.add('is-open');
  root.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target === el) closeModal();
    });
  });
  const inner = root.querySelector('.modal');
  if (inner) inner.addEventListener('click', (e) => e.stopPropagation());
  if (onMount) onMount(root);
  document.addEventListener('keydown', escListener);
}

function escListener(e) {
  if (e.key === 'Escape') closeModal();
}

export function closeModal() {
  const root = ensureRoot();
  root.classList.remove('is-open');
  root.innerHTML = '';
  document.removeEventListener('keydown', escListener);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
