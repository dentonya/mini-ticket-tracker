/** Mirrors the browser's :user-invalid state into aria-invalid for assistive technology. */
export function syncAriaInvalid(el: HTMLInputElement | HTMLTextAreaElement) {
  el.setAttribute('aria-invalid', String(el.matches(':user-invalid')));
}
