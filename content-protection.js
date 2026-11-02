// Prevent native copy interactions for mouse, keyboard, and touch input.
(() => {
  const prevent = (event) => event.preventDefault();
  for (const type of ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart']) {
    document.addEventListener(type, prevent, { capture: true });
  }
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x'].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  }, { capture: true });
})();
