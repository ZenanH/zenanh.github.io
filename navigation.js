(() => {
  const header = document.querySelector('.masthead');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-navigation');
  const narrow = matchMedia('(max-width: 520px)');
  function close(restoreFocus = false) {
    header.removeAttribute('data-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    header.toggleAttribute('data-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) close(narrow.matches);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!header.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.hasAttribute('data-menu-open')) close(true);
  });
  header.addEventListener('focusout', (event) => {
    if (!header.contains(event.relatedTarget)) close();
  });
  narrow.addEventListener('change', () => close());
})();
