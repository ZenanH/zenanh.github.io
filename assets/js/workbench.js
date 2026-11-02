(() => {
  const form = document.querySelector('#workbench-access-form');
  const password = document.querySelector('#workbench-password');
  const status = document.querySelector('#workbench-access-status');
  const submit = form.querySelector('button[type="submit"]');
  const gate = document.querySelector('#workbench-access');
  const content = document.querySelector('#workbench-content');
  const main = document.querySelector('#workbench-main');

  function decodeBase64(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    delete status.dataset.state;
    form.classList.remove('is-invalid');

    if (!password.value) {
      status.textContent = 'Enter the password to continue.';
      status.dataset.state = 'error';
      password.focus();
      return;
    }

    submit.disabled = true;
    submit.querySelector('span').textContent = 'Checking';
    form.setAttribute('aria-busy', 'true');

    try {
      if (!globalThis.crypto?.subtle) throw new Error('crypto-unavailable');

      const response = await fetch('assets/data/workbench-vault.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('vault-unavailable');
      const vault = await response.json();
      if (vault.version !== 1 || vault.kdf !== 'PBKDF2-SHA-256' || vault.cipher !== 'AES-256-GCM') {
        throw new Error('vault-invalid');
      }

      const material = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password.value),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: decodeBase64(vault.salt),
          iterations: vault.iterations,
          hash: 'SHA-256',
        },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );

      let plaintext;
      try {
        plaintext = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: decodeBase64(vault.iv) },
          key,
          decodeBase64(vault.ciphertext),
        );
      } catch {
        throw new Error('incorrect-password');
      }

      content.innerHTML = new TextDecoder().decode(plaintext);
      content.hidden = false;
      content.classList.add('workbench-content-ready');
      gate.hidden = true;
      main.classList.remove('is-locked');
      const heading = content.querySelector('h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      } else {
        content.focus({ preventScroll: true });
      }
    } catch (error) {
      status.textContent = error.message === 'incorrect-password'
        ? 'That password did not match. Try again.'
        : 'The protected content could not be loaded. Please try again later.';
      status.dataset.state = 'error';
      form.classList.remove('is-invalid');
      void form.offsetWidth;
      form.classList.add('is-invalid');
      password.value = '';
      password.focus();
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Unlock';
      form.removeAttribute('aria-busy');
    }
  });
})();
