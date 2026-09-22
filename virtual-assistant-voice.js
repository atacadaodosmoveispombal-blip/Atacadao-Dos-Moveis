const DEFAULT_STATUS = '🎤 Falar';
const RETRY_STATUS = 'Não consegui entender. Toque no microfone e tente novamente.';
const PERMISSION_STATUS = 'Não foi possível acessar o microfone. Você pode continuar digitando normalmente.';

export function setupVoiceSearch({ input, button, status, submit, isOpen, Recognition, schedule = setTimeout, cancelSchedule = clearTimeout }) {
  if (typeof Recognition !== 'function') {
    button.hidden = true;
    status.hidden = true;
    return { stop() {} };
  }

  button.hidden = false;
  status.hidden = false;

  let recognition = null;
  let request = 0;
  let draft = '';
  let pendingSubmit = null;

  function show(state, message) {
    button.dataset.state = state;
    button.setAttribute('aria-label', state === 'listening' ? 'Parar reconhecimento de voz' : 'Pesquisar por voz');
    button.setAttribute('aria-pressed', state === 'listening' ? 'true' : 'false');
    status.dataset.state = state;
    status.textContent = message;
  }

  function clearPending() {
    if (pendingSubmit != null) cancelSchedule(pendingSubmit);
    pendingSubmit = null;
  }

  function stop({ restoreDraft = true } = {}) {
    clearPending();
    request += 1;
    const active = recognition;
    recognition = null;
    input.readOnly = false;
    if (active) {
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      try { active.abort(); } catch { /* O navegador já encerrou a captura. */ }
      if (restoreDraft) input.value = draft;
    }
    show('idle', DEFAULT_STATUS);
  }

  function fail(message) {
    const active = recognition;
    request += 1;
    recognition = null;
    input.readOnly = false;
    input.value = draft;
    if (active) {
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      try { active.abort(); } catch { /* O navegador já encerrou a captura. */ }
    }
    show('error', message);
  }

  button.addEventListener('click', () => {
    if (recognition) { stop(); return; }
    clearPending();
    draft = input.value;
    let active;
    try {
      active = new Recognition();
      active.lang = 'pt-BR';
      active.continuous = false;
      active.interimResults = false;
      active.maxAlternatives = 1;
    } catch {
      show('error', PERMISSION_STATUS);
      return;
    }

    const currentRequest = ++request;
    recognition = active;
    input.readOnly = true;
    input.blur();
    show('listening', '🔴 Ouvindo...');

    active.onresult = event => {
      if (request !== currentRequest) return;
      const transcript = Array.from(event.results || [], result => result[0]?.transcript || '').join(' ').trim().slice(0, input.maxLength > 0 ? input.maxLength : 160);
      if (!transcript) return;
      request += 1;
      recognition = null;
      input.readOnly = false;
      input.value = transcript;
      show('understood', '✓ Entendido');
      try { active.stop(); } catch { /* A captura já terminou. */ }
      pendingSubmit = schedule(() => {
        pendingSubmit = null;
        if (!isOpen()) return;
        submit(transcript);
        show('idle', DEFAULT_STATUS);
      }, 700);
    };
    active.onerror = event => {
      if (request !== currentRequest) return;
      const denied = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error);
      fail(denied ? PERMISSION_STATUS : RETRY_STATUS);
    };
    active.onend = () => {
      if (request === currentRequest) fail(RETRY_STATUS);
    };

    try { active.start(); }
    catch (error) {
      if (request === currentRequest) fail(['NotAllowedError', 'SecurityError'].includes(error?.name) ? PERMISSION_STATUS : RETRY_STATUS);
    }
  });

  show('idle', DEFAULT_STATUS);
  return { stop };
}
