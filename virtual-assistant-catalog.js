import { setupVoiceSearch } from './virtual-assistant-voice.js';

const DEFAULT_WELCOME = 'Olá! 👋 Eu conheço nosso catálogo e posso procurar produtos, preços e benefícios para você.';

const STOP_WORDS = new Set([
  'a', 'ao', 'algum', 'alguma', 'algumas', 'alguns', 'as', 'com', 'da', 'das', 'de', 'do', 'dos',
  'e', 'em', 'eu', 'me', 'meu', 'minha', 'o', 'os', 'para', 'por', 'preciso', 'procuro', 'procurando',
  'quero', 'queria', 'tem', 'ter', 'um', 'uma', 'ver', 'mostra', 'mostrar', 'mostre', 'favor', 'to', 'ta'
]);

const FILTER_WORDS = new Set([
  'ate', 'abaixo', 'menos', 'barato', 'baratos', 'barata', 'baratas', 'caro', 'caros', 'cara', 'caras',
  'preco', 'precos', 'promocao', 'promocoes', 'oferta', 'ofertas', 'frete', 'gratis', 'armacao',
  'disponivel', 'disponiveis', 'agora', 'reais', 'real', 'r', 'mil'
]);

const SPECIAL_INTENTS = [
  { type: 'whatsapp', phrases: ['whatsapp', 'atendente', 'falar com alguem', 'falar com a loja', 'ajuda humana'] },
  { type: 'cart', phrases: ['sacola', 'carrinho', 'minhas compras', 'meu carrinho', 'ver carrinho'] },
  { type: 'home', phrases: ['voltar para inicio', 'ir para inicio', 'pagina inicial', 'home'] },
  { type: 'payment', phrases: ['formas de pagamento', 'forma de pagamento', 'como posso pagar', 'parcelamento da loja'] },
  { type: 'location', phrases: ['onde fica a loja', 'endereco da loja', 'localizacao da loja'] },
  { type: 'hours', phrases: ['horario da loja', 'horario de funcionamento', 'que horas abre'] },
  { type: 'offers', phrases: ['oferta', 'ofertas', 'promocao', 'promocoes', 'desconto', 'descontos'] }
];

const TYPE_GROUPS = [
  { key: 'mesa-computador', label: 'mesa de computador', aliases: ['mesa de computador', 'mesa para computador', 'mesa office', 'escrivaninha'] },
  { key: 'mesa-jantar', label: 'mesa de jantar', aliases: ['mesa de jantar', 'conjunto de jantar'] },
  { key: 'mesa-cabeceira', label: 'criado ou mesa de cabeceira', aliases: ['mesa de cabeceira', 'criado mudo', 'criado'] },
  { key: 'mesa-centro', label: 'mesa de centro', aliases: ['mesa de centro', 'centro'] },
  { key: 'mesa-plastica', label: 'mesa plástica', aliases: ['mesa plastica'] },
  { key: 'guarda-roupa', label: 'roupeiro', aliases: ['guarda roupa', 'guarda roupas', 'roupeiro', 'roupeiros'] },
  { key: 'armario', label: 'armário', aliases: ['armario de cozinha', 'armario de parede', 'armario aereo', 'armario', 'armarios'] },
  { key: 'sofa', label: 'sofá', aliases: ['sofa', 'sofas'] },
  { key: 'colchao', label: 'colchão', aliases: ['colchao', 'colchoes'] },
  { key: 'cama', label: 'cama', aliases: ['cama box', 'camas box', 'beliche', 'cama', 'camas'] },
  { key: 'mesa', label: 'mesa', aliases: ['mesa', 'mesas'] },
  { key: 'cadeira', label: 'cadeira', aliases: ['cadeira', 'cadeiras'] },
  { key: 'rack', label: 'rack', aliases: ['rack', 'racks'] },
  { key: 'painel', label: 'painel', aliases: ['painel', 'paineis'] },
  { key: 'balcao', label: 'balcão', aliases: ['balcao', 'balcoes'] },
  { key: 'cantoneira', label: 'cantoneira', aliases: ['cantoneira', 'cantoneiras'] },
  { key: 'multiuso', label: 'multiuso', aliases: ['multiuso', 'multiusos'] },
  { key: 'comoda', label: 'cômoda', aliases: ['comoda', 'comodas'] },
  { key: 'geladeira', label: 'geladeira', aliases: ['geladeira', 'geladeiras', 'refrigerador'] },
  { key: 'lavadora', label: 'lavadora', aliases: ['lava e seca', 'lavadora', 'lavadoras', 'tanquinho'] },
  { key: 'televisor', label: 'televisor', aliases: ['televisao', 'televisor', 'tv'] }
];

const TYPE_NAVIGATION_LABELS = {
  'mesa-computador': ['mesa de computador', 'escrivaninha'], 'mesa-jantar': ['mesa para sala', 'mesa de jantar'],
  'mesa-cabeceira': ['criado'], 'mesa-centro': ['centro'], 'mesa-plastica': ['mesa plastica'],
  'guarda-roupa': ['roupeiro'], armario: ['armario'], sofa: ['sofa'], colchao: ['colchoes', 'colchao'],
  cama: ['camas', 'cama'], cadeira: ['cadeira'], lavadora: ['lavadora', 'tanquinho'], televisor: ['televisores', 'televisor']
};

export function normaliseAssistantText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[-_/]+/g, ' ').replace(/[^a-z0-9\s.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singularise(token) {
  if (token.length <= 3) return token;
  if (token.endsWith('oes') || token.endsWith('aes')) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('is') && token.length > 4) return `${token.slice(0, -2)}l`;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokens(value) {
  return normaliseAssistantText(value).split(' ').filter(Boolean).flatMap(token => [token, singularise(token)]);
}

function meaningfulTokens(value) {
  return [...new Set(tokens(value).filter(token => !STOP_WORDS.has(token) && !FILTER_WORDS.has(token) && !/^\d+(?:[.,]\d+)?$/.test(token)))];
}

function hasPhrase(text, phrase) {
  return ` ${normaliseAssistantText(text)} `.includes(` ${normaliseAssistantText(phrase)} `);
}

function subcategoryName(item) {
  return typeof item === 'string' ? item : item?.name || '';
}

function navigationCandidates(environments = []) {
  return environments.flatMap(environment => [{
    type: 'environment', label: environment.name, environment: environment.name,
    source: [environment.name, environment.slug, environment.description].filter(Boolean).join(' ')
  }, ...(environment.subcategories || []).map(item => ({
    type: 'subcategory', label: subcategoryName(item), environment: environment.name,
    source: [subcategoryName(item), item?.slug, item?.keywords].filter(Boolean).join(' ')
  }))]).filter(candidate => candidate.label);
}

function scoreNavigation(query, candidate) {
  const label = normaliseAssistantText(candidate.label);
  const source = new Set(tokens(candidate.source));
  let score = query === label ? 180 : hasPhrase(query, label) ? 110 + label.length : 0;
  for (const token of meaningfulTokens(query)) if (source.has(token)) score += token.length >= 5 ? 24 : 14;
  if (candidate.type === 'subcategory' && score) score += 4;
  return score;
}

export function matchAssistantIntent(message, environments = []) {
  const query = normaliseAssistantText(message);
  if (!query) return { type: 'fallback' };
  const special = SPECIAL_INTENTS.find(intent => intent.phrases.some(phrase => hasPhrase(query, phrase)));
  if (special) return { type: special.type };
  const candidates = navigationCandidates(environments);
  const alias = matchType(query);
  const aliasTargets = alias ? TYPE_NAVIGATION_LABELS[alias.key] || [alias.label] : [];
  const aliasCandidate = candidates.find(candidate => aliasTargets.some(target => hasPhrase(candidate.label, target)));
  if (aliasCandidate) return aliasCandidate;
  const ranked = candidates.map(candidate => ({ ...candidate, score: scoreNavigation(query, candidate) }))
    .filter(candidate => candidate.score >= 24).sort((a, b) => b.score - a.score || (a.type === 'subcategory' ? -1 : 1));
  if (!ranked.length) return { type: 'fallback' };
  const { score: _score, source: _source, ...result } = ranked[0];
  return result;
}

function parseBrazilianNumber(raw, thousandSuffix = '') {
  let value = String(raw || '').trim();
  if (!value) return null;
  if (thousandSuffix) value = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  else value = value.replace(/\./g, '').replace(',', '.');
  const number = Number(value);
  return Number.isFinite(number) ? number * (thousandSuffix ? 1000 : 1) : null;
}

function extractPriceLimit(query) {
  const match = query.match(/(?:ate|abaixo de|menos de|no maximo)\s*(?:r\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(mil|k)?\b/);
  return match ? parseBrazilianNumber(match[1], match[2]) : null;
}

function extractAttributes(query) {
  const attributes = [];
  const units = /\b(\d+)\s*(portas?|gavetas?|lugares?|cadeiras?)\b/g;
  for (const match of query.matchAll(units)) attributes.push({ kind: /porta/.test(match[2]) ? 'doors' : /gaveta/.test(match[2]) ? 'drawers' : 'seats', value: Number(match[1]) });
  const size = ['solteiro', 'casal', 'queen', 'king', 'infantil'].find(item => hasPhrase(query, item));
  if (size) attributes.push({ kind: 'size', value: size });
  return attributes;
}

function matchType(query) {
  return TYPE_GROUPS.map(group => ({ ...group, phrase: group.aliases.filter(alias => hasPhrase(query, alias)).sort((a, b) => b.length - a.length)[0] }))
    .filter(group => group.phrase).sort((a, b) => b.phrase.length - a.phrase.length)[0] || null;
}

function productText(product) {
  const specifications = Object.entries(product.specifications || {}).map(([key, value]) => `${key} ${value}`).join(' ');
  return {
    name: normaliseAssistantText(product.name),
    taxonomy: normaliseAssistantText([product.subcategory, product.category, product.environment].join(' ')),
    keywords: normaliseAssistantText([product.brand, product.keywords].join(' ')),
    attributes: normaliseAssistantText([specifications, product.dimensions, product.material, product.color, product.warranty].join(' ')),
    description: normaliseAssistantText([product.description, product.fullDescription].join(' '))
  };
}

function typeMatchesProduct(group, fields) {
  if (!group) return true;
  const primary = `${fields.name} ${fields.taxonomy}`;
  return group.aliases.some(alias => hasPhrase(primary, alias));
}

function attributeMatches(attribute, fields) {
  const source = `${fields.name} ${fields.taxonomy} ${fields.keywords} ${fields.attributes} ${fields.description}`;
  if (attribute.kind === 'size') return hasPhrase(source, attribute.value);
  const unit = attribute.kind === 'doors' ? 'portas?' : attribute.kind === 'drawers' ? 'gavetas?' : '(?:lugares?|cadeiras?)';
  return new RegExp(`\\b${attribute.value}\\s+(?:[a-z]+\\s+){0,3}${unit}\\b`).test(source);
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const previous = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)); diagonal = previous;
    }
  }
  return row[b.length];
}

function fuzzyNameMatch(queryToken, name) {
  if (queryToken.length < 5) return false;
  return name.split(' ').some(nameToken => nameToken.length >= 5 && editDistance(queryToken, nameToken) <= 1);
}

function scoreProduct(product, query, spec) {
  const fields = productText(product);
  if (!typeMatchesProduct(spec.type, fields)) return null;
  if (spec.navigationTarget && !hasPhrase(`${fields.name} ${fields.taxonomy} ${fields.keywords}`, spec.navigationTarget.label)) return null;
  if (!spec.attributes.every(attribute => attributeMatches(attribute, fields))) return null;
  if (spec.maxPrice != null && (!Number.isFinite(product.price) || product.price > spec.maxPrice)) return null;
  if (spec.freeShipping && !product.freeShipping) return null;
  if (spec.freeAssembly && !product.freeAssembly) return null;
  if (spec.availableOnly && !product.available) return null;
  if (spec.onSale && !product.onSale) return null;

  const core = meaningfulTokens(query).filter(token => !['porta', 'portas', 'gaveta', 'gavetas', 'lugar', 'lugares', 'cadeira', 'cadeiras', 'casal', 'queen', 'king', 'solteiro'].includes(token));
  let score = product.available ? 10 : 0;
  let strongMatches = 0;
  const cleanQuery = core.join(' ');
  if (normaliseAssistantText(product.name) === normaliseAssistantText(query)) score += 1000;
  else if (cleanQuery && fields.name.includes(cleanQuery)) score += 480;
  if (spec.type) { score += 300; strongMatches += 1; }
  if (spec.navigationTarget) { score += spec.navigationTarget.type === 'subcategory' ? 260 : 180; strongMatches += 1; }
  for (const token of core) {
    if (new Set(tokens(fields.name)).has(token)) { score += 85; strongMatches += 1; }
    else if (new Set(tokens(fields.taxonomy)).has(token)) { score += 52; strongMatches += 1; }
    else if (new Set(tokens(fields.keywords)).has(token)) score += 28;
    else if (new Set(tokens(fields.attributes)).has(token)) score += 18;
    else if (new Set(tokens(fields.description)).has(token)) score += 8;
    else if (!spec.type && fuzzyNameMatch(token, fields.name)) { score += 24; strongMatches += 1; }
  }
  if (!spec.type && !spec.navigationTarget && strongMatches === 0) return null;
  return score;
}

function relevantNavigation(query, environments) {
  const ranked = navigationCandidates(environments).map(candidate => ({ ...candidate, score: scoreNavigation(query, candidate) }))
    .filter(candidate => candidate.score >= 24).sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}

function contextualProductQuestion(query) {
  if (/quanto (custa|e)|qual (e )?o preco|preco desse|preco dessa/.test(query)) return 'price';
  if (/frete gratis/.test(query)) return 'freeShipping';
  if (/armacao gratis|montagem gratis/.test(query)) return 'freeAssembly';
  if (/tem estoque|esta disponivel|tem disponivel/.test(query)) return 'availability';
  if (/quantas parcelas|parcelamento|parcela/.test(query)) return 'installments';
  return '';
}

function productAnswer(product, question) {
  if (question === 'price') return product.price == null ? `O preço de ${product.name} não está informado no catálogo. Posso abrir o produto ou chamar a loja.` : `${product.name} está por ${formatMoney(product.price)}${product.oldPrice ? ` (antes ${formatMoney(product.oldPrice)})` : ''}.`;
  if (question === 'freeShipping') return product.freeShipping ? `Sim, ${product.name} está marcado com Frete Grátis.` : `${product.name} não está marcado com Frete Grátis no momento.`;
  if (question === 'freeAssembly') return product.freeAssembly ? `Sim, ${product.name} está marcado com Armação Gratuita.` : `${product.name} não está marcado com Armação Gratuita no momento.`;
  if (question === 'availability') return product.available ? `Sim, ${product.name} está disponível no catálogo agora.` : `${product.name} está indisponível no momento.`;
  if (question === 'installments') return product.installmentCount && product.installmentValue ? `${product.name} pode aparecer em até ${product.installmentCount}x de ${formatMoney(product.installmentValue)}.` : `O catálogo não informa parcelamento para ${product.name}.`;
  return '';
}

function ambiguousTableChoices(products, environments, query, spec) {
  if (spec.type?.key !== 'mesa' || spec.attributes.length || spec.maxPrice != null || meaningfulTokens(query).some(token => token !== 'mesa')) return [];
  return navigationCandidates(environments).filter(item => item.type === 'subcategory' && hasPhrase(item.label, 'mesa')).filter(item => products.some(product => {
    const fields = productText(product); return hasPhrase(`${fields.name} ${fields.taxonomy}`, item.label);
  })).map(item => ({ label: item.label, query: item.label, intent: item }));
}

function storeInfoResult(type, store = {}) {
  if (type === 'payment') {
    const methods = [store.pixEnabled ? 'PIX' : '', store.cardEnabled ? `cartão${store.maxInstallments ? ` em até ${store.maxInstallments}x` : ''}` : '', store.pickupEnabled ? 'retirada na loja' : '', store.deliveryEnabled ? 'entrega' : ''].filter(Boolean);
    return { type: 'info', text: methods.length ? `As opções públicas configuradas são: ${methods.join(', ')}.` : 'As formas de pagamento ainda não estão informadas no site. Posso chamar a loja para confirmar.' };
  }
  if (type === 'location') {
    const address = [store.address, store.city, store.state].filter(Boolean).join(' · ');
    return { type: 'info', text: address ? `A loja fica em ${address}.` : 'O endereço não está informado no site no momento.' };
  }
  if (type === 'hours') return { type: 'info', text: store.openingHours ? `Horário de funcionamento: ${store.openingHours}` : 'O horário de funcionamento não está informado no site no momento.' };
  return null;
}

export function searchStore(message, data = {}, context = {}) {
  const query = normaliseAssistantText(message);
  const products = Array.isArray(data.products) ? data.products : [];
  const environments = Array.isArray(data.environments) ? data.environments : [];
  if (!query) return { type: 'fallback', text: 'Digite o produto ou informação que você procura.' };

  const referencedId = context.selectedProductId || (context.lastShownIds?.length === 1 ? context.lastShownIds[0] : null);
  const referencedProduct = products.find(product => String(product.id) === String(referencedId));
  const question = contextualProductQuestion(query);
  if (question && referencedProduct) return { type: 'product-info', text: productAnswer(referencedProduct, question), product: referencedProduct };
  if (question && context.lastShownIds?.length > 1 && !['freeShipping', 'freeAssembly'].includes(question)) return { type: 'info', text: 'Qual dos produtos você quer consultar? Use “Ver produto” no card desejado e depois me pergunte o preço, estoque ou parcelamento.' };

  const type = matchType(query);
  const attributes = extractAttributes(query);
  const maxPrice = extractPriceLimit(query);
  const contextualBenefit = ['freeShipping', 'freeAssembly'].includes(question) && context.lastAllIds?.length;
  const followup = !type && !attributes.length && maxPrice == null && (contextualBenefit || /^(?:os |as )?(?:mais )?(?:baratos?|caras?)$|menor preco|maior preco|com frete gratis|em promocao|com armacao gratis/.test(query));
  const special = SPECIAL_INTENTS.find(intent => intent.phrases.some(phrase => hasPhrase(query, phrase)));
  if (special && ['payment', 'location', 'hours'].includes(special.type)) return storeInfoResult(special.type, data.store || {});
  if (special && !type && !attributes.length && maxPrice == null && !followup) return { type: special.type };

  const navigationTarget = relevantNavigation(query, environments);
  const environmentOnly = navigationTarget?.type === 'environment' && !type && attributes.length === 0 && maxPrice == null;
  if (environmentOnly) return navigationTarget;

  const spec = {
    type, attributes, maxPrice, navigationTarget: type ? null : navigationTarget,
    freeShipping: /frete gratis/.test(query), freeAssembly: /armacao gratis|montagem gratis/.test(query),
    availableOnly: /disponiveis?|em estoque/.test(query), onSale: /promocao|oferta|desconto/.test(query),
    sort: /mais barato|menor preco/.test(query) ? 'asc' : /mais caro|maior preco/.test(query) ? 'desc' : 'relevance'
  };

  const choices = ambiguousTableChoices(products, environments, query, spec);
  if (choices.length > 1) return { type: 'choices', text: 'Claro! Que tipo de mesa você procura?', choices };

  let pool = products;
  if (followup && context.lastAllIds?.length) {
    const allowed = new Set(context.lastAllIds.map(String));
    pool = products.filter(product => allowed.has(String(product.id)));
  }
  const ranked = pool.map(product => ({ product, score: scoreProduct(product, followup ? context.lastQuery || query : query, spec) }))
    .filter(item => item.score != null && item.score >= (spec.type || spec.navigationTarget ? 180 : 70));
  ranked.sort((a, b) => spec.sort === 'asc' ? (a.product.price ?? Infinity) - (b.product.price ?? Infinity) : spec.sort === 'desc' ? (b.product.price ?? -Infinity) - (a.product.price ?? -Infinity) : b.score - a.score || Number(b.product.available) - Number(a.product.available));
  const matches = ranked.map(item => item.product);
  if (matches.length) {
    const label = spec.type?.label || spec.navigationTarget?.label || 'produto';
    const priceText = maxPrice != null ? ` até ${formatMoney(maxPrice)}` : '';
    return { type: 'products', text: `Encontrei ${matches.length} ${matches.length === 1 ? 'opção' : 'opções'} de ${label}${priceText}.`, products: matches, target: spec.type?.label || spec.navigationTarget?.label || '', baseQuery: followup ? context.lastQuery || query : query };
  }

  const label = spec.type?.label || spec.navigationTarget?.label || meaningfulTokens(query).join(' ') || 'produto';
  return { type: 'fallback', text: `Não encontrei ${label}${attributes.length ? ' com essas características' : ''}${maxPrice != null ? ` até ${formatMoney(maxPrice)}` : ''} disponível no catálogo agora.`, navigation: navigationTarget };
}

export function assistantReply(intent) {
  if (intent.type === 'whatsapp') return { text: 'Claro! Você pode falar diretamente com nossa equipe.', action: 'FALAR PELO WHATSAPP' };
  if (intent.type === 'cart') return { text: 'Claro! Vou abrir sua sacola.', action: 'VER MINHA SACOLA' };
  if (intent.type === 'home') return { text: 'Vou levar você para o início da loja.', action: 'IR PARA O INÍCIO' };
  if (intent.type === 'offers') return { text: 'Confira as ofertas disponíveis agora.', action: 'VER OFERTAS' };
  if (intent.type === 'environment') return { text: `Temos uma seção inteira para ${intent.label}.`, action: `VER ${intent.label.toLocaleUpperCase('pt-BR')}` };
  if (intent.type === 'subcategory') return { text: `Claro! Encontrei ${intent.label} para você.`, action: `VER ${intent.label.toLocaleUpperCase('pt-BR')}` };
  return { text: intent.text || 'Não encontrei exatamente isso no catálogo.' };
}

function formatMoney(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function icon(name) {
  const paths = { chat: '<path d="M5 5h14v10H9l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>', close: '<path d="m7 7 10 10M17 7 7 17"/>', send: '<path d="m4 4 17 8-17 8 3-8-3-8Z"/><path d="M7 12h14"/>', mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>', bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>' };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
}

function availableEnvironment(data, name) {
  const wanted = normaliseAssistantText(name);
  return data.environments.find(item => normaliseAssistantText(item.name) === wanted);
}

function configuredShortcuts(data) {
  const flags = data.settings?.shortcuts || {};
  const shortcuts = [['Sala', '🛋️'], ['Quarto', '🛏️'], ['Cozinha', '🍳'], ['Eletros', '⚡']].flatMap(([name, emoji]) => {
    if (flags[normaliseAssistantText(name)] === false) return [];
    const environment = availableEnvironment(data, name);
    return environment ? [{ label: environment.name, emoji, query: environment.name }] : [];
  });
  if (flags.ofertas !== false) shortcuts.push({ label: 'Ofertas', emoji: '🔥', query: 'ofertas' });
  shortcuts.push({ label: 'Sacola', emoji: '🛍️', query: 'minha sacola' });
  return shortcuts;
}

export function mountVirtualAssistant({ launcher, api = window.StorefrontNavigation } = {}) {
  if (!launcher || !api) throw new Error('A navegação da loja ainda não está disponível.');
  if (launcher.dataset.assistantMounted === 'true') return;
  launcher.dataset.assistantMounted = 'true';
  const root = document.createElement('div'); root.className = 'virtual-assistant'; launcher.before(root); root.append(launcher);
  const panel = document.createElement('section'); panel.id = 'virtualAssistantPanel'; panel.className = 'virtual-assistant-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'virtualAssistantTitle'); panel.hidden = true;
  panel.innerHTML = `<header class="virtual-assistant-header"><span class="virtual-assistant-avatar">${icon('chat')}</span><div><strong id="virtualAssistantTitle">ASSISTENTE ATACAREJO</strong><small><i></i> Especialista da loja</small></div><button type="button" data-assistant-close aria-label="Fechar assistente">${icon('close')}</button></header><div class="virtual-assistant-log" data-assistant-log role="log" aria-live="polite" aria-relevant="additions"></div><form class="virtual-assistant-form" data-assistant-form><label class="sr-only" for="virtualAssistantInput">Digite ou fale o que procura</label><input id="virtualAssistantInput" name="message" autocomplete="off" enterkeyhint="send" maxlength="160" placeholder="Digite ou fale o que procura..." required><button class="virtual-assistant-voice" type="button" data-assistant-voice aria-label="Pesquisar por voz" hidden>${icon('mic')}</button><button type="submit" aria-label="Enviar mensagem">${icon('send')}</button><span class="virtual-assistant-voice-status" data-assistant-voice-status role="status" aria-live="polite" hidden></span></form>`;
  root.append(panel);
  const log = panel.querySelector('[data-assistant-log]'); const form = panel.querySelector('[data-assistant-form]'); const input = form.elements.message; const closeButton = panel.querySelector('[data-assistant-close]');
  const session = { lastQuery: '', lastAllIds: [], lastShownIds: [], selectedProductId: null };
  let started = false;
  const currentData = () => api.getAssistantData();

  function addUserMessage(text) { const article = document.createElement('article'); article.className = 'virtual-assistant-message is-user'; article.textContent = text; log.append(article); }
  function close() { voice.stop(); panel.hidden = true; root.classList.remove('is-open'); launcher.setAttribute('aria-expanded', 'false'); launcher.focus({ preventScroll: true }); }
  function runIntent(intent) { close(); if (intent.type === 'subcategory') api.openSubcategory(intent.environment, intent.label); else if (intent.type === 'environment') api.openEnvironment(intent.environment || intent.label); else if (intent.type === 'offers') api.openOffers(); else if (intent.type === 'cart') api.openCart(); else if (intent.type === 'whatsapp') api.openWhatsApp(); else if (intent.type === 'home') api.openHome(); }
  function actionButton(intent, label) { const button = document.createElement('button'); button.type = 'button'; button.className = 'virtual-assistant-action'; button.innerHTML = `<span>${escapeHtml(label)}</span><b aria-hidden="true">→</b>`; button.addEventListener('click', () => runIntent(intent)); return button; }
  function queryButton(label, query) { const button = document.createElement('button'); button.type = 'button'; button.className = 'virtual-assistant-query'; button.textContent = label; button.addEventListener('click', () => submitMessage(query, label)); return button; }

  function productCard(product) {
    const card = document.createElement('article'); card.className = 'virtual-assistant-product';
    const oldPrice = product.oldPrice ? `<del>${formatMoney(product.oldPrice)}</del>` : '';
    const currentPrice = product.price == null ? '<strong>Consulte o preço</strong>' : `<strong>${formatMoney(product.price)}</strong>`;
    const installment = product.installmentCount && product.installmentValue ? `<small>ou ${product.installmentCount}x de ${formatMoney(product.installmentValue)}</small>` : '';
    const badges = [product.freeShipping ? '<span>FRETE GRÁTIS</span>' : '', product.freeAssembly ? '<span>ARMAÇÃO GRATUITA</span>' : '', !product.available ? '<span class="is-unavailable">INDISPONÍVEL</span>' : ''].join('');
    card.innerHTML = `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="112" height="92"><div class="virtual-assistant-product-copy"><small>${escapeHtml([product.environment, product.subcategory].filter(Boolean).join(' · '))}</small><h3>${escapeHtml(product.name)}</h3><div class="virtual-assistant-product-price">${oldPrice}${currentPrice}${installment}</div>${badges ? `<div class="virtual-assistant-product-badges">${badges}</div>` : ''}<div class="virtual-assistant-product-actions"></div></div>`;
    const actions = card.querySelector('.virtual-assistant-product-actions');
    const view = document.createElement('button'); view.type = 'button'; view.textContent = 'VER PRODUTO'; view.addEventListener('click', () => { session.selectedProductId = product.id; close(); api.openProduct(product.id); }); actions.append(view);
    if (product.available && product.cartEnabled && product.price != null) { const bag = document.createElement('button'); bag.type = 'button'; bag.className = 'is-bag'; bag.innerHTML = `${icon('bag')}<span>ADICIONAR</span>`; bag.addEventListener('click', () => { session.selectedProductId = product.id; api.addToCart(product.id); }); actions.append(bag); }
    if (currentData().whatsappConfigured && product.whatsappEnabled) { const whatsapp = document.createElement('button'); whatsapp.type = 'button'; whatsapp.className = 'is-whatsapp'; whatsapp.textContent = 'WHATSAPP'; whatsapp.addEventListener('click', () => { session.selectedProductId = product.id; close(); api.openProductWhatsApp(product.id); }); actions.append(whatsapp); }
    return card;
  }

  function fallbackOptions(article, result) {
    const options = document.createElement('div'); options.className = 'virtual-assistant-fallback';
    if (result.navigation) options.append(actionButton(result.navigation, `VER ${result.navigation.label.toLocaleUpperCase('pt-BR')}`));
    const data = currentData();
    if (data.settings?.showWhatsapp !== false && data.whatsappConfigured) options.append(actionButton({ type: 'whatsapp' }, 'FALAR COM A LOJA'));
    if (!result.navigation) ['Sala', 'Quarto', 'Cozinha'].map(name => availableEnvironment(data, name)).filter(Boolean).slice(0, 3).forEach(environment => options.append(actionButton({ type: 'environment', label: environment.name, environment: environment.name }, environment.name.toLocaleUpperCase('pt-BR'))));
    if (options.children.length) article.append(options);
  }

  function addAssistantResult(result) {
    const article = document.createElement('article'); article.className = 'virtual-assistant-message is-assistant';
    const reply = assistantReply(result); const bubble = document.createElement('div'); bubble.textContent = reply.text; article.append(bubble);
    if (reply.action) article.append(actionButton(result, reply.action));
    if (result.type === 'products') {
      const shown = result.products.slice(0, 3); const cards = document.createElement('div'); cards.className = 'virtual-assistant-products'; shown.forEach(product => cards.append(productCard(product))); article.append(cards);
      session.lastQuery = result.baseQuery; session.lastAllIds = result.products.map(product => product.id); session.lastShownIds = shown.map(product => product.id); session.selectedProductId = shown.length === 1 ? shown[0].id : null;
      const footer = document.createElement('div'); footer.className = 'virtual-assistant-result-actions';
      if (result.products.length > shown.length) { const all = document.createElement('button'); all.type = 'button'; all.textContent = `VER TODOS (${result.products.length})`; all.addEventListener('click', () => { close(); api.showProducts(result.products.map(product => product.id)); }); footer.append(all); }
      footer.append(queryButton('MAIS BARATOS', 'mais baratos'), queryButton('EM PROMOÇÃO', 'em promoção'), queryButton('FRETE GRÁTIS', 'com frete grátis')); article.append(footer);
    } else if (result.type === 'choices') {
      const choices = document.createElement('div'); choices.className = 'virtual-assistant-choices'; result.choices.forEach(choice => choices.append(queryButton(choice.label.toLocaleUpperCase('pt-BR'), choice.query))); article.append(choices);
    } else if (result.type === 'fallback') fallbackOptions(article, result);
    else if (result.type === 'product-info' && result.product) { const actions = document.createElement('div'); actions.className = 'virtual-assistant-result-actions'; const view = document.createElement('button'); view.type = 'button'; view.textContent = 'VER PRODUTO'; view.addEventListener('click', () => { close(); api.openProduct(result.product.id); }); actions.append(view); article.append(actions); }
    log.append(article); log.scrollTop = log.scrollHeight;
  }

  function submitMessage(message, visibleText = message) { const text = String(message || '').trim(); if (!text) return; addUserMessage(visibleText); addAssistantResult(searchStore(text, currentData(), session)); form.reset(); input.focus(); }
  const voice = setupVoiceSearch({ input, button: panel.querySelector('[data-assistant-voice]'), status: panel.querySelector('[data-assistant-voice-status]'), submit: submitMessage, isOpen: () => !panel.hidden, Recognition: window.SpeechRecognition || window.webkitSpeechRecognition });
  function addWelcome() { const data = currentData(); const article = document.createElement('article'); article.className = 'virtual-assistant-message is-assistant is-welcome'; const bubble = document.createElement('div'); bubble.textContent = data.settings?.welcome || DEFAULT_WELCOME; article.append(bubble); const shortcuts = document.createElement('div'); shortcuts.className = 'virtual-assistant-shortcuts'; configuredShortcuts(data).forEach(item => { const button = document.createElement('button'); button.type = 'button'; button.innerHTML = `<span aria-hidden="true">${item.emoji}</span>${escapeHtml(item.label)}`; button.addEventListener('click', () => submitMessage(item.query, item.label)); shortcuts.append(button); }); article.append(shortcuts); log.append(article); }
  function open() { if (!started) { addWelcome(); started = true; } panel.hidden = false; root.classList.add('is-open'); launcher.setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => input.focus({ preventScroll: true })); }
  launcher.addEventListener('click', () => panel.hidden ? open() : close()); closeButton.addEventListener('click', close); panel.addEventListener('keydown', event => { if (event.key === 'Escape') close(); }); form.addEventListener('submit', event => { event.preventDefault(); voice.stop({ restoreDraft: false }); submitMessage(input.value); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.stop(); });
  window.addEventListener('pagehide', () => voice.stop());
}
