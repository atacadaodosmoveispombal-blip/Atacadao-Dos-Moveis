(() => {
  'use strict';

  const installButton = document.querySelector('#installApp');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  let installPrompt = null;

  document.documentElement.dataset.displayMode = standalone ? 'standalone' : 'browser';

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton && !standalone) installButton.hidden = false;
  });

  installButton?.addEventListener('click', async () => {
    if (!installPrompt) return;
    installButton.disabled = true;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
    installButton.disabled = false;
    if (choice.outcome === 'accepted') window.toast?.('Atacarejo instalado com sucesso.');
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    window.toast?.('Atacarejo adicionado à tela inicial.');
  });

  window.addEventListener('offline', () => {
    window.toast?.('Você está offline. Produtos e preços precisam de conexão para atualizar.');
  });

  if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
        .catch(error => console.warn('Não foi possível ativar o modo instalável.', error));
    }, { once: true });
  }
})();
