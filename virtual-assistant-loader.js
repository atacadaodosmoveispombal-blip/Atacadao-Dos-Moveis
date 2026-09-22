(function () {
  'use strict';
  const launcher = document.querySelector('#virtualAssistantLauncher');
  if (!launcher) return;

  function syncVisibility() {
    const data = window.StorefrontNavigation?.getAssistantData?.();
    launcher.hidden = data?.settings?.enabled === false;
  }

  syncVisibility();
  window.addEventListener('atacarejo:assistant-settings', syncVisibility);

  launcher.addEventListener('click', async function loadAssistant(event) {
    if (launcher.dataset.assistantMounted === 'true') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    launcher.classList.add('is-loading');
    launcher.setAttribute('aria-busy', 'true');
    try {
      if (!document.querySelector('link[data-virtual-assistant-style]')) {
        ['virtual-assistant.css?v=1', 'virtual-assistant-catalog.css?v=2'].forEach(href => {
          const style = document.createElement('link');
          style.rel = 'stylesheet'; style.href = href; style.dataset.virtualAssistantStyle = 'true';
          document.head.append(style);
        });
      }
      const module = await import('./virtual-assistant-catalog.js?v=2');
      module.mountVirtualAssistant({ launcher });
      launcher.click();
    } catch (error) {
      console.error('Não foi possível abrir o assistente de navegação.', error);
      launcher.querySelector('span').textContent = 'Tente novamente';
    } finally {
      launcher.classList.remove('is-loading');
      launcher.removeAttribute('aria-busy');
    }
  }, { once: true });
})();
