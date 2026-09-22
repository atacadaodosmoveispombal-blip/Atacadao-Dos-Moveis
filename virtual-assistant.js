const DEFAULT_WELCOME = 'Olá! 👋 Posso ajudar você a encontrar o que procura. Digite, por exemplo: sofá, quarto, cozinha, ofertas ou armários.';

const STOP_WORDS = new Set([
  'a', 'algum', 'alguma', 'algumas', 'alguns', 'coisa', 'de', 'do', 'da', 'dos', 'das',
  'e', 'em', 'eu', 'me', 'meu', 'minha', 'o', 'os', 'para', 'por', 'preciso', 'quero',
  'ver', 'mostra', 'mostrar', 'mostre', 'tem', 'uma', 'um'
]);

const SPECIAL_INTENTS = [
  { type: 'whatsapp', phrases: ['whatsapp', 'atendente', 'falar com alguem', 'falar com a loja', 'preciso de ajuda', 'ajuda humana'] },
  { type: 'cart', phrases: ['sacola', 'carrinho', 'minhas compras', 'meu carrinho', 'ver carrinho'] },
  { type: 'offers', phrases: ['oferta', 'ofertas', 'promocao', 'promocoes', 'desconto', 'descontos'] }
];

const TARGET_ALIASES = [
  { phrases: ['guarda roupa', 'guarda roupas', 'roupeiro', 'roupeiros'], targets: ['roupeiro'] },
  { phrases: ['armario de cozinha', 'armarios de cozinha'], targets: ['armario de parede', 'armario'] },
  { phrases: ['cadeira escritorio', 'cadeira de escritorio'], targets: ['cadeira giratoria', 'cadeira'] },
  { phrases: ['tv', 'televisao', 'televisor'], targets: ['televisores', 'televisor'] }
];

export function normaliseAssistantText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularise(token) {
  if (token.length <= 3) return token;
  if (token.endsWith('oes') || token.endsWith('aes')) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('is') && token.length > 4) return `${token.slice(0, -2)}l`;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokenSet(value) {
  const tokens = normaliseAssistantText(value).split(' ').filter(Boolean);
  return new Set(tokens.flatMap(token => [token, singularise(token)]).filter(token => !STOP_WORDS.has(token)));
}

function hasPhrase(text, phrase) {
  return ` ${text} `.includes(` ${normaliseAssistantText(phrase)} `);
}

function subcategoryName(item) {
  return typeof item === 'string' ? item : item?.name || '';
}

function navigationCandidates(environments = []) {
  return environments.flatMap(environment => {
    const environmentCandidate = {
      type: 'environment', label: environment.name, environment: environment.name,
      source: [environment.name, environment.slug, environment.description].filter(Boolean).join(' ')
    };
    const subcategories = (environment.subcategories || []).map(item => ({
      type: 'subcategory', label: subcategoryName(item), environment: environment.name,
      source: [subcategoryName(item), item?.slug, item?.keywords].filter(Boolean).join(' ')
    }));
    return [environmentCandidate, ...subcategories];
  }).filter(candidate => candidate.label);
}

function aliasCandidate(query, candidates) {
  const rule = TARGET_ALIASES.find(item => item.phrases.some(phrase => hasPhrase(query, phrase)));
  if (!rule) return null;
  return candidates.find(candidate => {
    const name = normaliseAssistantText(candidate.label);
    return rule.targets.some(target => name.includes(normaliseAssistantText(target)));
  }) || null;
}

function scoreCandidate(query, candidate) {
  const label = normaliseAssistantText(candidate.label);
  const queryTokens = tokenSet(query);
  const candidateTokens = tokenSet(candidate.source);
  let score = 0;
  if (query === label) score += 150;
  if (hasPhrase(query, label)) score += 90 + Math.min(label.length, 30);
  for (const token of queryTokens) if (candidateTokens.has(token)) score += token.length >= 5 ? 24 : 16;
  if (candidate.type === 'subcategory' && score > 0) score += 4;
  return score;
}

export function matchAssistantIntent(message, environments = []) {
  const query = normaliseAssistantText(message);
  if (!query) return { type: 'fallback' };
  const special = SPECIAL_INTENTS.find(intent => intent.phrases.some(phrase => hasPhrase(query, phrase)));
  if (special) return { type: special.type };
  const candidates = navigationCandidates(environments);
  const alias = aliasCandidate(query, candidates);
  if (alias) return alias;
  const ranked = candidates
    .map(candidate => ({ ...candidate, score: scoreCandidate(query, candidate) }))
    .filter(candidate => candidate.score >= 20)
    .sort((a, b) => b.score - a.score || (a.type === 'subcategory' ? -1 : 1));
  if (!ranked.length) return { type: 'fallback' };
  const { score: _score, source: _source, ...result } = ranked[0];
  return result;
}

export function assistantReply(intent) {
  if (intent.type === 'whatsapp') return { text: 'Claro! Você pode falar diretamente com nossa equipe.', action: 'FALAR PELO WHATSAPP' };
  if (intent.type === 'cart') return { text: 'Claro! Vou abrir sua sacola.', action: 'VER MINHA SACOLA' };
  if (intent.type === 'offers') return { text: 'Confira as ofertas disponíveis agora.', action: 'VER OFERTAS' };
  if (intent.type === 'environment') return { text: `Temos uma seção inteira para ${intent.label}.`, action: `VER ${intent.label.toLocaleUpperCase('pt-BR')}` };
  if (intent.type === 'subcategory') return { text: `Claro! Encontrei ${intent.label} para você.`, action: `VER ${intent.label.toLocaleUpperCase('pt-BR')}` };
  return { text: 'Não encontrei exatamente isso. Posso ajudar você por uma destas seções:' };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function icon(name) {
  const paths = {
    chat: '<path d="M5 5h14v10H9l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    send: '<path d="m4 4 17 8-17 8 3-8-3-8Z"/><path d="M7 12h14"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
}

function availableEnvironment(data, name) {
  const wanted = normaliseAssistantText(name);
  return data.environments.find(item => normaliseAssistantText(item.name) === wanted);
}

function fallbackShortcuts(data) {
  return ['Sala', 'Quarto', 'Cozinha'].map(name => availableEnvironment(data, name)).filter(Boolean)
    .map(environment => ({ label: environment.name, intent: { type: 'environment', label: environment.name, environment: environment.name } }))
    .concat([{ label: 'Ofertas', intent: { type: 'offers' } }]);
}

function configuredShortcuts(data) {
  const flags = data.settings?.shortcuts || {};
  const shortcuts = [['Sala', '🛋️'], ['Quarto', '🛏️'], ['Cozinha', '🍳'], ['Eletros', '⚡']].flatMap(([name, emoji]) => {
    if (flags[normaliseAssistantText(name)] === false) return [];
    const environment = availableEnvironment(data, name);
    return environment ? [{ label: environment.name, emoji, intent: { type: 'environment', label: environment.name, environment: environment.name } }] : [];
  });
  if (flags.ofertas !== false) shortcuts.push({ label: 'Ofertas', emoji: '🔥', intent: { type: 'offers' } });
  shortcuts.push({ label: 'Sacola', emoji: '🛍️', intent: { type: 'cart' } });
  return shortcuts;
}

export function mountVirtualAssistant({ launcher, api = window.StorefrontNavigation } = {}) {
  if (!launcher || !api) throw new Error('A navegação da loja ainda não está disponível.');
  if (launcher.dataset.assistantMounted === 'true') return;
  launcher.dataset.assistantMounted = 'true';
  const root = document.createElement('div');
  root.className = 'virtual-assistant';
  launcher.before(root);
  root.append(launcher);
  launcher.classList.add('virtual-assistant-launcher');
  const panel = document.createElement('section');
  panel.id = 'virtualAssistantPanel';
  panel.className = 'virtual-assistant-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'virtualAssistantTitle');
  panel.hidden = true;
  panel.innerHTML = `<header class="virtual-assistant-header"><span class="virtual-assistant-avatar">${icon('chat')}</span><div><strong id="virtualAssistantTitle">ASSISTENTE ATACAREJO</strong><small><i></i> Navegação rápida</small></div><button type="button" data-assistant-close aria-label="Fechar assistente">${icon('close')}</button></header><div class="virtual-assistant-log" data-assistant-log role="log" aria-live="polite" aria-relevant="additions"></div><form class="virtual-assistant-form" data-assistant-form><label class="sr-only" for="virtualAssistantInput">Digite o que está procurando</label><input id="virtualAssistantInput" name="message" autocomplete="off" enterkeyhint="send" maxlength="160" placeholder="Digite o que está procurando..." required><button type="submit" aria-label="Enviar mensagem">${icon('send')}</button></form>`;
  root.append(panel);
  const log = panel.querySelector('[data-assistant-log]');
  const form = panel.querySelector('[data-assistant-form]');
  const input = form.elements.message;
  const closeButton = panel.querySelector('[data-assistant-close]');
  let started = false;
  const currentData = () => api.getAssistantData();

  function addUserMessage(text) {
    const article = document.createElement('article');
    article.className = 'virtual-assistant-message is-user';
    article.textContent = text;
    log.append(article);
  }

  function close() {
    panel.hidden = true;
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus({ preventScroll: true });
  }

  function runIntent(intent) {
    close();
    if (intent.type === 'subcategory') api.openSubcategory(intent.environment, intent.label);
    else if (intent.type === 'environment') api.openEnvironment(intent.environment || intent.label);
    else if (intent.type === 'offers') api.openOffers();
    else if (intent.type === 'cart') api.openCart();
    else if (intent.type === 'whatsapp') api.openWhatsApp();
  }

  function actionButton(intent, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'virtual-assistant-action';
    button.innerHTML = `<span>${escapeHtml(label)}</span><b aria-hidden="true">→</b>`;
    button.addEventListener('click', () => runIntent(intent));
    return button;
  }

  function addAssistantMessage(intent, includeFallback = false) {
    const reply = assistantReply(intent);
    const article = document.createElement('article');
    article.className = 'virtual-assistant-message is-assistant';
    const bubble = document.createElement('div');
    bubble.textContent = reply.text;
    article.append(bubble);
    if (reply.action) article.append(actionButton(intent, reply.action));
    if (includeFallback) {
      const options = document.createElement('div');
      options.className = 'virtual-assistant-fallback';
      fallbackShortcuts(currentData()).forEach(item => options.append(actionButton(item.intent, item.label.toLocaleUpperCase('pt-BR'))));
      const data = currentData();
      if (data.settings?.showWhatsapp !== false && data.whatsappConfigured) options.append(actionButton({ type: 'whatsapp' }, 'FALAR COM A LOJA'));
      article.append(options);
    }
    log.append(article);
    log.scrollTop = log.scrollHeight;
  }

  function addWelcome() {
    const data = currentData();
    const article = document.createElement('article');
    article.className = 'virtual-assistant-message is-assistant is-welcome';
    const bubble = document.createElement('div');
    bubble.textContent = data.settings?.welcome || DEFAULT_WELCOME;
    article.append(bubble);
    const shortcuts = document.createElement('div');
    shortcuts.className = 'virtual-assistant-shortcuts';
    configuredShortcuts(data).forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = `<span aria-hidden="true">${item.emoji}</span>${escapeHtml(item.label)}`;
      button.addEventListener('click', () => { addUserMessage(item.label); addAssistantMessage(item.intent); });
      shortcuts.append(button);
    });
    article.append(shortcuts);
    log.append(article);
  }

  function open() {
    if (!started) { addWelcome(); started = true; }
    panel.hidden = false;
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  launcher.addEventListener('click', () => panel.hidden ? open() : close());
  closeButton.addEventListener('click', close);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addUserMessage(message);
    const intent = matchAssistantIntent(message, currentData().environments);
    addAssistantMessage(intent, intent.type === 'fallback');
    form.reset();
    input.focus();
  });
}
