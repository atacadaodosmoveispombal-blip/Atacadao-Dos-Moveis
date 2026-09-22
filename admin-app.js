(() => {
  'use strict';

  const SUPABASE_URL = 'https://ejcmuygnfrmytdqlyhjr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
  const ROLES = new Set(['super_admin', 'admin', 'editor', 'viewer']);
  const WRITE_ROLES = new Set(['super_admin', 'admin', 'editor']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const titles = {
    dashboard: 'Visão geral', products: 'Produtos', categories: 'Subcategorias', environments: 'Ambientes',
    brands: 'Marcas', stock: 'Estoque', promotions: 'Promoções', coupons: 'Cupons', banners: 'Campanhas e Banners',
    sections: 'Página inicial', inspirations: 'Inspirações', leads: 'Leads / Orçamentos', store: 'Loja e WhatsApp',
    orders: 'Pedidos', 'online-sales': 'Vendas online',
    seo: 'SEO', users: 'Usuários ADM', settings: 'Configurações', audit: 'Auditoria'
  };
  const viewMeta = {
    dashboard: ['⌂', 'Acompanhe o desempenho da sua loja em tempo real.'],
    products: ['▦', 'Gerencie seus produtos, preços, fotos e disponibilidade.'],
    categories: ['▦', 'Organize as subcategorias dentro de cada ambiente.'],
    environments: ['⌂', 'Organize os ambientes apresentados no catálogo.'],
    brands: ['◇', 'Gerencie as marcas vinculadas aos produtos.'],
    stock: ['▤', 'Acompanhe e atualize o estoque da loja.'],
    promotions: ['%', 'Crie campanhas e ofertas para o catálogo.'],
    coupons: ['◇', 'Configure cupons e regras de desconto.'],
    banners: ['▣', 'Escolha um modelo e publique sua campanha em poucos cliques.'],
    sections: ['☷', 'Organize o conteúdo da página inicial.'],
    inspirations: ['◎', 'Publique ambientes e ideias para os clientes.'],
    leads: ['✉', 'Acompanhe contatos e solicitações de orçamento.'],
    store: ['⌖', 'Atualize os dados da loja e do WhatsApp.'],
    orders: ['▧', 'Acompanhe pagamentos, separação, retirada e entrega dos pedidos.'],
    'online-sales': ['⚙', 'Prepare entrega, pagamento e regras comerciais do checkout.'],
    seo: ['⌕', 'Defina os dados padrão para buscadores e compartilhamento.'],
    users: ['♙', 'Gerencie os usuários e níveis de acesso do ADM.'],
    settings: ['⚙', 'Atualize a identidade e as configurações gerais.'],
    audit: ['☷', 'Consulte o histórico de alterações do painel.']
  };
  let db;
  let profile;
  let current = 'dashboard';
  let busy = false;
  let authRevision = 0;
  let viewRevision = 0;
  let toastTimer;
  let editorState;
  const productViewState = {
    page: 1, pageSize: 10, view: 'list', selected: new Set(), search: '',
    category: '', status: '', stock: '', sort: 'newest', featuredOnly: false, promotionOnly: false
  };
  const storefrontSync = 'BroadcastChannel' in window ? new BroadcastChannel('atacarejo-cms') : null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const brl = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
  const ORDER_STATUS_LABELS = { received: 'Pedido recebido', awaiting_payment: 'Aguardando pagamento', payment_approved: 'Pagamento aprovado', preparing: 'Preparando', ready_for_pickup: 'Pronto para retirada', out_for_delivery: 'Saiu para entrega', completed: 'Concluído', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const PAYMENT_STATUS_LABELS = { pending: 'Aguardando pagamento', approved: 'Aprovado', declined: 'Recusado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const actionIcon = name => {
    const paths = {
      view: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
      edit: '<path d="M4 20l4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m14.5 6.8 3 3"/>',
      copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
      pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6m4-6v6"/>',
      play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',
      save: '<path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>',
      more: '<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
      truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
      tools: '<path d="m14.5 6.5 3-3a4 4 0 0 1-5 5l-7 7a2 2 0 1 1-3-3l7-7a4 4 0 0 1 5-5l-3 3 3 3Z"/><path d="m14 14 6 6"/>',
      filter: '<path d="M4 5h16l-6.5 7.2V19l-3 1v-7.8L4 5Z"/>',
      list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
      grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
      up: '<path d="m6 14 6-6 6 6"/><path d="M12 8v11"/>',
      down: '<path d="m6 10 6 6 6-6"/><path d="M12 5v11"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
  };
  const actionAttributes = attributes => Object.entries(attributes || {}).map(([name, value]) => ` ${name}="${esc(value)}"`).join('');
  function ActionMenu({ id, label, primary, actions = [] }) {
    const safeId = esc(id);
    const primaryMarkup = primary ? `<button class="action-menu-primary" type="button" aria-label="${esc(primary.ariaLabel || `${primary.label} ${label}`)}" title="${esc(primary.label)}"${actionAttributes(primary.attributes)}>${actionIcon(primary.icon || 'edit')}<span>${esc(primary.label)}</span></button>` : '';
    const menuActions = actions.map(action => {
      if (action.separator) return '<span class="action-menu-separator" role="separator"></span>';
      return `<button class="action-menu-item ${action.danger ? 'is-danger' : ''}" type="button" role="menuitem" tabindex="-1"${actionAttributes(action.attributes)}>${actionIcon(action.icon)}<span>${esc(action.label)}</span></button>`;
    }).join('');
    if (!menuActions) return `<div class="action-menu is-single" data-action-menu-root="${safeId}">${primaryMarkup}</div>`;
    return `<div class="action-menu" data-action-menu-root="${safeId}">${primaryMarkup}<button class="action-menu-trigger" type="button" data-action-menu-trigger="${safeId}" aria-label="Mais ações para ${esc(label)}" aria-haspopup="menu" aria-expanded="false" title="Mais ações">${actionIcon('more')}</button><div class="action-menu-popover" data-action-menu-popover="${safeId}" role="menu" aria-label="Ações de ${esc(label)}" hidden>${menuActions}<button class="action-menu-cancel" type="button" data-action-menu-close>Cancelar</button></div></div>`;
  }
  let activeActionTrigger = null;
  function closeActionMenus({ restoreFocus = false } = {}) {
    $$('.action-menu-popover:not([hidden])').forEach(menu => {
      menu.hidden = true;
      menu.classList.remove('is-sheet');
      menu.removeAttribute('style');
    });
    $$('[data-action-menu-trigger][aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    $('#actionMenuBackdrop').hidden = true;
    document.body.classList.remove('action-menu-open');
    if (restoreFocus) activeActionTrigger?.focus();
    activeActionTrigger = null;
  }
  function positionActionMenu(trigger, menu) {
    const mobile = window.matchMedia('(max-width: 620px)').matches;
    menu.hidden = false;
    activeActionTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    if (mobile) {
      menu.classList.add('is-sheet');
      $('#actionMenuBackdrop').hidden = false;
      document.body.classList.add('action-menu-open');
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(224, window.innerWidth - 24);
    menu.style.width = `${width}px`;
    const height = menu.offsetHeight;
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const below = window.innerHeight - rect.bottom >= height + 12;
    const top = below ? rect.bottom + 7 : Math.max(12, rect.top - height - 7);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }
  function bindActionMenus(root = document) {
    $$('[data-action-menu-trigger]', root).forEach(trigger => {
      if (trigger.dataset.actionMenuBound) return;
      trigger.dataset.actionMenuBound = 'true';
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const menu = document.querySelector(`[data-action-menu-popover="${CSS.escape(trigger.dataset.actionMenuTrigger)}"]`);
        const opening = menu?.hidden;
        closeActionMenus();
        if (opening && menu) positionActionMenu(trigger, menu);
      });
      trigger.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        trigger.click();
        const items = $$('[role="menuitem"]', document.querySelector(`[data-action-menu-popover="${CSS.escape(trigger.dataset.actionMenuTrigger)}"]`));
        (event.key === 'ArrowUp' ? items.at(-1) : items[0])?.focus();
      });
    });
    $$('.action-menu-popover', root).forEach(menu => {
      if (menu.dataset.actionMenuBound) return;
      menu.dataset.actionMenuBound = 'true';
      menu.addEventListener('click', event => {
        event.stopPropagation();
        if (event.target.closest('[data-action-menu-close]')) closeActionMenus({ restoreFocus: true });
        else if (event.target.closest('[role="menuitem"]')) requestAnimationFrame(() => closeActionMenus());
      });
      menu.addEventListener('keydown', event => {
        const items = $$('[role="menuitem"]', menu).filter(item => !item.disabled);
        const index = items.indexOf(document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); closeActionMenus({ restoreFocus: true }); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !items.length) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        items[next].focus();
      });
    });
    const backdrop = $('#actionMenuBackdrop');
    if (!backdrop.dataset.actionMenuBound) {
      backdrop.dataset.actionMenuBound = 'true';
      backdrop.addEventListener('click', () => closeActionMenus({ restoreFocus: true }));
    }
  }
  async function runAction(button, operation) {
    if (!button || button.dataset.processing === 'true') return;
    const root = button.closest('.action-menu') || button.parentElement;
    const controls = $$('button', root);
    button.dataset.processing = 'true';
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    controls.forEach(control => { control.disabled = true; });
    try { await operation(); }
    catch (error) { toast(explain(error), 'error'); }
    finally {
      if (button.isConnected) {
        delete button.dataset.processing;
        button.classList.remove('is-loading');
        button.removeAttribute('aria-busy');
        controls.forEach(control => { control.disabled = false; });
      }
    }
  }
  function confirmAction({ title = 'Confirmar ação?', message = 'Revise antes de continuar.', confirmLabel = 'Confirmar', tone = 'default' } = {}) {
    const dialog = $('#confirmDialog');
    if (dialog.open) dialog.close('cancel');
    $('#confirmTitle').textContent = title;
    $('#confirmMessage').textContent = message;
    const accept = $('#confirmAccept');
    accept.textContent = confirmLabel;
    accept.classList.toggle('is-danger', tone === 'danger');
    dialog.returnValue = 'cancel';
    return new Promise(resolve => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
      dialog.addEventListener('cancel', () => { dialog.returnValue = 'cancel'; }, { once: true });
      dialog.showModal();
      requestAnimationFrame(() => $('#confirmCancel').focus());
    });
  }
  const dashboardIcon = name => {
    const paths = {
      products: '<path d="m5 7 7-4 7 4v10l-7 4-7-4V7Z"/><path d="m5 7 7 4 7-4M12 11v10"/>',
      empty: '<path d="M4 7.5 12 3l8 4.5V17l-8 4-8-4V7.5Z"/><path d="m4 7.5 8 4 8-4M12 11.5V21M8.5 5l8 4.5"/>',
      warning: '<path d="M10.3 4.1 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.1a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
      leads: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19M16 4.5a3 3 0 0 1 0 6M17 13a4.5 4.5 0 0 1 3.5 4.4V19"/>',
      views: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
      promotion: '<path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
      coupon: '<path d="M4 7a2 2 0 0 0 2-2h12v4a3 3 0 0 0 0 6v4H6a2 2 0 0 0-2-2V7Z"/><path d="M12 7v2m0 2v2m0 2v2"/>',
      banner: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 2-2 6 5"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      fire: '<path d="M12 22c4.1 0 7-2.7 7-6.5 0-3.1-1.8-5.6-4.2-8 .1 2-1 3.1-2 3.7.3-3.3-1.4-6.3-4.7-8.7.3 4.4-3.1 6.6-3.1 11.2C5 18.4 8 22 12 22Z"/><path d="M9.7 18.7c-1.2-1.6-.6-3.3.8-4.7.1 1.2.8 2 1.6 2.5.5-1.2.5-2.4.1-3.6 1.7 1.2 2.7 2.8 2.4 4.5-.3 1.5-1.4 2.6-2.8 2.6-.9 0-1.6-.4-2.1-1.3Z"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
  };
  const canWrite = () => WRITE_ROLES.has(profile?.role);
  const canAdmin = () => ['super_admin', 'admin'].includes(profile?.role);

  function message(text = '', error = false) {
    $('#error').textContent = text;
    $('#error').classList.toggle('is-error', error);
  }
  function setBusy(value, text) {
    busy = value;
    $('#loginForm').setAttribute('aria-busy', String(value));
    $('#loginSubmit').disabled = value;
    $('#loginSubmit').textContent = value ? (text || 'Entrando…') : 'Entrar';
  }
  function showLogin(text = '', error = false) {
    profile = null;
    viewRevision++;
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#content').replaceChildren();
    $('#who').textContent = '';
    $('#whoTop').textContent = 'Administrador';
    $('#profileInitials').textContent = 'AD';
    message(text, error);
  }
  function explain(error) {
    const text = String(error?.message || '');
    if (error?.code === 'invalid_credentials' || /invalid login credentials/i.test(text)) return 'E-mail ou senha incorretos.';
    if (error?.code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.';
    if (error?.code === '42501' || /row-level security|permission denied/i.test(text)) return 'Seu perfil não possui permissão para esta ação.';
    if (error?.code === '23505') return 'Já existe um registro com esses dados.';
    if (error?.code === '23503') return 'Este registro ainda está vinculado a outros dados.';
    if (error?.code === '23514' || error?.code === '22001') return 'Revise os dados informados e tente novamente.';
    if (/fetch|network|timeout|timed out/i.test(text)) return 'Falha de conexão. Verifique a internet.';
    if (/^(?:Seu perfil não tem acesso ativo|A data final precisa|Formato inválido|A imagem deve|Não foi possível processar esta imagem|Não foi possível otimizar esta imagem|Envie no máximo|O conteúdo JSON|Especificação inválida|“[^”]+” não é JPG|“[^”]+” ultrapassa o limite)/.test(text)) return text;
    return 'Não foi possível concluir a operação. Tente novamente ou contate o suporte.';
  }
  async function timedFetch(input, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try { return await fetch(input, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); }
  }
  function initialize() {
    if (db) return;
    if (!window.supabase?.createClient) throw new Error('Não foi possível carregar o acesso seguro.');
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }, global: { fetch: timedFetch }
    });
    db.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { authRevision++; showLogin(); }
      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) setTimeout(() => { if (!busy) restore(); }, 0);
    });
  }
  async function authorize(session, revision) {
    if (!session) { if (revision === authRevision) showLogin(); return; }
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    const { data, error } = await db.from('profiles').select('*').eq('id', userData.user.id).maybeSingle();
    if (revision !== authRevision) return;
    if (error) throw error;
    if (!data || !data.active || data.access_approved === false || !ROLES.has(data.role)) throw new Error('Seu perfil não tem acesso ativo ao painel.');
    profile = data;
    $('#who').textContent = `${data.full_name || data.email} · ${data.role}`;
    $('#whoTop').textContent = data.full_name || data.role;
    $('#profileInitials').textContent = String(data.full_name || data.email || 'AD').split(/\s+|@/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#password').value = '';
    message();
    await render(current);
  }
  async function restore() {
    if (busy) return;
    setBusy(true, 'Verificando acesso…');
    const revision = ++authRevision;
    try {
      initialize();
      const { data, error } = await db.auth.getSession();
      if (error) throw error;
      await authorize(data?.session, revision);
    } catch (error) { if (revision === authRevision) showLogin(explain(error), true); }
    finally { setBusy(false); }
  }
  async function login(event) {
    event.preventDefault();
    if (busy || !$('#loginForm').reportValidity()) return;
    setBusy(true);
    const revision = ++authRevision;
    try {
      initialize();
      const { data, error } = await db.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
      if (error) throw error;
      await authorize(data?.session, revision);
    } catch (error) { if (revision === authRevision) showLogin(explain(error), true); }
    finally { setBusy(false); }
  }
  async function logout() {
    ++authRevision;
    const { error } = await db.auth.signOut({ scope: 'local' });
    showLogin(error ? explain(error) : 'Você saiu do painel.', Boolean(error));
  }
  function toast(text, type = 'success') {
    clearTimeout(toastTimer);
    const element = $('#toast');
    if (type === 'success' && /erro|falha|não foi possível|incorret|permissão|execute a migration/i.test(String(text))) type = 'error';
    element.dataset.type = type;
    element.innerHTML = `${actionIcon(type === 'error' ? 'close' : type === 'info' ? 'info' : 'check')}<span>${esc(text)}</span>`;
    element.classList.add('show');
    toastTimer = setTimeout(() => element.classList.remove('show'), 3500);
  }
  function notifyStorefront(entity = 'content') {
    const detail = { entity, changedAt: Date.now() };
    storefrontSync?.postMessage(detail);
    localStorage.setItem('atacarejo-cms-sync', JSON.stringify(detail));
  }

  async function count(table, filter) {
    let query = db.from(table).select('id', { count: 'exact', head: true });
    if (filter) query = filter(query);
    const { count: total, error } = await query;
    if (error) throw error;
    return total || 0;
  }
  async function lowStock() {
    const { data, error } = await db.from('products').select('stock_quantity,low_stock_threshold').is('deleted_at', null).gt('stock_quantity', 0);
    if (error) throw error;
    return data.filter(item => item.stock_quantity <= item.low_stock_threshold).length;
  }
  async function profilesMap(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    const { data } = await db.from('profiles').select('id,full_name,email').in('id', unique);
    return Object.fromEntries((data || []).map(item => [item.id, item.full_name || item.email]));
  }
  async function dashboard(revision) {
    const metrics = [
      { label: 'Produtos cadastrados', icon: 'products', tone: 'blue', note: 'itens no catálogo', view: 'products', load: () => count('products', q => q.is('deleted_at', null)) },
      { label: 'Sem estoque', icon: 'empty', tone: 'green', note: 'produtos indisponíveis', view: 'stock', load: () => count('products', q => q.is('deleted_at', null).eq('stock_quantity', 0)) },
      { label: 'Estoque baixo', icon: 'warning', tone: 'orange', note: 'atenção necessária', view: 'stock', load: lowStock },
      { label: 'Leads novos', icon: 'leads', tone: 'purple', note: 'aguardando atendimento', view: 'leads', load: () => count('leads', q => q.eq('status', 'novo')) },
      { label: 'Visualizações', icon: 'views', tone: 'blue', note: 'acessos registrados', view: 'products', load: () => count('product_views') },
      { label: 'Promoções ativas', icon: 'promotion', tone: 'red', note: 'ofertas no ar', view: 'promotions', load: () => count('promotions', q => q.eq('active', true)) },
      { label: 'Cupons ativos', icon: 'coupon', tone: 'green', note: 'cupons disponíveis', view: 'coupons', load: () => count('coupons', q => q.eq('active', true)) },
      { label: 'Banners ativos', icon: 'banner', tone: 'purple', note: 'conteúdos em destaque', view: 'banners', load: () => count('banners', q => q.eq('active', true)) }
    ];
    const [totals, auditResult, productResult] = await Promise.all([
      Promise.allSettled(metrics.map(item => item.load())),
      db.from('audit_logs').select('action,entity,record_id,user_id,created_at').order('created_at', { ascending: false }).limit(8),
      db.from('products').select('id,name,sku,view_count,product_images(image_url,is_cover,sort_order)').is('deleted_at', null).order('view_count', { ascending: false }).limit(5)
    ]);
    const people = await profilesMap((auditResult.data || []).map(item => item.user_id));
    if (revision !== viewRevision) return;
    const actionLabels = { insert: 'criado', update: 'atualizado', delete: 'excluído' };
    const entityLabels = { products: 'Produto', product_images: 'Imagem', categories: 'Categoria', leads: 'Lead', banners: 'Banner', promotions: 'Promoção', coupons: 'Cupom', store_settings: 'Configuração' };
    const auditRows = (auditResult.data || []).map(item => {
      const entity = entityLabels[item.entity] || 'Registro';
      const actionKey = String(item.action || '').toLowerCase();
      const action = actionLabels[actionKey] || String(item.action || 'alterado').toLowerCase();
      const friendlyTitles = {
        product_images: { insert: 'Imagem adicionada', update: 'Imagem atualizada', delete: 'Imagem removida' },
        categories: { insert: 'Categoria criada', update: 'Categoria atualizada', delete: 'Categoria excluída' },
        promotions: { insert: 'Promoção criada', update: 'Promoção atualizada', delete: 'Promoção excluída' },
        store_settings: { insert: 'Configuração criada', update: 'Configuração atualizada', delete: 'Configuração excluída' }
      };
      const title = friendlyTitles[item.entity]?.[actionKey] || `${entity} ${action}`;
      const tone = item.entity === 'product_images' || item.entity === 'banners' ? 'image' : item.action === 'delete' ? 'danger' : 'product';
      return `<li><span class="dashboard-activity-icon ${tone}" aria-hidden="true">${dashboardIcon(item.entity === 'product_images' || item.entity === 'banners' ? 'banner' : item.action === 'delete' ? 'warning' : 'products')}</span><div><b>${esc(title)}</b><small>${esc(item.action)} em ${esc(item.entity)}</small></div><time>${esc(people[item.user_id] || 'Sistema')}<span>${dateTime(item.created_at)}</span></time></li>`;
    }).join('') || '<li class="dashboard-empty-state">Nenhuma alteração registrada.</li>';
    const productRows = (productResult.data || []).map((item, index) => {
      const image = productCover(item);
      const views = Number(item.view_count || 0);
      return `<li><span class="dashboard-rank">${index + 1}</span>${image ? `<img src="${esc(image)}" alt="">` : '<span class="dashboard-product-placeholder" aria-hidden="true">▦</span>'}<div><b>${esc(item.name)}</b><small>SKU: ${esc(item.sku || 'não informado')}</small></div><strong>${views}<small>${views === 1 ? 'visualização' : 'visualizações'}</small></strong></li>`;
    }).join('') || '<li class="dashboard-empty-state">Nenhuma visualização registrada ainda.</li>';
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
    const today = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    $('#content').innerHTML = `<div class="dashboard-overview">
      <div class="dashboard-date"><span aria-hidden="true">${dashboardIcon('calendar')}</span><div><b>${esc(today)}</b><small>Hoje</small></div></div>
      <div class="dashboard-metrics">${metrics.map((item, index) => `<button class="dashboard-stat ${item.tone}" type="button" data-view="${item.view}" aria-label="Abrir ${esc(item.label)}"><span class="dashboard-stat-copy"><small>${esc(item.label)}</small><b>${totals[index].status === 'fulfilled' ? totals[index].value : '—'}</b><em>${esc(item.note)}</em></span><span class="dashboard-stat-icon" aria-hidden="true">${dashboardIcon(item.icon)}</span></button>`).join('')}</div>
      <div class="dashboard-panels">
        <section class="dashboard-panel dashboard-activity"><header><span class="dashboard-panel-icon" aria-hidden="true">${dashboardIcon('clock')}</span><div><h2>Últimas alterações</h2><p>Veja as últimas atividades realizadas no painel.</p></div><button type="button" data-view="audit">Ver todas</button></header><ul>${auditRows}</ul></section>
        <section class="dashboard-panel dashboard-popular"><header><span class="dashboard-panel-icon hot" aria-hidden="true">${dashboardIcon('fire')}</span><div><h2>Produtos mais acessados</h2><p>Os produtos que mais recebem visualizações.</p></div><button type="button" data-view="products">Ver produtos</button></header><ol>${productRows}</ol></section>
      </div>
    </div>`;
    bindNav($('#content'));
  }

  const configs = {
    categories: { table: 'categories', singular: 'Subcategoria', plural: 'subcategorias', bucket: 'categories', fields: [
      ['environment_id', 'Ambiente', 'relation', true, 'environments'], ['name', 'Nome', 'text', true], ['slug', 'URL amigável', 'slug', true], ['description', 'Descrição', 'textarea'], ['search_keywords', 'Palavras relacionadas para busca', 'text'], ['image_url', 'Imagem', 'file'], ['sort_order', 'Ordem', 'number'], ['active', 'Ativa', 'checkbox'], ['show_on_homepage', 'Mostrar na página inicial', 'checkbox'], ['show_in_menu', 'Mostrar no menu de ambientes', 'checkbox'] ] },
    environments: { table: 'environments', singular: 'Ambiente', plural: 'ambientes', bucket: 'environments', fields: [
      ['name', 'Nome', 'text', true], ['slug', 'URL amigável', 'slug', true], ['description', 'Descrição', 'textarea'], ['icon_key', 'Ícone do ambiente', 'select', false, [['', 'Automático pelo nome'], ...CategoryIcons.keys.map(key => [key, key.replaceAll('-', ' ')])]], ['image_url', 'Imagem', 'file'], ['sort_order', 'Ordem', 'number'], ['active', 'Ativo', 'checkbox'] ] },
    brands: { table: 'brands', singular: 'Marca', plural: 'marcas', bucket: 'brands', fields: [
      ['name', 'Nome', 'text', true], ['slug', 'URL amigável', 'slug', true], ['logo_url', 'Logotipo', 'file'], ['active', 'Ativa', 'checkbox'] ] },
    promotions: { table: 'promotions', singular: 'Promoção', plural: 'promoções', bucket: 'banners', fields: [
      ['title', 'Título', 'text', true], ['description', 'Descrição', 'textarea'], ['label', 'Selo da oferta', 'text'],
      ['promotion_type', 'Tipo de desconto', 'select', true, [['display_only', 'Somente exibição'], ['percentage', 'Percentual'], ['fixed', 'Valor fixo']]],
      ['discount_value', 'Valor do desconto', 'number'], ['category_id', 'Categoria vinculada', 'relation', false, 'categories'],
      ['selection_mode', 'Seleção de produtos', 'select', true, [['manual', 'Produtos selecionados'], ['all_category', 'Todos da categoria']]],
      ['auto_include_category', 'Incluir automaticamente os produtos da categoria', 'checkbox'],
      ['start_at', 'Início', 'datetime-local'], ['end_at', 'Término', 'datetime-local'], ['banner_url', 'Imagem', 'file'], ['active', 'Ativa', 'checkbox'] ] },
    coupons: { table: 'coupons', singular: 'Cupom', plural: 'cupons', fields: [
      ['code', 'Código', 'text', true], ['description', 'Descrição', 'textarea'], ['discount_type', 'Tipo', 'select', true, [['percent', 'Percentual'], ['fixed', 'Valor fixo']]], ['discount_value', 'Desconto', 'number', true], ['minimum_order', 'Pedido mínimo', 'number'], ['max_uses', 'Limite de usos', 'number'], ['start_at', 'Início', 'datetime-local'], ['end_at', 'Término', 'datetime-local'], ['active', 'Ativo', 'checkbox'] ] },
    banners: { table: 'banners', singular: 'Banner', plural: 'banners', bucket: 'banners', fields: [
      ['title', 'Título', 'text', true], ['subtitle', 'Subtítulo', 'textarea'], ['image_desktop_url', 'Imagem desktop', 'file'], ['image_mobile_url', 'Imagem mobile', 'file'], ['button_text', 'Texto do botão', 'text'], ['button_url', 'Link do botão', 'text'], ['position', 'Posição', 'select', true, [['home_hero', 'Hero principal'], ['home_middle', 'Faixa intermediária'], ['home_bottom', 'Rodapé da home']]], ['sort_order', 'Ordem', 'number'], ['start_at', 'Início', 'datetime-local'], ['end_at', 'Término', 'datetime-local'], ['active', 'Ativo', 'checkbox'] ] },
    inspirations: { table: 'inspirations', singular: 'Inspiração', plural: 'inspirações', bucket: 'inspirations', fields: [
      ['title', 'Título', 'text', true], ['slug', 'URL amigável', 'slug', true], ['description', 'Descrição', 'textarea'], ['environment_id', 'Ambiente', 'relation', false, 'environments'], ['cover_image', 'Capa', 'file'], ['sort_order', 'Ordem', 'number'], ['meta_title', 'Título SEO', 'text'], ['meta_description', 'Descrição SEO', 'textarea'], ['active', 'Ativa', 'checkbox'], ['gallery', 'Galeria — até 4 fotos', 'multifile'] ] },
    sections: { table: 'site_sections', singular: 'Seção', plural: 'seções', fields: [
      ['section_key', 'Chave', 'text', true], ['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'textarea'], ['content_text', 'Conteúdo JSON', 'textarea'], ['sort_order', 'Ordem', 'number'], ['active', 'Visível', 'checkbox'] ] }
  };
  async function options(table) {
    const { data, error } = await db.from(table).select('id,name').order('name');
    if (error) throw error;
    return data || [];
  }
  async function fieldHtml(field, record = {}) {
    const [key, label, type, required, choices] = field;
    const value = record[key] ?? '';
    if (type === 'checkbox') return `<label class="check-field"><input name="${key}" type="checkbox" ${value ? 'checked' : ''}> ${esc(label)}</label>`;
    if (type === 'textarea') return `<div class="field full"><label for="f-${key}">${esc(label)}</label><textarea id="f-${key}" name="${key}" ${required ? 'required' : ''}>${esc(value)}</textarea></div>`;
    if (type === 'select') return `<div class="field"><label for="f-${key}">${esc(label)}</label><select id="f-${key}" name="${key}">${choices.map(([v, text]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></div>`;
    if (type === 'relation') {
      let rows;
      if (key === 'category_id') {
        const result = await db.from('categories').select('id,name,environment_id,active').order('sort_order').order('name');
        if (result.error) throw result.error;
        rows = (result.data || []).filter(row => row.active !== false);
      } else rows = await options(choices);
      return `<div class="field"><label for="f-${key}">${esc(label)}</label><select id="f-${key}" name="${key}" ${required ? 'required' : ''}><option value="">${required ? 'Selecione' : 'Nenhum'}</option>${rows.map(row => `<option value="${row.id}" ${row.environment_id ? `data-environment-id="${row.environment_id}"` : ''} ${value === row.id ? 'selected' : ''}>${esc(row.name)}</option>`).join('')}</select></div>`;
    }
    if (type === 'file') return `<div class="field"><label for="f-${key}">${esc(label)}</label><input id="f-${key}" name="${key}" type="file" accept="image/jpeg,image/png,image/webp">${value ? `<img class="image-preview" src="${esc(value)}" alt="Imagem atual">` : ''}</div>`;
    if (type === 'multifile') return `<div class="field full"><label for="f-${key}">${esc(label)}</label><input id="f-${key}" name="${key}" type="file" accept="image/jpeg,image/png,image/webp" multiple></div><div id="existingGallery" class="multi-images"></div>`;
    const formatted = type === 'datetime-local' && value ? new Date(value).toISOString().slice(0, 16) : value;
    return `<div class="field"><label for="f-${key}">${esc(label)}</label><input id="f-${key}" name="${key}" type="${type === 'slug' ? 'text' : type}" value="${esc(formatted)}" ${required ? 'required' : ''} ${type === 'number' ? 'step="any"' : ''}></div>`;
  }
  function resetEditorChrome() {
    $('#editorDialog').classList.remove('category-editor-dialog', 'banner-editor-dialog', 'quick-campaign-dialog', 'product-editor-dialog');
    $('#editorForm>header').classList.remove('quick-library-header');
    $('#editorForm>header .quick-library-heading-subtitle')?.remove();
    $('#editorForm>header .quick-library-heading-search')?.remove();
    $('#dialogEyebrow').classList.remove('is-live', 'is-draft');
    $('#editorForm>footer').hidden = false;
    $('#saveDraftCategory').hidden = true;
    $('#viewBannerSite').hidden = true;
    $('#saveEditor').textContent = 'Salvar alterações';
    $('#productUnsavedStatus')?.remove();
    $('#editorForm').oninput = null;
    $('#editorForm').onchange = null;
  }
  function categoryPreviewImage(url) {
    const images = $$('[data-category-live-image]');
    images.forEach(image => {
      image.hidden = !url;
      if (url) image.src = url;
    });
    $$('[data-category-image-placeholder]').forEach(placeholder => { placeholder.hidden = Boolean(url); });
  }
  function syncCategoryPreview() {
    const name = $('[name="name"]')?.value.trim() || 'Nome da categoria';
    const description = $('[name="description"]')?.value.trim() || 'Uma descrição curta ajuda o cliente a entender o que encontrará aqui.';
    const slug = $('[name="slug"]')?.value.trim() || slugify(name) || 'categoria';
    const active = $('[name="active"]')?.checked ?? false;
    $('#categoryPreviewName').textContent = name;
    $('#categoryPreviewDescription').textContent = description;
    $('#categoryAddressText').textContent = `/categoria/${slug}`;
    const iconSelect = $('[name="icon_key"]');
    const environmentName = $('[name="environment_id"]')?.selectedOptions[0]?.textContent || '';
    const iconKey = iconSelect?.value || CategoryIcons.keyFor(name, environmentName);
    const iconPreview = $('#categoryPreviewIcon');
    if (iconPreview) iconPreview.innerHTML = CategoryIcons.icon(iconKey, { size: 28 });
    if (iconSelect && !iconSelect.value) iconSelect.options[0].textContent = 'Automático: ' + iconKey.replaceAll('-', ' ');
    const status = $('#dialogEyebrow');
    status.classList.toggle('is-draft', !active);
    status.classList.toggle('is-live', active);
    status.textContent = active ? '● Publicada no site' : '● Não publicada';
  }
  async function openCategoryEditor(record = null) {
    if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.');
    const [categoryResult, environmentResult, productResult] = await Promise.all([
      db.from('categories').select('id,name,sort_order,environment_id').order('sort_order').order('created_at'),
      db.from('environments').select('id,name,active,sort_order').order('sort_order').order('name'),
      record ? db.from('products').select('id,name,sku,product_images(image_url,is_cover,sort_order)', { count: 'exact' }).eq('category_id', record.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], count: 0 })
    ]);
    if (categoryResult.error) return toast(explain(categoryResult.error));
    if (environmentResult.error) return toast(explain(environmentResult.error));
    if (productResult.error) return toast(explain(productResult.error));
    const categories = categoryResult.data || [];
    const environments = (environmentResult.data || []).filter(item => item.active !== false || String(item.id) === String(record?.environment_id));
    const selectedEnvironmentId = record?.environment_id || environments[0]?.id || '';
    const products = productResult.data || [];
    const orderedWithoutCurrent = categories.filter(item => String(item.id) !== String(record?.id) && String(item.environment_id) === String(selectedEnvironmentId));
    const currentIndex = record ? Math.max(0, categories.findIndex(item => String(item.id) === String(record.id))) : categories.length;
    const totalPositions = Math.max(1, orderedWithoutCurrent.length + 1);
    const positionOptions = Array.from({ length: totalPositions }, (_, index) => {
      const position = index + 1;
      const previous = orderedWithoutCurrent[index - 1];
      const context = position === 1 ? ' — primeira categoria' : previous ? ` — depois de ${previous.name}` : ' — última categoria';
      return `<option value="${position}" ${position === currentIndex + 1 ? 'selected' : ''}>${position}ª posição${esc(context)}</option>`;
    }).join('');
    const imageUrl = record?.image_url || '';
    const productThumbs = products.map(product => {
      const image = [...(product.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || Number(a.sort_order) - Number(b.sort_order))[0]?.image_url;
      return `<li>${image ? `<img src="${esc(image)}" alt="">` : '<span aria-hidden="true">▦</span>'}<div><b>${esc(product.name)}</b><small>${product.sku ? esc(product.sku) : 'SKU não informado'}</small></div></li>`;
    }).join('');
    editorState = { view: 'categories', config: configs.categories, record, saveMode: 'publish', removeImage: false, slugManual: Boolean(record), previewObjectUrl: null };
    $('#editorDialog').classList.add('category-editor-dialog');
    $('#dialogEyebrow').textContent = record?.active ? '● Publicada no site' : '● Não publicada';
    $('#dialogEyebrow').className = record?.active ? 'is-live' : 'is-draft';
    $('#dialogTitle').textContent = record ? `Editar categoria — ${record.name}` : 'Nova categoria';
    $('#saveDraftCategory').hidden = false;
    $('#saveEditor').textContent = 'Salvar e publicar';
    $('#editorFields').innerHTML = `<div class="category-editor-layout">
      <section class="category-editor-section category-info-section">
        <header><span>1</span><div><h3>Informações da categoria</h3><p>Conte aos clientes o que eles encontram nesta seção.</p></div></header>
        <div class="category-editor-fields"><label>Ambiente<select name="environment_id" required><option value="">Selecione</option>${environments.map(environment => `<option value="${environment.id}" ${String(environment.id) === String(selectedEnvironmentId) ? 'selected' : ''}>${esc(environment.name)}</option>`).join('')}</select></label><label>Nome da subcategoria<input name="name" type="text" required value="${esc(record?.name || '')}" placeholder="Ex.: Sofá"></label><label>Descrição<textarea name="description" placeholder="Apresente a subcategoria em poucas palavras.">${esc(record?.description || '')}</textarea></label><label>Palavras relacionadas para busca<input name="search_keywords" type="text" value="${esc(record?.search_keywords || '')}" placeholder="Ex.: sofá retrátil, estofado, 3 lugares"></label><label>Ícone da subcategoria<select name="icon_key"><option value="">Automático pelo nome</option>${CategoryIcons.keys.map(key => `<option value="${key}" ${record?.icon_key === key ? 'selected' : ''}>${esc(key.replaceAll('-', ' '))}</option>`).join('')}</select><small>O ícone é sugerido automaticamente; altere aqui se precisar.</small></label></div>
        <div class="category-address"><span>Endereço da página</span><code id="categoryAddressText">/categoria/${esc(record?.slug || 'categoria')}</code><button id="editCategorySlug" type="button">Editar endereço</button></div>
        <label class="category-slug-editor" id="categorySlugEditor" hidden>Final do endereço<input name="slug" type="text" required value="${esc(record?.slug || '')}" placeholder="sala"><small>Use letras, números e hífens.</small></label>
      </section>
      <section class="category-editor-section category-image-section">
        <header><span>2</span><div><h3>Imagem da categoria</h3><p>Usada no card da página inicial e nas áreas de navegação da loja.</p></div></header>
        <div class="category-image-workspace"><div class="category-image-frame">${imageUrl ? `<img data-category-live-image src="${esc(imageUrl)}" alt="Imagem atual da categoria">` : '<img data-category-live-image alt="Prévia da categoria" hidden>'}<div data-category-image-placeholder ${imageUrl ? 'hidden' : ''}><b>▧</b><span>Adicione uma imagem horizontal</span><small>Recomendado: 1200 × 800 px</small></div></div><div class="category-image-actions"><input id="categoryImageInput" name="image_url" type="file" accept="image/jpeg,image/png,image/webp" hidden><button id="changeCategoryImage" type="button">Trocar imagem</button><button id="viewCategoryImage" class="secondary" type="button" ${imageUrl ? '' : 'disabled'}>Visualizar</button><button id="removeCategoryImage" class="danger" type="button" ${imageUrl ? '' : 'disabled'}>Remover</button></div></div>
      </section>
      <aside class="category-live-preview">
        <div class="category-preview-heading"><span>PRÉVIA NO SITE</span><b>Atualização em tempo real</b></div>
        <div class="category-site-card"><div class="category-site-image">${imageUrl ? `<img data-category-live-image src="${esc(imageUrl)}" alt="">` : '<img data-category-live-image alt="" hidden>'}<div data-category-image-placeholder ${imageUrl ? 'hidden' : ''}>Sua imagem aparecerá aqui</div></div><div class="category-site-card-footer"><span id="categoryPreviewIcon" aria-hidden="true">${CategoryIcons.icon(record?.icon_key||record?.name||'sofa',{size:28})}</span><div><strong id="categoryPreviewName">${esc(record?.name || 'Nome da categoria')}</strong><small id="categoryPreviewDescription">${esc(record?.description || 'Uma descrição curta ajuda o cliente a entender o que encontrará aqui.')}</small></div><i aria-hidden="true">→</i></div></div>
        <p>Esta é uma representação fiel do card usado na loja. O enquadramento pode variar levemente conforme a tela.</p>
      </aside>
      <section class="category-editor-section category-position-section">
        <header><span>3</span><div><h3>Posição no ambiente</h3><p>Define em qual posição esta subcategoria aparece dentro do ambiente.</p></div></header>
        <label class="category-position-control">Posição da subcategoria<select name="position_index">${positionOptions}</select></label><small class="category-drag-note">💡 Você também pode arrastar os cards na página de subcategorias para reorganizar.</small>
      </section>
      <section class="category-editor-section category-visibility-section">
        <header><span>4</span><div><h3>Exibição</h3><p>Escolha onde esta categoria ficará disponível.</p></div></header>
        <div class="category-switch-list"><label><span><b>Subcategoria ativa</b><small>Permite publicar esta subcategoria para os clientes.</small></span><input name="active" type="checkbox" ${record?.active !== false ? 'checked' : ''}><i></i></label><label><span><b>Mostrar na página inicial</b><small>Disponibiliza esta classificação para destaques da home.</small></span><input name="show_on_homepage" type="checkbox" ${record?.show_on_homepage !== false ? 'checked' : ''}><i></i></label><label><span><b>Mostrar no menu do ambiente</b><small>Inclui esta opção no mega menu e no painel mobile.</small></span><input name="show_in_menu" type="checkbox" ${record?.show_in_menu !== false ? 'checked' : ''}><i></i></label></div>
      </section>
      <section class="category-editor-section category-products-section">
        <header><span>5</span><div><h3>Produtos desta categoria</h3><p><b>${productResult.count || 0}</b> produto${productResult.count === 1 ? '' : 's'} cadastrado${productResult.count === 1 ? '' : 's'}.</p></div></header>
        ${record ? `<ul class="category-product-thumbs">${productThumbs || '<li class="is-empty">Nenhum produto vinculado a esta categoria.</li>'}</ul><div class="category-product-actions"><button id="viewCategoryProducts" type="button" class="secondary">Ver todos os produtos</button><button id="addCategoryProduct" type="button">+ Adicionar produto</button></div>` : '<div class="category-products-empty">Salve a categoria para começar a adicionar produtos.</div>'}
      </section>
      ${record ? `<section class="category-danger-zone"><div><b>Excluir categoria</b><p>Os produtos não serão excluídos, mas ficarão sem categoria.</p></div><button id="deleteCategoryFromEditor" class="danger" type="button">Excluir categoria</button></section>` : ''}
    </div>`;
    const nameInput = $('[name="name"]');
    const slugInput = $('[name="slug"]');
    nameInput.addEventListener('input', () => {
      if (!editorState.slugManual) slugInput.value = slugify(nameInput.value);
      syncCategoryPreview();
      $('#dialogTitle').textContent = record ? `Editar categoria — ${nameInput.value.trim() || record.name}` : (nameInput.value.trim() ? `Nova categoria — ${nameInput.value.trim()}` : 'Nova categoria');
    });
    $('[name="description"]').addEventListener('input', syncCategoryPreview);
    $('[name="environment_id"]').addEventListener('change', syncCategoryPreview);
    $('[name="icon_key"]').addEventListener('change', syncCategoryPreview);
    syncCategoryPreview();
    $('[name="active"]').addEventListener('change', syncCategoryPreview);
    $('#editCategorySlug').onclick = () => { editorState.slugManual = true; $('#categorySlugEditor').hidden = false; slugInput.focus(); };
    slugInput.addEventListener('input', () => { editorState.slugManual = true; slugInput.value = slugify(slugInput.value); syncCategoryPreview(); });
    $('#changeCategoryImage').onclick = () => $('#categoryImageInput').click();
    $('#categoryImageInput').onchange = () => {
      const file = $('#categoryImageInput').files?.[0];
      if (!file) return;
      if (editorState.previewObjectUrl) URL.revokeObjectURL(editorState.previewObjectUrl);
      editorState.previewObjectUrl = URL.createObjectURL(file);
      editorState.removeImage = false;
      categoryPreviewImage(editorState.previewObjectUrl);
      $('#viewCategoryImage').disabled = false;
      $('#removeCategoryImage').disabled = false;
    };
    $('#viewCategoryImage').onclick = () => {
      const url = editorState.previewObjectUrl || (editorState.removeImage ? '' : imageUrl);
      if (url) window.open(url, '_blank', 'noopener');
    };
    $('#removeCategoryImage').onclick = () => {
      $('#categoryImageInput').value = '';
      editorState.removeImage = true;
      categoryPreviewImage('');
      $('#viewCategoryImage').disabled = true;
      $('#removeCategoryImage').disabled = true;
    };
    $('#saveDraftCategory').onclick = () => { editorState.saveMode = 'draft'; $('#editorForm').requestSubmit(); };
    $('#viewCategoryProducts')?.addEventListener('click', () => { productViewState.category = record.name; $('#editorDialog').close(); render('products'); });
    $('#addCategoryProduct')?.addEventListener('click', async () => { $('#editorDialog').close(); await productEditor(); $('[name="category_id"]').value = record.id; });
    $('#deleteCategoryFromEditor')?.addEventListener('click', event => runAction(event.currentTarget, async () => {
      if (!await deleteCategorySafely(record)) return;
      $('#editorDialog').close();
      render('categories');
    }));
    syncCategoryPreview();
    $('#editorDialog').showModal();
  }
  const QUICK_CAMPAIGN_PRESETS = {
    month: { icon: '🎉', label: 'Promoção do mês', group: 'promotions', imageIndex: 0, campaignType: 'promotion', titles: ['Renove Sua Casa', 'O Mês Inteiro com Ofertas', 'Condições Especiais do Mês', 'Ofertas para Renovar Sua Casa', 'Seu Mês com Preço Baixo'], subtitles: ['com qualidade e economia', 'Ofertas escolhidas para você', 'Aproveite nossas condições do mês', 'Móveis e eletros com condições especiais'], ctas: ['Ver ofertas', 'Conferir ofertas', 'Aproveitar', 'Comprar agora'], rule: 'promotional', visual: 'offer', theme: 'brand', duration: 'month' },
    super_offer: { icon: '🚀', label: 'Super Oferta', group: 'promotions', imageIndex: 0, campaignType: 'promotion', titles: ['Super Oferta Atacarejo', 'Preço de Verdade é Aqui', 'A Oferta que Faltava', 'Renove Pagando Menos', 'Super Condição para sua Casa'], subtitles: ['Produtos selecionados com condições imperdíveis', 'Economia para transformar sua casa hoje', 'Escolhas especiais com preço de atacarejo'], ctas: ['Quero aproveitar', 'Ver super ofertas', 'Conferir agora'], rule: 'promotional', visual: 'offer', theme: 'yellow', duration: '7days' },
    special_week: { icon: '🗓️', label: 'Semana especial', group: 'promotions', imageIndex: 10, campaignType: 'promotion', titles: ['Semana Especial Atacarejo', 'Uma Semana para Renovar', 'Sete Dias de Oportunidades', 'Semana da Casa Nova', 'Condições Especiais da Semana'], subtitles: ['Ofertas selecionadas durante toda a semana', 'Cada ambiente com uma oportunidade diferente', 'Aproveite antes do fim da semana'], ctas: ['Ver a seleção', 'Aproveitar a semana', 'Conferir ofertas'], rule: 'promotional', visual: 'duo', theme: 'brand', duration: '7days' },
    complete: { icon: '🏠', label: 'Casa completa', group: 'rooms', imageIndex: 5, campaignType: 'custom', titles: ['Sua Casa Completa', 'Transforme Cada Ambiente', 'Sua Casa Merece Mais', 'Tudo que Seu Lar Precisa', 'Renove sua Casa com Estilo'], subtitles: ['Sala, quarto, cozinha e muito mais', 'Móveis para todos os momentos', 'Conforto e qualidade para sua casa', 'Encontre tudo em um só lugar'], ctas: ['Explorar ambientes', 'Ver produtos', 'Conhecer coleção', 'Comprar agora'], rule: 'all', visual: 'classic', theme: 'premium', duration: '15days' },
    living: { icon: '🛋️', label: 'Sala', group: 'rooms', imageIndex: 1, campaignType: 'category', category: /^sala$/i, titles: ['Sua Sala Mais Aconchegante', 'Renove sua Sala', 'Conforto para Receber Bem', 'Sala Completa do Seu Jeito', 'Estilo que Abraça'], subtitles: ['Sofás, racks, painéis e poltronas para você', 'Conforto e design para todos os momentos', 'Escolhas especiais para o coração da casa'], ctas: ['Ver sala', 'Explorar produtos', 'Renovar agora'], rule: 'all', visual: 'classic', theme: 'brand', duration: '15days' },
    bedrooms: { icon: '🛏️', label: 'Quarto', group: 'rooms', imageIndex: 2, campaignType: 'category', category: /quarto|colch/i, titles: ['Quartos com Estilo', 'Seu Quarto Renovado', 'Conforto para Descansar', 'Um Quarto para Sonhar', 'Seu Refúgio Mais Bonito'], subtitles: ['Camas, guarda-roupas e cômodas para transformar', 'Seu descanso merece o melhor', 'Conforto e organização no mesmo ambiente'], ctas: ['Ver quartos', 'Conhecer produtos', 'Renovar agora'], rule: 'all', visual: 'elegant', theme: 'premium', duration: '15days' },
    mattresses: { icon: '☁️', label: 'Colchões', group: 'rooms', imageIndex: 2, campaignType: 'category', category: /colch[aã]o|cama box/i, product: /colch[aã]o|cama box/i, titles: ['Seu Melhor Descanso Começa Aqui', 'Noites Melhores, Dias Mais Leves', 'Conforto para Dormir Bem', 'Escolha o Colchão Ideal', 'Seu Sono Merece Mais'], subtitles: ['Colchões e camas para todos os jeitos de descansar', 'Conforto e suporte para uma noite completa', 'Encontre a medida e o conforto ideais'], ctas: ['Ver colchões', 'Escolher meu colchão', 'Conhecer opções'], rule: 'all', visual: 'minimal', theme: 'clean', duration: '15days' },
    kitchen: { icon: '🍳', label: 'Cozinha', group: 'rooms', imageIndex: 3, campaignType: 'category', category: /cozinha|jantar/i, titles: ['Uma Cozinha para Viver Melhor', 'Cozinha Prática e Bonita', 'Seu Sabor, Seu Espaço', 'Renove o Coração da Casa', 'Tudo para sua Cozinha'], subtitles: ['Armários, mesas e soluções para o dia a dia', 'Organização e estilo para todos os momentos', 'Escolhas que deixam sua rotina mais gostosa'], ctas: ['Ver cozinha', 'Explorar produtos', 'Conhecer coleção'], rule: 'all', visual: 'elegant', theme: 'clean', duration: '15days' },
    appliances: { icon: '🔌', label: 'Eletrodomésticos', group: 'products', imageIndex: 4, campaignType: 'category', category: /eletro/i, titles: ['Tecnologia para sua Casa', 'Eletros que Facilitam sua Vida', 'Sua Casa Mais Completa', 'Praticidade Todo Dia', 'Eletros em Destaque'], subtitles: ['Geladeiras, fogões, lavadoras e muito mais', 'Tecnologia, economia e praticidade', 'Escolhas inteligentes para sua rotina'], ctas: ['Ver eletros', 'Conferir produtos', 'Comprar agora'], rule: 'all', visual: 'product', theme: 'brand', duration: '15days' },
    liquidation: { icon: '💥', label: 'Liquidação', group: 'promotions', imageIndex: 6, campaignType: 'clearance', titles: ['Liquidação', 'Preços Despencaram', 'Descontos de Verdade', 'É Hora de Economizar', 'Liquida Atacarejo'], subtitles: ['Preços especiais em produtos selecionados', 'Aproveite enquanto durarem os estoques', 'Sua casa renovada pagando menos'], ctas: ['Aproveitar agora', 'Ver descontos', 'Comprar'], rule: 'promotional', visual: 'clearance', theme: 'yellow', duration: '7days' },
    news: { icon: '✨', label: 'Novidades', group: 'products', imageIndex: 7, campaignType: 'new_arrivals', titles: ['Novidades na Loja', 'Acabou de Chegar', 'Novos Jeitos de Renovar', 'Lançamentos para sua Casa', 'Conheça o que Há de Novo'], subtitles: ['Conheça os últimos lançamentos', 'Novidades escolhidas para sua casa', 'Design novo para transformar ambientes'], ctas: ['Ver novidades', 'Conhecer produtos', 'Conferir'], rule: 'new', visual: 'minimal', theme: 'clean', duration: '15days' },
    best: { icon: '⭐', label: 'Mais vendidos', group: 'products', imageIndex: 8, campaignType: 'best_sellers', titles: ['Os Mais Vendidos', 'Favoritos dos Clientes', 'Sucesso na Sua Casa', 'Escolhas que Todo Mundo Ama', 'Campeões de Venda'], subtitles: ['Os produtos que todo mundo está escolhendo', 'Seleção campeã de vendas', 'Escolhas aprovadas pelos nossos clientes'], ctas: ['Ver mais vendidos', 'Conferir', 'Comprar agora'], rule: 'best', visual: 'classic', theme: 'brand', duration: 'always' },
    flash: { icon: '⚡', label: 'Oferta relâmpago', group: 'promotions', imageIndex: 9, campaignType: 'promotion', titles: ['Oferta Relâmpago', 'Só por Pouco Tempo', 'Corre que Está Acabando', 'Preço Baixo Agora', 'Últimas Horas'], subtitles: ['Por tempo limitado', 'Preços que você não pode perder', 'Aproveite antes que termine'], ctas: ['Aproveitar agora', 'Ver ofertas', 'Comprar agora'], rule: 'promotional', visual: 'offer', theme: 'yellow', duration: 'today', countdown: true },
    weekend: { icon: '📅', label: 'Fim de semana', group: 'promotions', imageIndex: 10, campaignType: 'promotion', titles: ['Ofertas de Fim de Semana', 'Só Neste Fim de Semana', 'Sábado e Domingo com Preço Baixo', 'Festival de Fim de Semana', 'Aproveite até Domingo'], subtitles: ['Condições especiais por poucos dias', 'Seu fim de semana começa com economia', 'Aproveite antes de segunda-feira'], ctas: ['Ver ofertas', 'Aproveitar agora', 'Conferir'], rule: 'promotional', visual: 'offer', theme: 'yellow', duration: 'weekend' },
    stock_clearance: { icon: '📦', label: 'Queima de estoque', group: 'promotions', imageIndex: 11, campaignType: 'clearance', titles: ['Queima de Estoque', 'Última Chance', 'Preços para Liberar Espaço', 'Tudo Tem que Sair', 'Estoque Final'], subtitles: ['Últimas unidades', 'Aproveite antes que termine', 'Produtos selecionados com preços especiais'], ctas: ['Aproveitar', 'Ver ofertas', 'Comprar agora'], rule: 'low', visual: 'clearance', theme: 'yellow', duration: '7days' },
    installment: { icon: '💳', label: 'Parcelamento', group: 'institutional', imageIndex: 12, campaignType: 'institutional', titles: ['Sua Casa Nova Cabe no Bolso', 'Parcele sem Complicar', 'Condições que Facilitam', 'Compre Hoje, Pague aos Poucos', 'Facilidade para Renovar'], subtitles: ['Escolha seus móveis e parcele com tranquilidade', 'Condições especiais para realizar seus planos', 'Mais conforto com parcelas que cabem no bolso'], ctas: ['Ver condições', 'Escolher produtos', 'Comprar agora'], rule: 'all', visual: 'minimal', theme: 'brand', duration: 'always' },
    delivery: { icon: '🚚', label: 'Frete / entrega', group: 'institutional', imageIndex: 13, campaignType: 'institutional', titles: ['Da Nossa Loja para sua Casa', 'Entrega Fácil e Segura', 'Seu Móvel Chega até Você', 'Comprar Ficou Mais Fácil', 'A Gente Leva o Conforto'], subtitles: ['Compre com praticidade e receba em casa', 'Cuidado em cada etapa da entrega', 'Facilidade do pedido à sua porta'], ctas: ['Saiba mais', 'Ver produtos', 'Comprar agora'], rule: 'all', visual: 'minimal', theme: 'blue', duration: 'always' },
    back_school: { icon: '📚', label: 'Volta às aulas', group: 'dates', imageIndex: 14, campaignType: 'category', category: /escrit[oó]rio|organiza/i, titles: ['Volta às Aulas com Tudo', 'Seu Espaço de Estudos Renovado', 'Foco, Conforto e Organização', 'Estudar Ficou Mais Gostoso', 'Prepare seu Cantinho'], subtitles: ['Escrivaninhas, cadeiras e organização', 'Tudo para uma rotina mais produtiva', 'Conforto para estudar todos os dias'], ctas: ['Ver seleção', 'Montar meu espaço', 'Conferir'], rule: 'all', visual: 'product', theme: 'brand', duration: 'month' },
    mothers: { icon: '💐', label: 'Dia das Mães', group: 'dates', imageIndex: 15, campaignType: 'promotion', titles: ['Um Presente para Todos os Momentos', 'Casa de Mãe Tem Mais Amor', 'Dia das Mães Especial', 'Conforto para Quem Cuida', 'Presenteie com Carinho'], subtitles: ['Escolhas especiais para deixar a casa ainda mais acolhedora', 'Celebre com conforto, beleza e carinho', 'Presentes que fazem parte da vida'], ctas: ['Ver presentes', 'Conhecer seleção', 'Comprar agora'], rule: 'promotional', visual: 'elegant', theme: 'clean', duration: '15days' },
    fathers: { icon: '👔', label: 'Dia dos Pais', group: 'dates', imageIndex: 16, campaignType: 'promotion', titles: ['O Cantinho que Ele Merece', 'Dia dos Pais com Mais Conforto', 'Presente para Curtir em Casa', 'Para o Pai de Todos os Momentos', 'Conforto é um Grande Presente'], subtitles: ['Poltronas, escritórios e escolhas para relaxar', 'Um presente para aproveitar todos os dias', 'Celebre com estilo e conforto'], ctas: ['Ver presentes', 'Conhecer seleção', 'Comprar agora'], rule: 'promotional', visual: 'elegant', theme: 'premium', duration: '15days' },
    black_friday: { icon: '🏷️', label: 'Black Friday', group: 'dates', imageIndex: 17, campaignType: 'clearance', titles: ['Black Friday Atacarejo', 'O Menor Preço do Ano', 'Descontos que Impressionam', 'Black de Verdade', 'É Agora ou Nunca'], subtitles: ['Ofertas especiais por tempo limitado', 'Prepare-se para renovar pagando menos', 'Os preços mais esperados chegaram'], ctas: ['Ver ofertas', 'Aproveitar agora', 'Comprar'], rule: 'promotional', visual: 'clearance', theme: 'premium', duration: 'weekend', countdown: true },
    christmas: { icon: '🎄', label: 'Natal', group: 'dates', imageIndex: 18, campaignType: 'promotion', titles: ['Natal para Viver Juntos', 'Sua Casa Pronta para Celebrar', 'Um Lar Cheio de Momentos', 'Conforto para Reunir Quem Importa', 'Presentes para sua Casa'], subtitles: ['Renove os ambientes para celebrar em família', 'Escolhas especiais para um Natal inesquecível', 'Mais beleza, conforto e união'], ctas: ['Ver especial de Natal', 'Conhecer seleção', 'Comprar agora'], rule: 'promotional', visual: 'elegant', theme: 'premium', duration: 'month' },
    new_year: { icon: '🥂', label: 'Ano novo', group: 'dates', imageIndex: 19, campaignType: 'promotion', titles: ['Casa Nova para um Novo Ano', 'Comece o Ano Renovando', 'Novos Ambientes, Novos Momentos', 'Seu Ano Começa em Casa', 'Renove para Recomeçar'], subtitles: ['Transforme os ambientes e comece uma nova fase', 'Mais conforto para todos os planos do ano', 'Escolhas novas para viver melhor'], ctas: ['Começar renovação', 'Ver produtos', 'Conhecer coleção'], rule: 'promotional', visual: 'minimal', theme: 'clean', duration: 'month' },
    summer: { icon: '☀️', label: 'Verão', group: 'dates', imageIndex: 20, campaignType: 'promotion', titles: ['Verão Leve, Casa Renovada', 'Mais Frescor para seus Ambientes', 'A Estação de Viver Bem', 'Casa Pronta para o Verão', 'Leveza em Cada Detalhe'], subtitles: ['Cores, conforto e praticidade para a estação', 'Renove com escolhas leves e funcionais', 'Sua casa mais gostosa para aproveitar o verão'], ctas: ['Ver coleção', 'Explorar produtos', 'Renovar agora'], rule: 'all', visual: 'minimal', theme: 'clean', duration: 'month' },
    comfort: { icon: '🧡', label: 'Conforto para sua casa', group: 'institutional', imageIndex: 21, campaignType: 'institutional', titles: ['Conforto para Todos os Momentos', 'Sua Casa, Seu Lugar Favorito', 'Bem-Estar Mora Aqui', 'Mais Aconchego Todo Dia', 'Conforto que Faz Diferença'], subtitles: ['Móveis escolhidos para viver melhor', 'Ambientes acolhedores para sua rotina', 'Seu lar merece esse cuidado'], ctas: ['Inspirar-se', 'Ver produtos', 'Conhecer coleção'], rule: 'all', visual: 'elegant', theme: 'brand', duration: 'always' },
    renew: { icon: '🪄', label: 'Renove sua casa', group: 'institutional', imageIndex: 22, campaignType: 'institutional', titles: ['Renove sua Casa com Estilo', 'Um Novo Olhar para seus Ambientes', 'Transforme sem Complicar', 'Sua Casa em uma Nova Fase', 'Mudar Faz Bem'], subtitles: ['Escolhas para transformar cada espaço', 'Design, conforto e praticidade para renovar', 'Comece hoje a casa que você imagina'], ctas: ['Começar agora', 'Ver ambientes', 'Explorar produtos'], rule: 'all', visual: 'classic', theme: 'brand', duration: 'always' },
    full_environment: { icon: '🪟', label: 'Ambiente completo', group: 'rooms', imageIndex: 23, campaignType: 'category', titles: ['Um Ambiente Completo para Você', 'Tudo Combina, Tudo Acolhe', 'Seu Espaço Pronto para Viver', 'Composição Completa', 'Um Novo Ambiente em Poucos Cliques'], subtitles: ['Móveis que conversam entre si', 'Uma seleção pronta para transformar seu espaço', 'Harmonia, conforto e praticidade'], ctas: ['Ver composição', 'Conhecer produtos', 'Montar ambiente'], rule: 'all', visual: 'classic', theme: 'premium', duration: '15days' },
    product_spotlight: { icon: '🎯', label: 'Produto em destaque', group: 'products', imageIndex: 24, campaignType: 'products', titles: ['Destaque da Semana', 'Uma Escolha que Vale a Pena', 'Produto em Evidência', 'Feito para sua Casa', 'Conheça este Destaque'], subtitles: ['Qualidade, conforto e condição especial', 'Um produto escolhido para transformar seu ambiente', 'Confira todos os detalhes'], ctas: ['Ver produto', 'Conhecer detalhes', 'Comprar agora'], rule: 'single', visual: 'product', theme: 'brand', duration: '7days' }
  };
  const QUICK_LAYOUTS = [
    { id: 'split-right', name: 'Imagem à direita', visual: 'classic', theme: 'brand' },
    { id: 'split-left', name: 'Imagem à esquerda', visual: 'reverse', theme: 'blue' },
    { id: 'full-overlay', name: 'Foto em tela cheia', visual: 'overlay', theme: 'brand' },
    { id: 'product-cutout', name: 'Produto em destaque', visual: 'product', theme: 'yellow' },
    { id: 'floating-card', name: 'Card flutuante', visual: 'elegant', theme: 'premium' },
    { id: 'dual-scene', name: 'Dois ambientes', visual: 'duo', theme: 'brand' },
    { id: 'centered-product', name: 'Produto central', visual: 'centered', theme: 'blue' },
    { id: 'premium-minimal', name: 'Premium minimalista', visual: 'minimal', theme: 'clean' },
    { id: 'discount-impact', name: 'Desconto em destaque', visual: 'clearance', theme: 'yellow' },
    { id: 'environment-carousel', name: 'Carrossel de ambientes', visual: 'carousel', theme: 'premium' },
    { id: 'catalog-offer', name: 'Catálogo de ofertas', visual: 'catalog', theme: 'brand' },
    { id: 'price-stage', name: 'Produto + preço gigante', visual: 'price', theme: 'yellow' }
  ];
  const QUICK_VARIATION_MAP = {
    month: ['split-right','full-overlay','product-cutout','floating-card','catalog-offer'],
    super_offer: ['discount-impact','price-stage','centered-product','catalog-offer','full-overlay'],
    special_week: ['dual-scene','environment-carousel','catalog-offer','split-right','floating-card'],
    complete: ['catalog-offer','dual-scene','full-overlay','floating-card','environment-carousel'],
    living: ['split-right','product-cutout','full-overlay','floating-card','catalog-offer'],
    bedrooms: ['split-left','full-overlay','floating-card','premium-minimal','catalog-offer'],
    mattresses: ['premium-minimal','floating-card','centered-product','split-left','full-overlay'],
    kitchen: ['floating-card','split-right','full-overlay','dual-scene','catalog-offer'],
    appliances: ['product-cutout','centered-product','price-stage','catalog-offer','full-overlay'],
    liquidation: ['discount-impact','price-stage','product-cutout','catalog-offer','full-overlay'],
    news: ['premium-minimal','split-right','floating-card','centered-product','catalog-offer'],
    best: ['centered-product','catalog-offer','product-cutout','full-overlay','split-left'],
    flash: ['price-stage','discount-impact','product-cutout','full-overlay','catalog-offer'],
    weekend: ['catalog-offer','full-overlay','dual-scene','split-right','floating-card'],
    stock_clearance: ['discount-impact','product-cutout','price-stage','catalog-offer','full-overlay'],
    installment: ['centered-product','split-right','catalog-offer','floating-card','premium-minimal'],
    delivery: ['split-left','full-overlay','floating-card','dual-scene','catalog-offer'],
    back_school: ['catalog-offer','split-right','product-cutout','full-overlay','centered-product'],
    mothers: ['floating-card','full-overlay','split-right','premium-minimal','catalog-offer'],
    fathers: ['product-cutout','floating-card','full-overlay','catalog-offer','split-left'],
    black_friday: ['discount-impact','price-stage','product-cutout','catalog-offer','full-overlay'],
    christmas: ['full-overlay','floating-card','catalog-offer','dual-scene','premium-minimal'],
    new_year: ['premium-minimal','full-overlay','split-right','floating-card','catalog-offer'],
    summer: ['split-left','full-overlay','catalog-offer','floating-card','premium-minimal'],
    comfort: ['full-overlay','floating-card','split-right','dual-scene','premium-minimal'],
    renew: ['split-right','full-overlay','product-cutout','catalog-offer','floating-card'],
    full_environment: ['dual-scene','environment-carousel','full-overlay','catalog-offer','floating-card'],
    product_spotlight: ['price-stage','centered-product','product-cutout','full-overlay','catalog-offer']
  };
  const QUICK_TEMPLATE_IMAGES = {
    month: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1600&q=82',
    super_offer: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=82',
    special_week: 'https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0c?auto=format&fit=crop&w=1600&q=82',
    complete: 'assets/editorial-room-clean.png?v=caption-removed-1',
    living: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=82',
    bedrooms: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=82',
    mattresses: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=82',
    kitchen: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1600&q=82',
    appliances: 'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=1600&q=82',
    liquidation: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=82',
    news: 'https://images.unsplash.com/photo-1713810958247-01dbd76b4a61?auto=format&fit=crop&w=1600&q=82',
    best: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1600&q=82',
    flash: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1600&q=82',
    weekend: 'https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0c?auto=format&fit=crop&w=1600&q=82',
    stock_clearance: 'https://images.unsplash.com/photo-1628152371231-936cf45eb8f3?auto=format&fit=crop&w=1600&q=82',
    installment: 'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1600&q=82',
    delivery: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=82',
    back_school: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=82',
    mothers: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1600&q=82',
    fathers: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=82',
    black_friday: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=82',
    christmas: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82',
    new_year: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1600&q=82',
    summer: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=82',
    comfort: 'https://images.unsplash.com/photo-1600585154526-990dced4db0c?auto=format&fit=crop&w=1600&q=82',
    renew: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=82',
    full_environment: 'assets/editorial-room-clean.png?v=caption-removed-1',
    product_spotlight: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1600&q=82'
  };
  const QUICK_VISUALS = QUICK_LAYOUTS.map(item => [item.visual, item.name]);
  const QUICK_THEMES = [['brand','Azul + amarelo da marca'],['blue','Azul'],['yellow','Amarelo promocional'],['clean','Branco clean'],['premium','Escuro premium']];
  const QUICK_DURATIONS = [['today','Somente hoje'],['tomorrow','Até amanhã'],['weekend','Este fim de semana'],['3days','3 dias'],['7days','7 dias'],['15days','15 dias'],['month','Até o fim do mês'],['always','Sempre'],['custom','Escolher data']];
  const QUICK_GROUPS = [['all','Todos'],['promotions','Promoções'],['rooms','Ambientes'],['products','Produtos'],['dates','Datas especiais'],['institutional','Institucional']];
  const QUICK_FAVORITES_KEY = 'movel-banner-template-favorites';
  const QUICK_RECENTS_KEY = 'movel-banner-template-recents';

  function quickStoredList(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function quickSaveList(key, values) { localStorage.setItem(key, JSON.stringify(values)); }
  function quickVariationsForPreset(presetKey, limit = 5) {
    const layoutIds = QUICK_VARIATION_MAP[presetKey] || QUICK_LAYOUTS.slice(0, 5).map(item => item.id);
    return layoutIds.slice(0, limit).map((layoutId, index) => ({ ...(QUICK_LAYOUTS.find(item => item.id === layoutId) || QUICK_LAYOUTS[index]), number: index + 1 }));
  }
  function quickLayoutForState(state) {
    return QUICK_LAYOUTS.find(item => item.id === state.layout) || quickVariationsForPreset(state.presetKey)[0];
  }
  function quickRememberTemplate(presetKey) {
    const recent = quickStoredList(QUICK_RECENTS_KEY).filter(item => item !== presetKey);
    quickSaveList(QUICK_RECENTS_KEY, [presetKey, ...recent].slice(0, 10));
  }

  function quickMetaValue(record, prefix) {
    const entry = (record?.display_locations || []).find(item => String(item).startsWith(`${prefix}:`));
    if (entry) return entry.slice(prefix.length + 1);
    const parameter = ({ preset: 'campaign_template', layout: 'campaign_layout', style: 'campaign_style', theme: 'campaign_theme', image: 'campaign_image', rule: 'campaign_rule', duration: 'campaign_duration', end: 'campaign_end', countdown: 'campaign_countdown' })[prefix];
    if (!parameter || !record?.button_url) return '';
    try { return new URL(record.button_url, location.href).searchParams.get(parameter) || ''; }
    catch { return ''; }
  }
  function quickPresetForRecord(record) {
    const saved = quickMetaValue(record, 'preset');
    if (saved && QUICK_CAMPAIGN_PRESETS[saved]) return saved;
    const map = { best_sellers: 'best', new_arrivals: 'news', clearance: 'liquidation', promotion: 'flash', products: 'product_spotlight' };
    return map[record?.campaign_type] || (record?.category_id ? 'living' : 'complete');
  }
  function quickDurationRange(key) {
    const now = new Date();
    const end = new Date(now);
    if (key === 'always') return { startAt: null, endAt: null };
    if (key === 'today') end.setHours(23, 59, 59, 999);
    if (key === 'tomorrow') { end.setDate(end.getDate() + 1); end.setHours(23, 59, 59, 999); }
    if (key === 'weekend') { const days = (7 - end.getDay()) % 7; end.setDate(end.getDate() + days); end.setHours(23, 59, 59, 999); }
    if (key === '3days') end.setDate(end.getDate() + 3);
    if (key === '7days') end.setDate(end.getDate() + 7);
    if (key === '15days') end.setDate(end.getDate() + 15);
    if (key === 'month') { end.setMonth(end.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); }
    return { startAt: now.toISOString(), endAt: end.toISOString() };
  }
  function quickCategoryForPreset(state) {
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    if (state.categoryId) return state.categories.find(item => String(item.id) === String(state.categoryId)) || null;
    if (state.productRule === 'promotion') return null;
    return preset.category ? state.categories.find(item => preset.category.test(item.name)) || null : null;
  }
  function quickEligibleProducts(state) {
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    if (state.productRule === 'promotion') {
      const selected = state.promotions.find(item => String(item.id) === String(state.selectedPromotionId));
      if (!selected) return [];
      const linked = new Set((selected.promotion_products || []).map(item => String(item.product_id)));
      return state.products.filter(item => item.active !== false && (linked.has(String(item.id)) || (selected.auto_include_category && selected.category_id && String(item.category_id) === String(selected.category_id))));
    }
    const category = quickCategoryForPreset(state);
    const base = state.products.filter(item => item.active !== false && (!category || String(item.category_id) === String(category.id)) && (!preset.product || preset.product.test(item.name)));
    if (state.productRule === 'single') return base.filter(item => String(item.id) === String(state.focusProductId)).slice(0, 1);
    if (state.productRule === 'manual') return base.filter(item => state.manualProducts.has(String(item.id)));
    if (state.productRule === 'all') return base;
    const sellable = base.filter(item => Number(item.stock_quantity || 0) > 0 && productCover(item));
    if (state.productRule === 'available') return sellable;
    if (state.productRule === 'promotional') return sellable.filter(item => item.promotional_price != null || item.on_sale);
    if (state.productRule === 'best') return sellable.filter(item => item.best_seller);
    if (state.productRule === 'new') return sellable.filter(item => item.new_arrival);
    if (state.productRule === 'low') return sellable.filter(item => Number(item.stock_quantity) <= Number(item.low_stock_threshold || 5));
    return sellable;
  }
  function quickCampaignCandidates(state) {
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    const category = quickCategoryForPreset(state);
    const productPatterns = {
      month: /sof[aá]|poltrona|mesa|rack|painel/i,
      super_offer: /sof[aá]|poltrona|mesa|rack|painel|cama/i,
      special_week: /sof[aá]|mesa|cama|arm[aá]rio|poltrona/i,
      mattresses: /colch[aã]o|cama box/i,
      liquidation: /sof[aá]|guarda-roupa|mesa|cama|arm[aá]rio/i,
      flash: /painel|rack|smart tv|televis|tv|sof[aá]/i,
      weekend: /sof[aá]|poltrona|mesa|rack|painel/i,
      stock_clearance: /arm[aá]rio|guarda-roupa|sof[aá]|cama|mesa/i,
      installment: /sof[aá]|guarda-roupa|mesa|cama/i,
      delivery: /sof[aá]|mesa|arm[aá]rio|guarda-roupa/i,
      black_friday: /sof[aá]|geladeira|lavadora|guarda-roupa|mesa/i,
      christmas: /mesa|sof[aá]|poltrona|rack/i,
      new_year: /sof[aá]|mesa|poltrona|rack/i,
      summer: /poltrona|sof[aá]|mesa|cadeira/i,
      comfort: /sof[aá]|poltrona|cama|colch[aã]o/i,
      renew: /sof[aá]|mesa|rack|painel|poltrona/i,
      complete: /sof[aá]|mesa|cama|arm[aá]rio/i,
      full_environment: /sof[aá]|mesa|rack|painel|poltrona/i
    };
    const activeWithImage = state.products.filter(item => item.active !== false && productCover(item));
    let candidates = activeWithImage.filter(item => (!category || String(item.category_id) === String(category.id)) && (!preset.product || preset.product.test(item.name)));
    const pattern = productPatterns[state.presetKey];
    if (pattern) {
      const related = activeWithImage.filter(item => pattern.test(item.name));
      if (related.length) candidates = related;
    }
    const priorities = {
      month: [/sof[aá]/i,/mesa/i,/poltrona/i,/rack|painel/i],
      liquidation: [/guarda-roupa/i,/cama/i,/sof[aá]/i,/mesa/i],
      flash: [/painel/i,/rack/i,/smart tv|televis|\btv\b/i,/sof[aá]/i],
      weekend: [/sof[aá]/i,/mesa/i,/poltrona/i,/rack|painel/i],
      stock_clearance: [/arm[aá]rio/i,/guarda-roupa/i,/mesa/i,/cama/i],
      black_friday: [/geladeira/i,/lavadora/i,/sof[aá]/i,/guarda-roupa/i]
    }[state.presetKey];
    if (priorities) {
      const rank = item => { const index = priorities.findIndex(regex => regex.test(item.name)); return index < 0 ? priorities.length : index; };
      candidates = [...candidates].sort((a, b) => rank(a) - rank(b));
    }
    return candidates.length ? candidates : activeWithImage;
  }
  function quickImage(state, products) {
    if (state.record && state.imageMode === 'existing') return state.record.image_desktop_url || state.record.image_mobile_url || '';
    const category = quickCategoryForPreset(state);
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    const layout = quickLayoutForState(state);
    const variationIndex = Math.max(0, quickVariationsForPreset(state.presetKey).findIndex(item => item.id === layout.id));
    const candidates = quickCampaignCandidates(state);
    const campaignOffset = ({ month: 0, liquidation: 1, flash: 0, weekend: 0, stock_clearance: 1, black_friday: 0 })[state.presetKey];
    const imageOffset = campaignOffset == null ? Number(preset.imageIndex || 0) : campaignOffset;
    const fallbackProduct = candidates[(imageOffset + variationIndex) % Math.max(1, candidates.length)] || state.products.filter(productCover)[(imageOffset + variationIndex) % Math.max(1, state.products.filter(productCover).length)];
    const productForward = ['month','super_offer','special_week','mattresses','appliances','liquidation','best','flash','weekend','stock_clearance','installment','back_school','black_friday','product_spotlight'].includes(state.presetKey);
    const useCampaignProduct = productForward && !['manual','single'].includes(state.productRule) && fallbackProduct;
    const productImage = useCampaignProduct ? productCover(fallbackProduct) : products[0] ? productCover(products[0]) : fallbackProduct ? productCover(fallbackProduct) : '';
    if (state.imageMode === 'category') return category?.image_url || productImage || '';
    if (state.imageMode === 'library' || state.imageMode === 'selected' || state.imageMode === 'upload') return state.selectedImage || productImage || category?.image_url || '';
    if (state.productRule === 'promotion' && products[0] && productCover(products[0])) return productCover(products[0]);
    if (state.categoryId && (category?.image_url || productImage)) return category?.image_url || productImage;
    if (state.productRule === 'single' && productImage) return productImage;
    return productForward ? productImage || QUICK_TEMPLATE_IMAGES[state.presetKey] || category?.image_url || '' : QUICK_TEMPLATE_IMAGES[state.presetKey] || productImage || category?.image_url || state.record?.image_desktop_url || '';
  }
  function quickPosition(state) {
    if (state.position !== 'auto') return state.position;
    const occupiedHero = state.banners.some(item => item.active && item.position === 'home_hero' && String(item.id) !== String(state.record?.id));
    return occupiedHero ? 'home_middle' : 'home_hero';
  }
  function quickDurationLabel(value) { return QUICK_DURATIONS.find(item => item[0] === value)?.[1] || value; }
  function quickPositionLabel(value) { return ({ auto: 'O sistema decide', home_hero: 'Destaque principal', home_middle: 'Meio da página', home_bottom: 'Área de ofertas', category: 'Categoria', recommended: 'Todos os locais recomendados' })[value] || value; }
  function quickCountdownText(state) {
    const end = state.publishMode === 'schedule' ? new Date(state.scheduleEnd || '') : new Date(quickDurationRange(state.duration).endAt || '');
    if (!Number.isFinite(end.getTime())) return 'POR POUCO TEMPO';
    const remaining = Math.max(0, end.getTime() - Date.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return days ? `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M` : `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')}`;
  }

  function quickPreviewState(state, presetKey, layout) {
    const preset = QUICK_CAMPAIGN_PRESETS[presetKey];
    return { ...state, presetKey, layout: layout.id, visual: layout.visual, theme: layout.theme, title: preset.titles[0], subtitle: preset.subtitles[0], cta: preset.ctas[0], productRule: preset.rule, categoryId: '', imageMode: 'auto', selectedImage: '', duration: preset.duration, publishMode: 'now', countdown: Boolean(preset.countdown) };
  }
  function quickThumbUrl(url) { return String(url || '').replace(/([?&])w=\d+/i, '$1w=640').replace(/([?&])q=\d+/i, '$1q=72'); }
  function quickBannerMarkup(state, image, compact = false) {
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    const layout = quickLayoutForState(state);
    const products = quickEligibleProducts(state);
    const campaignProducts = quickCampaignCandidates(state);
    const focus = products[0] || null;
    const regularPrice = focus ? Number(focus.price || 0) : 0;
    const price = focus ? Number(focus.promotional_price ?? focus.price ?? 0) : 0;
    const priceText = price ? brl(price) : '';
    const discountPercent = products.reduce((highest, product) => { const regular = Number(product.price || 0); const offer = Number(product.promotional_price ?? regular); return regular > 0 && offer >= 0 && offer < regular ? Math.max(highest, Math.round((1 - offer / regular) * 100)) : highest; }, 0);
    const campaignIdentity = ({
      month: { kicker: 'PROMOÇÃO DO MÊS', offer: 'PREÇO BAIXO', seal: 'MÊS INTEIRO' },
      super_offer: { kicker: 'SUPER OFERTA', offerLabel: 'CONDIÇÃO ESPECIAL', offer: 'IMPERDÍVEL', seal: 'PREÇO DE ATACAREJO' },
      special_week: { kicker: 'SEMANA ESPECIAL', offer: '7 DIAS DE OFERTAS', seal: 'UMA OPORTUNIDADE POR AMBIENTE' },
      liquidation: { kicker: 'MÓVEIS COM ATÉ', offerLabel: 'MÓVEIS COM ATÉ', offer: '50% OFF', seal: 'QUALIDADE COM PREÇOS IMPERDÍVEIS' },
      flash: { kicker: '⚡ POR TEMPO LIMITADO', offerLabel: 'DESCONTOS DE ATÉ', offer: '40% OFF', seal: 'APROVEITE ANTES QUE ACABE!' },
      weekend: { kicker: 'CONDIÇÕES ESPECIAIS', offerLabel: 'SOMENTE', offer: 'POR POUCOS DIAS', seal: 'SEXTA • SÁBADO • DOMINGO' },
      stock_clearance: { kicker: 'ÚLTIMAS UNIDADES', offerLabel: 'ATÉ', offer: '60% OFF', seal: 'ESTOQUE LIMITADO' },
      complete: { kicker: 'SALA • QUARTO • COZINHA', offer: 'AMBIENTES COMPLETOS', seal: 'TUDO PARA TODOS OS MOMENTOS' },
      black_friday: { kicker: 'BLACK DE VERDADE', offer: 'ATÉ 70% OFF', seal: 'MENOR PREÇO DO ANO' },
      appliances: { kicker: 'TECNOLOGIA PARA SUA CASA', offer: 'OFERTA ESPECIAL', seal: 'ELETROS' },
      best: { kicker: 'ESCOLHAS DOS CLIENTES', offer: 'MAIS VENDIDO', seal: 'CAMPEÃO DE VENDAS' },
      product_spotlight: { kicker: 'PRODUTO EM DESTAQUE', offer: priceText || 'OFERTA ESPECIAL', seal: 'DESTAQUE DA SEMANA' }
    })[state.presetKey] || { kicker: preset.label.toUpperCase(), offer: preset.group === 'products' ? 'MAIS DESEJADO' : 'PARA SUA CASA', seal: preset.group === 'dates' ? 'EDIÇÃO ESPECIAL' : 'ESCOLHA COMPLETA' };
    const offerLabel = state.productRule === 'single' && priceText ? 'A PARTIR DE' : campaignIdentity.offerLabel || campaignIdentity.kicker;
    const offerValue = state.productRule === 'single' && priceText ? priceText : /\d+% OFF/i.test(campaignIdentity.offer || '') ? discountPercent ? `ATÉ ${discountPercent}% OFF` : 'PREÇO ESPECIAL' : campaignIdentity.offer;
    const imageUrls = [image, ...campaignProducts.map(productCover)].filter(Boolean).filter((url, index, list) => list.indexOf(url) === index);
    const second = imageUrls[1] || imageUrls[0] || '';
    const catalogImages = imageUrls.slice(0, state.presetKey === 'complete' ? 4 : 3);
    const catalogLabels = state.presetKey === 'complete'
      ? ['SALA', 'QUARTO', 'COZINHA', 'ESCRITÓRIO']
      : state.presetKey === 'weekend'
        ? ['MESA DE JANTAR', 'SOFÁ RETRÁTIL', 'OFERTA ESPECIAL']
        : ['DESTAQUE', 'OFERTA', 'IMPERDÍVEL'];
    const brandedCampaign = ['month','super_offer','special_week','liquidation','flash','weekend','stock_clearance','complete'].includes(state.presetKey);
    const benefitRows = ({
      weekend: [['▣','QUALIDADE','QUE SUA CASA MERECE'],['▤','PARCELE','EM ATÉ 12X'],['⌂','TUDO PARA','SUA CASA']],
      stock_clearance: [['▣','ESTOQUE','LIMITADO'],['▤','ENTREGA','RÁPIDA'],['✓','COMPRA','SEGURA']]
    })[state.presetKey] || [];
    const alwaysShowOffer = ['month','super_offer','special_week','liquidation','flash','weekend','stock_clearance','black_friday'].includes(state.presetKey);
    const showOffer = alwaysShowOffer || ['product-cutout','centered-product','discount-impact','price-stage'].includes(layout.id);
    const showPrice = layout.id === 'price-stage' && priceText;
    return `<div class="quick-preview-banner campaign-${esc(state.presetKey)} layout-${esc(layout.id)} theme-${esc(state.theme || layout.theme)} ${image ? 'has-image' : ''} ${compact ? 'is-compact' : ''}">
      <div class="quick-banner-photo">${image ? `<img src="${esc(quickThumbUrl(image))}" alt="" ${compact ? 'loading="lazy"' : ''}>` : '<span>Imagem sugerida</span>'}</div>
      ${brandedCampaign ? '<img class="quick-banner-logo" src="assets/logo.png" alt="Atacarejo dos Móveis" loading="lazy">' : ''}
      ${layout.id === 'dual-scene' && second ? `<div class="quick-banner-photo quick-banner-photo-alt"><img src="${esc(quickThumbUrl(second))}" alt="" loading="lazy"></div>` : ''}
      ${layout.id === 'catalog-offer' ? `<div class="quick-banner-catalog">${catalogImages.map((url, index) => `<span><img src="${esc(quickThumbUrl(url))}" alt="" loading="lazy"><i>${esc(catalogLabels[index] || 'OFERTA')}</i></span>`).join('')}</div>` : ''}
      <div class="quick-banner-copy"><small>${esc(campaignIdentity.kicker)}</small><strong data-quick-preview-title>${esc(state.title)}</strong><p data-quick-preview-subtitle>${esc(state.subtitle)}</p>${compact ? `<span class="quick-banner-cta">${esc(state.cta)} →</span>` : `<button type="button" tabindex="-1" data-quick-preview-cta>${esc(state.cta)} →</button>`}</div>
      <div class="quick-campaign-seal">${esc(campaignIdentity.seal)}</div>
      ${showOffer ? `<div class="quick-banner-offer"><small>${esc(offerLabel)}</small><b>${esc(offerValue)}</b></div>` : ''}
      ${showPrice ? `<div class="quick-banner-price"><small>A PARTIR DE</small><b>${esc(priceText)}</b>${regularPrice > price ? `<del>${esc(brl(regularPrice))}</del>` : ''}</div>` : ''}
      ${state.countdown ? `<div class="quick-banner-countdown"><span>TERMINA EM</span><b>${esc(quickCountdownText(state))}</b></div>` : ''}
      ${benefitRows.length ? `<div class="quick-banner-benefits">${benefitRows.map(([icon, title, subtitle]) => `<span><i>${icon}</i><b>${title}</b><small>${subtitle}</small></span>`).join('')}</div>` : ''}
    </div>`;
  }

  function renderQuickCampaignWizard() {
    const state = editorState.quick;
    const dialogHeader = $('#editorForm>header');
    dialogHeader.classList.remove('quick-library-header');
    dialogHeader.querySelector('.quick-library-heading-subtitle')?.remove();
    dialogHeader.querySelector('.quick-library-heading-search')?.remove();
    if (state.step === 'templates') {
      const favorites = quickStoredList(QUICK_FAVORITES_KEY);
      const recent = quickStoredList(QUICK_RECENTS_KEY);
      const query = String(state.librarySearch || '').trim().toLowerCase();
      const featuredOrder = ['month','super_offer','liquidation','flash','special_week','weekend','stock_clearance','complete','mattresses'];
      const entries = Object.entries(QUICK_CAMPAIGN_PRESETS).filter(([key, item]) => {
        const tabMatch = state.libraryTab === 'favorites' ? favorites.includes(key) : state.libraryTab === 'recent' ? recent.includes(key) : true;
        const groupMatch = state.libraryGroup === 'all' || item.group === state.libraryGroup;
        const searchMatch = !query || `${item.label} ${item.titles.join(' ')} ${item.subtitles.join(' ')}`.toLowerCase().includes(query);
        return tabMatch && groupMatch && searchMatch;
      }).sort(([left], [right]) => {
        const leftIndex = featuredOrder.indexOf(left); const rightIndex = featuredOrder.indexOf(right);
        return (leftIndex < 0 ? featuredOrder.length : leftIndex) - (rightIndex < 0 ? featuredOrder.length : rightIndex);
      });
      $('#dialogEyebrow').textContent = 'BIBLIOTECA PROFISSIONAL';
      $('#dialogTitle').textContent = 'Modelos prontos';
      dialogHeader.classList.add('quick-library-header');
      $('#dialogTitle').insertAdjacentHTML('afterend', '<p class="quick-library-heading-subtitle">Escolha um modelo, personalize se quiser e publique em segundos.</p>');
      dialogHeader.querySelector('[data-close]').insertAdjacentHTML('beforebegin', `<label class="quick-library-heading-search"><span aria-hidden="true">⌕</span><input id="quickLibrarySearch" type="search" autocomplete="off" value="${esc(state.librarySearch || '')}" placeholder="Buscar modelo (ex.: sala, promoção, cozinha...)"></label>`);
      $('#editorFields').innerHTML = `<div class="quick-library-screen">
        <div class="quick-library-filterbar"><div class="quick-library-filters">${QUICK_GROUPS.map(([value, label]) => `<button type="button" data-library-group="${value}" class="${state.libraryTab === 'all' && state.libraryGroup === value ? 'is-active' : ''}">${label}</button>`).join('')}</div><div class="quick-library-tabs"><button type="button" data-library-tab="favorites" class="${state.libraryTab === 'favorites' ? 'is-active' : ''}">♡ Meus favoritos</button><button type="button" data-library-tab="recent" class="${state.libraryTab === 'recent' ? 'is-active' : ''}">◷ Usados recentemente</button></div></div>
        <div class="quick-template-gallery">${entries.map(([key, item]) => { const layout = quickVariationsForPreset(key)[0]; const previewState = quickPreviewState(state, key, layout); const image = quickImage(previewState, quickEligibleProducts(previewState)); return `<article class="quick-template-card"><div class="quick-template-thumb">${quickBannerMarkup(previewState, image, true)}<button type="button" class="quick-favorite ${favorites.includes(key) ? 'is-active' : ''}" data-quick-favorite="${key}" aria-label="${favorites.includes(key) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${favorites.includes(key) ? '♥' : '♡'}</button></div><div class="quick-template-meta"><div class="quick-template-info"><span>${esc(item.group === 'dates' ? 'DATA ESPECIAL' : item.group === 'rooms' ? 'AMBIENTE' : item.group === 'promotions' ? 'PROMOÇÃO' : item.group === 'products' ? 'PRODUTO' : 'INSTITUCIONAL')}</span><h3>${esc(item.label)}</h3><p>5 variações profissionais</p></div><button type="button" data-quick-template="${key}">Usar este modelo</button></div></article>`; }).join('') || '<div class="quick-library-empty"><b>Nenhum modelo encontrado</b><p>Tente outra busca ou escolha “Todos”.</p></div>'}</div>
        <p class="quick-performance-note">As miniaturas são carregadas progressivamente. As imagens em alta resolução só abrem na prévia.</p>
      </div>`;
      $$('[data-library-tab]').forEach(button => button.onclick = () => { state.libraryTab = button.dataset.libraryTab; state.libraryGroup = 'all'; renderQuickCampaignWizard(); });
      $$('[data-library-group]').forEach(button => button.onclick = () => { state.libraryTab = 'all'; state.libraryGroup = button.dataset.libraryGroup; renderQuickCampaignWizard(); });
      $('#quickLibrarySearch').oninput = event => { const value = event.target.value; state.librarySearch = value; window.clearTimeout(state.searchTimer); state.searchTimer = window.setTimeout(() => { renderQuickCampaignWizard(); const input = $('#quickLibrarySearch'); input?.focus(); input?.setSelectionRange(value.length, value.length); }, 180); };
      $$('[data-quick-favorite]').forEach(button => button.onclick = () => { const key = button.dataset.quickFavorite; const values = quickStoredList(QUICK_FAVORITES_KEY); quickSaveList(QUICK_FAVORITES_KEY, values.includes(key) ? values.filter(item => item !== key) : [...values, key]); renderQuickCampaignWizard(); });
      $$('[data-quick-template]').forEach(button => button.onclick = () => { const key = button.dataset.quickTemplate; const preset = QUICK_CAMPAIGN_PRESETS[key]; const layout = quickVariationsForPreset(key)[0]; Object.assign(state, { step: 'variations', presetKey: key, layout: layout.id, visual: layout.visual, theme: layout.theme, title: preset.titles[0], subtitle: preset.subtitles[0], cta: preset.ctas[0], productRule: preset.rule, duration: preset.duration, position: 'auto', imageMode: 'auto', categoryId: '', selectedImage: '', countdown: Boolean(preset.countdown) }); quickRememberTemplate(key); renderQuickCampaignWizard(); });
      return;
    }
    if (state.step === 'fast-goal') {
      const fastKeys = ['month','super_offer','living','bedrooms','mattresses','kitchen','complete','liquidation'];
      $('#dialogEyebrow').textContent = '⚡ MODO SUPER RÁPIDO'; $('#dialogTitle').textContent = 'O que você quer divulgar?';
      $('#editorFields').innerHTML = `<div class="quick-fast-screen"><p>Escolha uma opção. Textos, imagem, produtos e duração serão preenchidos automaticamente.</p><div>${fastKeys.map(key => `<button type="button" data-fast-goal="${key}"><span>${QUICK_CAMPAIGN_PRESETS[key].icon}</span><b>${esc(QUICK_CAMPAIGN_PRESETS[key].label)}</b></button>`).join('')}</div><button id="fastBack" type="button" class="secondary">← Voltar para modelos prontos</button></div>`;
      $$('[data-fast-goal]').forEach(button => button.onclick = () => { const key = button.dataset.fastGoal; const preset = QUICK_CAMPAIGN_PRESETS[key]; const layout = quickVariationsForPreset(key, 4)[0]; Object.assign(state, { step: 'fast-variations', presetKey: key, layout: layout.id, visual: layout.visual, theme: layout.theme, title: preset.titles[0], subtitle: preset.subtitles[0], cta: preset.ctas[0], productRule: preset.rule, duration: preset.duration, position: 'auto', imageMode: 'auto', categoryId: '', selectedImage: '', countdown: Boolean(preset.countdown) }); quickRememberTemplate(key); renderQuickCampaignWizard(); });
      $('#fastBack').onclick = () => { state.step = 'templates'; renderQuickCampaignWizard(); };
      return;
    }
    if (state.step === 'variations' || state.step === 'fast-variations') {
      const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey]; const fast = state.step === 'fast-variations'; const variations = quickVariationsForPreset(state.presetKey, fast ? 4 : 5);
      if (!state.layout) { state.layout = variations[0].id; state.visual = variations[0].visual; state.theme = variations[0].theme; }
      $('#dialogEyebrow').textContent = preset.label.toUpperCase(); $('#dialogTitle').textContent = 'Escolha uma variação';
      $('#editorFields').innerHTML = `<div class="quick-variation-screen"><header><button id="variationBackTop" type="button" class="secondary">← Voltar para modelos</button><div><b>${esc(preset.label)}</b><p>${fast ? 'Escolha um estilo' : 'Escolha uma das 5 variações profissionais.'}</p></div><span>${variations.length} opções</span></header><div class="quick-variation-grid">${variations.map(layout => { const previewState = quickPreviewState(state, state.presetKey, layout); const image = quickImage(previewState, quickEligibleProducts(previewState)); return `<button type="button" data-quick-layout="${layout.id}" class="${state.layout === layout.id ? 'is-active' : ''}">${quickBannerMarkup(previewState, image, true)}<span><i>VARIAÇÃO ${String(layout.number).padStart(2,'0')}</i><b>${esc(layout.name)}</b><small>${state.layout === layout.id ? '✓ Variação selecionada' : 'Usar esta variação'}</small></span></button>`; }).join('')}</div><footer><button id="variationBack" type="button" class="secondary">← Voltar</button>${fast ? '<button id="fastPublish" type="button">Publicar banner</button>' : '<button id="variationContinue" type="button">Ver prévia e personalizar →</button>'}</footer></div>`;
      $$('[data-quick-layout]').forEach(button => button.onclick = () => { const layout = QUICK_LAYOUTS.find(item => item.id === button.dataset.quickLayout); Object.assign(state, { layout: layout.id, visual: layout.visual, theme: layout.theme, selectedImage: '' }); renderQuickCampaignWizard(); });
      $('#variationBack').onclick = () => { state.step = fast ? 'fast-goal' : 'templates'; state.layout = ''; renderQuickCampaignWizard(); };
      $('#variationBackTop').onclick = $('#variationBack').onclick;
      $('#variationContinue')?.addEventListener('click', () => { state.step = 'ready'; renderQuickCampaignWizard(); });
      $('#fastPublish')?.addEventListener('click', () => saveQuickCampaign(false));
      return;
    }
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    const category = quickCategoryForPreset(state);
    const products = quickEligibleProducts(state);
    const image = quickImage(state, products);
    const position = quickPosition(state);
    const titles = [state.record?.title, ...preset.titles].filter((item, index, list) => item && list.indexOf(item) === index);
    const subtitles = [state.record?.subtitle, ...preset.subtitles].filter((item, index, list) => item && list.indexOf(item) === index);
    const ctas = [state.record?.button_text, ...preset.ctas].filter((item, index, list) => item && list.indexOf(item) === index);
    const phraseSuggestions = titles.slice(0, 4).map((title, index) => ({ title, subtitle: subtitles[index % subtitles.length], cta: ctas[index % ctas.length] }));
    const matchingProducts = state.products.filter(item => (!category || String(item.category_id) === String(category.id)) && (!preset.product || preset.product.test(item.name)));
    const libraryCategories = [['all','Todas'], ...state.categories.map(item => [String(item.id), item.name])];
    const libraryProducts = state.products.filter(item => productCover(item) && (state.imageLibraryFilter === 'all' || String(item.category_id) === String(state.imageLibraryFilter))).slice(0, 30);
    const layout = quickLayoutForState(state);
    $('#dialogEyebrow').textContent = state.record ? '✦ EDIÇÃO RÁPIDA' : 'PASSO 3 DE 4';
    $('#dialogTitle').textContent = state.record ? `Editar — ${state.record.title}` : `${preset.label} · ${layout.name}`;
    $('#editorFields').innerHTML = `<div class="quick-ready-screen"><section class="quick-preview-panel"><div class="quick-preview-toolbar"><b>PRÉVIA DO BANNER</b><div><button class="${state.previewDevice === 'desktop' ? 'is-active' : ''}" type="button" data-quick-device="desktop">🖥 Desktop</button><button class="${state.previewDevice === 'tablet' ? 'is-active' : ''}" type="button" data-quick-device="tablet">Tablet</button><button class="${state.previewDevice === 'mobile' ? 'is-active' : ''}" type="button" data-quick-device="mobile">📱 Mobile</button></div></div><div class="quick-preview-canvas ${esc(state.previewDevice || 'desktop')}">${quickBannerMarkup(state, image)}</div><dl class="quick-summary"><div><dt>Modelo</dt><dd>${esc(preset.label)}</dd></div><div><dt>Variação</dt><dd>${esc(layout.name)}</dd></div><div><dt>Produtos</dt><dd>${products.length} produto${products.length === 1 ? '' : 's'}</dd></div><div><dt>Local</dt><dd>${esc(quickPositionLabel(position))}</dd></div></dl></section>
      <section class="quick-options-panel"><div class="quick-option-block"><header><span>1</span><div><b>Frases prontas</b><small>Clique em uma sugestão. Título, subtítulo e botão são preenchidos juntos.</small></div></header><div class="quick-phrase-grid">${phraseSuggestions.map((phrase, index) => `<button type="button" data-quick-phrase="${index}" class="${state.title === phrase.title && state.subtitle === phrase.subtitle ? 'is-active' : ''}"><b>${esc(phrase.title)}</b><small>${esc(phrase.subtitle)}</small><em>${esc(phrase.cta)} →</em></button>`).join('')}</div><label>Texto do botão<select id="quickCta">${ctas.map(text => `<option ${state.cta === text ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label><details class="quick-custom-copy"><summary>Editar texto manualmente (opcional)</summary><label>Título<input id="quickCustomTitle" value="${esc(state.title)}"></label><label>Subtítulo<textarea id="quickCustomSubtitle">${esc(state.subtitle)}</textarea></label></details></div>
      <div class="quick-option-block"><header><span>2</span><div><b>Produto, categoria ou promoção</b><small>Nome, preço, foto e link vêm do banco da loja</small></div></header><label>Categoria<select id="quickCategory"><option value="" ${!state.categoryId ? 'selected' : ''}>✨ Categoria sugerida pelo modelo</option>${state.categories.map(item => `<option value="${item.id}" ${String(state.categoryId) === String(item.id) ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label>O que divulgar?<select id="quickProductRule"><option value="${preset.rule}" ${state.productRule === preset.rule ? 'selected' : ''}>✨ Seleção automática recomendada</option><option value="single" ${state.productRule === 'single' ? 'selected' : ''}>Um produto da loja</option><option value="all" ${state.productRule === 'all' ? 'selected' : ''}>Todos da categoria</option><option value="promotional" ${state.productRule === 'promotional' ? 'selected' : ''}>Produtos com preço promocional</option><option value="promotion" ${state.productRule === 'promotion' ? 'selected' : ''}>Uma promoção já cadastrada</option><option value="available" ${state.productRule === 'available' ? 'selected' : ''}>Somente disponíveis</option><option value="manual" ${state.productRule === 'manual' ? 'selected' : ''}>Escolher vários produtos</option></select></label>${state.productRule === 'promotion' ? `<label>Promoção<select id="quickPromotion"><option value="">Escolha uma promoção</option>${state.promotions.map(item => `<option value="${item.id}" ${String(state.selectedPromotionId) === String(item.id) ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label>` : ''}${state.productRule === 'single' ? `<label>Produto<select id="quickFocusProduct"><option value="">Escolha um produto</option>${matchingProducts.map(item => `<option value="${item.id}" ${String(state.focusProductId) === String(item.id) ? 'selected' : ''}>${esc(item.name)} · ${esc(brl(item.promotional_price ?? item.price))}</option>`).join('')}</select></label>` : ''}${state.productRule === 'manual' ? `<div class="quick-manual-products">${matchingProducts.map(item => `<label><input type="checkbox" value="${item.id}" ${state.manualProducts.has(String(item.id)) ? 'checked' : ''}><span>${productCover(item) ? `<img src="${esc(productCover(item))}" alt="" loading="lazy">` : '<i>▦</i>'}<b>${esc(item.name)}</b><small>Estoque ${Number(item.stock_quantity || 0)}</small></span></label>`).join('')}</div>` : ''}</div>
      <div class="quick-option-block"><header><span>3</span><div><b>Imagem</b><small>Cada modelo já recebe uma foto diferente e coerente</small></div></header><div class="quick-image-mode"><label><input type="radio" name="quickImageMode" value="auto" ${state.imageMode === 'auto' ? 'checked' : ''}><span>✨ Usar imagem sugerida</span></label><label><input type="radio" name="quickImageMode" value="library" ${['library','selected'].includes(state.imageMode) ? 'checked' : ''}><span>Escolher da biblioteca</span></label><label><input type="radio" name="quickImageMode" value="upload" ${state.imageMode === 'upload' ? 'checked' : ''}><span>Enviar minha imagem</span></label></div>${['library','selected'].includes(state.imageMode) ? `<div class="quick-image-library"><nav>${libraryCategories.map(([id, name]) => `<button type="button" data-image-category="${esc(id)}" class="${String(state.imageLibraryFilter) === id ? 'is-active' : ''}">${esc(name)}</button>`).join('')}</nav><div>${libraryProducts.map(item => `<button type="button" data-quick-image="${esc(productCover(item))}" class="${state.selectedImage === productCover(item) ? 'is-active' : ''}"><img src="${esc(quickThumbUrl(productCover(item)))}" alt="${esc(item.name)}" loading="lazy"><span>${esc(item.name)}</span></button>`).join('')}</div></div>` : ''}${state.imageMode === 'upload' ? '<label class="quick-upload">Imagem do banner<input id="quickImageUpload" type="file" accept="image/jpeg,image/png,image/webp"></label>' : ''}</div>
      <div class="quick-option-block"><header><span>4</span><div><b>Publicação</b><small>Publique agora ou agende com término automático</small></div></header><div class="quick-publish-mode"><label><input type="radio" name="quickPublishMode" value="now" ${state.publishMode === 'now' ? 'checked' : ''}><span>Publicar agora</span></label><label><input type="radio" name="quickPublishMode" value="schedule" ${state.publishMode === 'schedule' ? 'checked' : ''}><span>Agendar campanha</span></label></div>${state.publishMode === 'schedule' ? `<div class="quick-schedule-grid"><label>Começa<input id="quickStartAt" type="datetime-local" value="${esc(state.scheduleStart || '')}"></label><label>Termina<input id="quickEndAt" type="datetime-local" value="${esc(state.scheduleEnd || '')}"></label><label>Quando terminar<select id="quickEndAction"><option value="previous" ${state.endAction === 'previous' ? 'selected' : ''}>Voltar ao banner anterior</option><option value="next" ${state.endAction === 'next' ? 'selected' : ''}>Ativar outro banner</option><option value="remove" ${state.endAction === 'remove' ? 'selected' : ''}>Remover o banner</option></select></label></div>` : `<label>Duração rápida<select id="quickDuration">${QUICK_DURATIONS.map(([value, label]) => `<option value="${value}" ${state.duration === value ? 'selected' : ''}>${value === preset.duration ? '✨ ' : ''}${label}</option>`).join('')}</select></label>`}<label>Posição<select id="quickPosition"><option value="auto" ${state.position === 'auto' ? 'selected' : ''}>✨ O sistema decide</option><option value="home_hero" ${state.position === 'home_hero' ? 'selected' : ''}>Destaque principal</option><option value="home_middle" ${state.position === 'home_middle' ? 'selected' : ''}>Meio da página</option><option value="home_bottom" ${state.position === 'home_bottom' ? 'selected' : ''}>Área de ofertas</option></select></label>${preset.countdown ? `<label class="quick-countdown-toggle"><input id="quickCountdown" type="checkbox" ${state.countdown ? 'checked' : ''}> Mostrar contador regressivo</label>` : ''}</div>
      <details class="quick-advanced"><summary>Configurações avançadas</summary><div><button id="changeVariation" type="button" class="secondary">Trocar variação visual</button><button id="openFullBannerEditor" type="button" class="secondary">Abrir editor técnico completo</button></div></details></section>
      <footer class="quick-actions"><button id="quickBack" type="button" class="secondary">← Voltar</button><button id="quickSave" type="button" class="secondary">Salvar rascunho</button><button id="quickPublish" type="button">${state.publishMode === 'schedule' ? 'Agendar campanha' : 'Publicar agora'}</button></footer></div>`;
    $$('[data-quick-phrase]').forEach(button => button.onclick = () => { const phrase = phraseSuggestions[Number(button.dataset.quickPhrase)]; if (!phrase) return; Object.assign(state, phrase); renderQuickCampaignWizard(); });
    $('#quickCta')?.addEventListener('change', event => { state.cta = event.target.value; renderQuickCampaignWizard(); });
    $('#quickProductRule').onchange = event => { state.productRule = event.target.value; if (state.productRule === 'single' && !state.focusProductId) state.focusProductId = matchingProducts[0]?.id || ''; renderQuickCampaignWizard(); };
    $('#quickCategory').onchange = event => { state.categoryId = event.target.value; state.focusProductId = ''; renderQuickCampaignWizard(); };
    $('#quickPromotion')?.addEventListener('change', event => { state.selectedPromotionId = event.target.value; const promotion = state.promotions.find(item => String(item.id) === String(state.selectedPromotionId)); if (promotion) { state.title = promotion.title; state.subtitle = promotion.description || preset.subtitles[0]; state.categoryId = promotion.category_id || ''; if (promotion.banner_url) { state.imageMode = 'selected'; state.selectedImage = promotion.banner_url; } } renderQuickCampaignWizard(); });
    $('#quickFocusProduct')?.addEventListener('change', event => { state.focusProductId = event.target.value; const product = state.products.find(item => String(item.id) === String(state.focusProductId)); if (product) { state.selectedImage = productCover(product); state.imageMode = 'library'; if (state.presetKey === 'product_spotlight') { state.title = product.name; state.subtitle = `${brl(product.promotional_price ?? product.price)} · confira todos os detalhes`; } } renderQuickCampaignWizard(); });
    $$('[name="quickImageMode"]').forEach(input => input.onchange = () => { state.imageMode = input.value; renderQuickCampaignWizard(); });
    $$('[data-image-category]').forEach(button => button.onclick = () => { state.imageLibraryFilter = button.dataset.imageCategory; renderQuickCampaignWizard(); });
    $$('[data-quick-image]').forEach(button => button.onclick = () => { state.selectedImage = button.dataset.quickImage; state.imageMode = 'library'; renderQuickCampaignWizard(); });
    $('#quickDuration')?.addEventListener('change', event => { state.duration = event.target.value; renderQuickCampaignWizard(); });
    $('#quickPosition').onchange = event => { state.position = event.target.value; renderQuickCampaignWizard(); };
    $$('[name="quickPublishMode"]').forEach(input => input.onchange = () => { state.publishMode = input.value; renderQuickCampaignWizard(); });
    $('#quickStartAt')?.addEventListener('change', event => { state.scheduleStart = event.target.value; }); $('#quickEndAt')?.addEventListener('change', event => { state.scheduleEnd = event.target.value; }); $('#quickEndAction')?.addEventListener('change', event => { state.endAction = event.target.value; });
    $$('[data-quick-device]').forEach(button => button.onclick = () => { state.previewDevice = button.dataset.quickDevice; renderQuickCampaignWizard(); });
    $$('.quick-manual-products input').forEach(input => input.onchange = () => { input.checked ? state.manualProducts.add(input.value) : state.manualProducts.delete(input.value); renderQuickCampaignWizard(); });
    $('#quickImageUpload')?.addEventListener('change', event => {
      const file = event.target.files?.[0] || null;
      if (file && !allowedImageTypes.has(file.type)) { event.target.value = ''; return toast('Formato inválido. Envie uma imagem JPG, PNG ou WebP.'); }
      if (file && file.size > maxImageBytes) { event.target.value = ''; return toast('A imagem deve ter no máximo 8 MB.'); }
      state.uploadFile = file;
      if (state.uploadObjectUrl) URL.revokeObjectURL(state.uploadObjectUrl);
      state.uploadObjectUrl = state.uploadFile ? URL.createObjectURL(state.uploadFile) : '';
      state.selectedImage = state.uploadObjectUrl;
      renderQuickCampaignWizard();
    });
    $('#quickCustomTitle').oninput = event => { state.title = event.target.value; $('[data-quick-preview-title]').textContent = state.title; };
    $('#quickCustomSubtitle').oninput = event => { state.subtitle = event.target.value; $('[data-quick-preview-subtitle]').textContent = state.subtitle; };
    $('#quickCountdown')?.addEventListener('change', event => { state.countdown = event.target.checked; renderQuickCampaignWizard(); });
    $('#changeVariation').onclick = () => { state.step = 'variations'; renderQuickCampaignWizard(); };
    $('#quickBack').onclick = () => { if (state.record) $('#editorDialog').close(); else { state.step = 'variations'; renderQuickCampaignWizard(); } };
    $('#quickSave').onclick = () => saveQuickCampaign(true); $('#quickPublish').onclick = () => saveQuickCampaign(false);
    $('#openFullBannerEditor').onclick = () => { $('#editorDialog').close(); openBannerEditor(state.record); };
  }

  async function openQuickCampaign(record = null, presetKey = '', oneClick = false) {
    if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.');
    resetEditorChrome();
    const [categoryResult, productResult, bannerResult, selectedResult, promotionResult] = await Promise.all([
      db.from('categories').select('id,name,slug,image_url').eq('active', true).order('sort_order'),
      db.from('products').select('id,name,sku,category_id,price,promotional_price,stock_quantity,low_stock_threshold,featured,best_seller,new_arrival,on_sale,active,created_at,product_images(image_url,is_cover,sort_order)').is('deleted_at', null).eq('active', true).order('name'),
      db.from('banners').select('*').order('sort_order'),
      record?.promotion_id ? db.from('promotion_products').select('product_id').eq('promotion_id', record.promotion_id) : Promise.resolve({ data: [] }),
      db.from('promotions').select('id,title,description,banner_url,category_id,auto_include_category,promotion_products(product_id)').eq('active', true).order('created_at', { ascending: false }).limit(100)
    ]);
    const loadError = categoryResult.error || productResult.error || bannerResult.error || selectedResult.error || promotionResult.error;
    if (loadError) return toast(explain(loadError));
    const resolvedPreset = presetKey && QUICK_CAMPAIGN_PRESETS[presetKey] ? presetKey : record ? quickPresetForRecord(record) : 'living';
    const preset = QUICK_CAMPAIGN_PRESETS[resolvedPreset];
    const savedLayout = quickMetaValue(record, 'layout');
    const initialLayout = QUICK_LAYOUTS.find(item => item.id === savedLayout) || quickVariationsForPreset(resolvedPreset)[0];
    const savedProducts = new Set((selectedResult.data || []).map(item => String(item.product_id)));
    editorState = { view: 'banners', record, quick: { step: record || oneClick ? 'ready' : 'templates', record, presetKey: resolvedPreset, layout: initialLayout.id, title: record?.title || preset.titles[0], subtitle: record?.subtitle || preset.subtitles[0], cta: record?.button_text || preset.ctas[0], productRule: quickMetaValue(record, 'rule') || (savedProducts.size ? 'manual' : preset.rule), visual: quickMetaValue(record, 'style') || initialLayout.visual, theme: quickMetaValue(record, 'theme') || initialLayout.theme, duration: quickMetaValue(record, 'duration') || (record?.start_at || record?.end_at ? 'custom' : preset.duration), position: record?.position || 'auto', imageMode: record ? 'existing' : 'auto', selectedImage: '', manualProducts: savedProducts, focusProductId: [...savedProducts][0] || '', selectedPromotionId: '', categoryId: record?.category_id || '', categories: categoryResult.data || [], products: productResult.data || [], promotions: promotionResult.data || [], banners: bannerResult.data || [], uploadFile: null, uploadObjectUrl: '', libraryTab: 'all', libraryGroup: 'all', librarySearch: '', imageLibraryFilter: 'all', previewDevice: 'desktop', publishMode: record?.start_at ? 'schedule' : 'now', scheduleStart: record?.start_at ? new Date(record.start_at).toISOString().slice(0,16) : '', scheduleEnd: record?.end_at ? new Date(record.end_at).toISOString().slice(0,16) : '', endAction: quickMetaValue(record, 'end') || 'previous', countdown: record ? quickMetaValue(record, 'countdown') === 'true' : Boolean(preset.countdown), searchTimer: 0 } };
    $('#editorDialog').classList.add('quick-campaign-dialog');
    $('#editorForm>footer').hidden = true;
    renderQuickCampaignWizard();
    $('#editorDialog').showModal();
  }

  async function saveQuickCampaign(asDraft) {
    const state = editorState?.quick;
    if (!state) return;
    const preset = QUICK_CAMPAIGN_PRESETS[state.presetKey];
    const products = quickEligibleProducts(state);
    if (state.productRule === 'promotion' && !state.selectedPromotionId) return toast('Escolha uma promoção para continuar.');
    if (!asDraft && !products.length && ['promotion','clearance','category','products','best_sellers','new_arrivals'].includes(preset.campaignType)) return toast('Nenhum produto corresponde à seleção. Escolha outra categoria, produto ou promoção antes de publicar.');
    const category = quickCategoryForPreset(state);
    const position = quickPosition(state) === 'recommended' ? 'home_middle' : quickPosition(state);
    let duration;
    if (state.publishMode === 'schedule') {
      if (!state.scheduleStart || !state.scheduleEnd) return toast('Informe o início e o término da campanha.');
      const startAt = new Date(state.scheduleStart); const endAt = new Date(state.scheduleEnd);
      if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) return toast('A data final precisa ser posterior à data inicial.');
      duration = { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
    } else duration = state.duration === 'custom' ? { startAt: state.record?.start_at || null, endAt: state.record?.end_at || null } : quickDurationRange(state.duration);
    const image = quickImage(state, products);
    const actionLabel = state.publishMode === 'schedule' ? `Agendar “${state.title}”?` : `Publicar “${state.title}” agora?`;
    if (!asDraft && !await confirmAction({ title: actionLabel, message: `${state.publishMode === 'schedule' ? `${dateTime(duration.startAt)} → ${dateTime(duration.endAt)} · ` : ''}${products.length} produto(s) · ${quickPositionLabel(position)}`, confirmLabel: state.publishMode === 'schedule' ? 'Agendar' : 'Publicar' })) return;
    const actionButtons = $$('.quick-actions button'); const publishButton = $('#quickPublish'); const previousPublishText = publishButton?.textContent; actionButtons.forEach(button => { button.disabled = true; }); if (publishButton) publishButton.textContent = asDraft ? 'Salvando rascunho…' : state.publishMode === 'schedule' ? 'Agendando…' : 'Publicando…';
    let rollbackPromotionId = null;
    let uploadedImage = null;
    let persisted = false;
    try {
      const [bannerSchema, promotionSchema] = await Promise.all([db.from('banners').select('campaign_type,content_mode,display_locations,promotion_id').limit(1), db.from('promotions').select('promotion_type,category_id,selection_mode').limit(1)]);
      const extendedSchema = !bannerSchema.error && !promotionSchema.error;
      let imageUrl = image;
      if (state.imageMode === 'upload' && state.uploadFile) { uploadedImage = await upload('banners', state.uploadFile, state.record?.id || 'rapidas'); imageUrl = uploadedImage.url; }
      let promotionId = extendedSchema ? state.record?.promotion_id || null : null;
      const automaticCategory = state.productRule === 'all' && Boolean(category?.id);
      const promotionValues = { title: state.title, description: state.subtitle, start_at: duration.startAt, end_at: duration.endAt, active: !asDraft, banner_url: imageUrl || null, promotion_type: 'display_only', discount_value: null, category_id: category?.id || null, selection_mode: automaticCategory ? 'all_category' : 'manual', auto_include_category: automaticCategory };
      if (extendedSchema && (products.length || ['promotion','clearance','category','best_sellers','new_arrivals'].includes(preset.campaignType))) {
        const promotionSave = promotionId ? await db.from('promotions').update(promotionValues).eq('id', promotionId).select().single() : await db.from('promotions').insert(promotionValues).select().single();
        if (promotionSave.error) throw promotionSave.error;
        promotionId = promotionSave.data.id;
        if (!state.record?.promotion_id) rollbackPromotionId = promotionId;
        const clear = await db.from('promotion_products').delete().eq('promotion_id', promotionId); if (clear.error) throw clear.error;
        if (products.length) { const links = await db.from('promotion_products').insert(products.map(item => ({ promotion_id: promotionId, product_id: item.id }))); if (links.error) throw links.error; }
      }
      const realLocations = position === 'home_hero' ? ['home_hero'] : position === 'home_bottom' ? ['home_bottom','offers'] : ['home_middle'];
      const productDestination = state.productRule === 'single' && state.focusProductId ? `?product=${encodeURIComponent(state.focusProductId)}` : '';
      const promotionDestination = state.productRule === 'promotion' && promotionId ? `?promotion=${encodeURIComponent(promotionId)}#ofertas` : '';
      const categoryDestination = category?.slug ? `?category=${encodeURIComponent(category.slug)}#catalogo` : '';
      const destination = productDestination || promotionDestination || categoryDestination || '#catalogo';
      const savedRule = state.productRule === 'promotion' ? 'manual' : state.productRule;
      const marker = new URLSearchParams({ campaign_template: state.presetKey, campaign_layout: state.layout, campaign_style: state.visual, campaign_theme: state.theme, campaign_image: state.imageMode, campaign_rule: savedRule, campaign_duration: state.publishMode === 'schedule' ? 'custom' : state.duration, campaign_end: state.endAction, campaign_countdown: String(Boolean(state.countdown)) }).toString();
      const hashIndex = destination.indexOf('#'); const destinationBase = hashIndex >= 0 ? destination.slice(0, hashIndex) : destination; const destinationHash = hashIndex >= 0 ? destination.slice(hashIndex) : '';
      const buttonUrl = `${destinationBase}${destinationBase.includes('?') ? '&' : '?'}${marker}${destinationHash}`;
      const values = { title: state.title.trim(), subtitle: state.subtitle.trim() || null, image_desktop_url: imageUrl || state.record?.image_desktop_url || null, image_mobile_url: imageUrl || state.record?.image_mobile_url || null, button_text: state.cta || null, button_url: buttonUrl, position, sort_order: state.record?.sort_order || Math.max(0, ...state.banners.map(item => Number(item.sort_order || 0))) + 10, active: !asDraft, start_at: duration.startAt, end_at: duration.endAt };
      if (extendedSchema) Object.assign(values, { campaign_type: preset.campaignType, content_mode: products.length ? 'banner_products' : 'banner', category_id: category?.id || null, promotion_id: promotionId, link_type: state.productRule === 'single' ? 'product' : state.productRule === 'promotion' ? 'promotion' : category ? 'category' : 'link', alignment: ['minimal','centered'].includes(state.visual) ? 'center' : state.visual === 'reverse' ? 'right' : 'left', display_locations: [...realLocations, `preset:${state.presetKey}`, `layout:${state.layout}`, `style:${state.visual}`, `theme:${state.theme}`, `image:${state.imageMode}`, `rule:${savedRule}`, `duration:${state.publishMode === 'schedule' ? 'custom' : state.duration}`, `end:${state.endAction}`, `countdown:${Boolean(state.countdown)}`], draft: asDraft, paused: false, auto_include_category: automaticCategory, deactivate_on_end: state.publishMode === 'schedule' || state.duration !== 'always', keep_products_after_end: true });
      const saved = state.record ? await db.from('banners').update(values).eq('id', state.record.id) : await db.from('banners').insert(values);
      if (saved.error) throw saved.error;
      persisted = true;
      if (uploadedImage && state.record) {
        const previousUrls = new Set([state.record.image_desktop_url, state.record.image_mobile_url].filter(url => url && url !== uploadedImage.url));
        for (const previousUrl of previousUrls) await removeUnusedBannerImage(previousUrl);
      }
      rollbackPromotionId = null;
      quickRememberTemplate(state.presetKey); notifyStorefront('banners'); $('#editorDialog').close(); toast(asDraft ? 'Campanha salva como rascunho.' : state.publishMode === 'schedule' ? 'Campanha agendada e sincronizada com a loja.' : 'Campanha publicada e sincronizada com a loja.'); render('banners');
    } catch (error) {
      if (uploadedImage && !persisted) await db.storage.from(uploadedImage.bucket).remove([uploadedImage.path]);
      if (rollbackPromotionId) await db.from('promotions').delete().eq('id', rollbackPromotionId);
      toast(explain(error)); actionButtons.forEach(button => { button.disabled = false; }); if (publishButton) publishButton.textContent = previousPublishText;
    }
  }

  const bannerPositionLabels = { home_hero: 'Hero principal da Home', home_middle: 'Meio da página', home_bottom: 'Banner promocional' };
  const bannerPositionShort = { home_hero: 'Hero principal', home_middle: 'Meio da página', home_bottom: 'Promoções' };
  function bannerDestination(url = '') {
    const value = String(url).trim();
    if (!value) return { type: 'Sem ação', label: 'Nenhum destino configurado', key: 'link' };
    if (/produto|product/i.test(value)) return { type: 'Produto', label: value, key: 'product' };
    if (/categoria|category/i.test(value)) return { type: 'Categoria', label: value, key: 'category' };
    if (/oferta|promoc/i.test(value)) return { type: 'Promoção', label: value, key: 'promotion' };
    return { type: value.startsWith('#') ? 'Seção da página' : 'Link', label: value, key: 'link' };
  }
  function bannerSchedule(row, now = new Date()) {
    const start = row.start_at ? new Date(row.start_at) : null;
    const end = row.end_at ? new Date(row.end_at) : null;
    if (row.draft) return { key: 'draft', label: 'Rascunho', detail: 'Ainda não foi publicado' };
    if (row.paused) return { key: 'paused', label: 'Pausado', detail: 'Campanha pausada manualmente' };
    if (!row.active) return { key: 'draft', label: 'Rascunho', detail: 'Ainda não foi publicado' };
    if (start && start > now) return { key: 'scheduled', label: 'Agendado', detail: `Começa em ${dateTime(row.start_at)}` };
    if (end && end <= now) return { key: 'ended', label: 'Encerrado', detail: `Encerrou em ${dateTime(row.end_at)}` };
    const detail = !start && !end ? 'Sempre ativo' : `${start ? dateTime(row.start_at) : 'Agora'} até ${end ? dateTime(row.end_at) : 'sem data final'}`;
    return { key: 'active', label: 'Ativo', detail };
  }
  function bannerLivePreviewImage(url) {
    const stage = $('#bannerPreviewStage');
    if (!stage) return;
    stage.style.backgroundImage = url ? `linear-gradient(90deg,rgba(3,32,82,.82),rgba(3,32,82,.12)),url("${String(url).replace(/"/g, '%22')}")` : '';
    stage.classList.toggle('has-image', Boolean(url));
  }
  function syncBannerPreview() {
    const title = $('[name="title"]')?.value.trim() || 'Título do banner';
    const subtitle = $('[name="subtitle"]')?.value.trim() || 'A mensagem principal aparecerá aqui para seus clientes.';
    const buttonText = $('[name="button_text"]')?.value.trim() || 'Ver produtos';
    const position = $('[name="position"]')?.value || 'home_hero';
    const alignment = $('[name="alignment"]')?.value || 'left';
    const mode = editorState?.bannerPreviewMode || 'desktop';
    const desktopUrl = editorState?.desktopPreviewUrl || editorState?.record?.image_desktop_url || '';
    const mobileUrl = editorState?.mobilePreviewUrl || editorState?.record?.image_mobile_url || desktopUrl;
    $('#bannerPreviewTitle').textContent = title;
    $('#bannerPreviewSubtitle').textContent = subtitle;
    $('#bannerPreviewButton').textContent = `${buttonText} →`;
    $('#bannerPreviewPosition').textContent = bannerPositionLabels[position] || position;
    $('#bannerPreviewStage')?.setAttribute('data-alignment', alignment);
    const selectedCount = $$('[name="campaign_products"]:checked').length;
    const productCount = $('#bannerPreviewProductCount');
    if (productCount) { productCount.textContent = selectedCount ? `${selectedCount} produto${selectedCount === 1 ? '' : 's'} selecionado${selectedCount === 1 ? '' : 's'}` : 'Produtos definidos pela categoria ou campanha'; }
    bannerLivePreviewImage(mode === 'mobile' ? mobileUrl : desktopUrl);
    const isExistingBanner = Boolean(editorState?.record);
    const isActiveBanner = Boolean($('[name="active"]')?.checked);
    $('#dialogEyebrow').textContent = !isExistingBanner ? '● Nova campanha' : (isActiveBanner ? '● Publicada no site' : '● Banner inativo');
    $('#dialogEyebrow').className = isExistingBanner && isActiveBanner ? 'is-live' : 'is-draft';
  }
  async function openBannerEditor(record = null) {
    if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.');
    resetEditorChrome();
    const [categoryResult, productResult, promotionResult, selectedResult, promotionOptionsResult] = await Promise.all([
      db.from('categories').select('id,name,slug').eq('active', true).order('sort_order'),
      db.from('products').select('id,name,sku,category_id,price,promotional_price,product_images(image_url,is_cover,sort_order)').is('deleted_at', null).eq('active', true).order('name'),
      record?.promotion_id ? db.from('promotions').select('*').eq('id', record.promotion_id).maybeSingle() : Promise.resolve({ data: null }),
      record?.promotion_id ? db.from('promotion_products').select('product_id').eq('promotion_id', record.promotion_id) : Promise.resolve({ data: [] }),
      db.from('promotions').select('id,title').order('title')
    ]);
    if (categoryResult.error) return toast(explain(categoryResult.error));
    if (productResult.error) return toast(explain(productResult.error));
    if (promotionResult.error) return toast(explain(promotionResult.error));
    if (selectedResult.error) return toast(explain(selectedResult.error));
    if (promotionOptionsResult.error) return toast(explain(promotionOptionsResult.error));
    const categories = categoryResult.data || [];
    const products = productResult.data || [];
    const promotion = promotionResult.data || null;
    const promotionOptions = promotionOptionsResult.data || [];
    const selectedProducts = new Set((selectedResult.data || []).map(item => String(item.product_id)));
    const campaignType = record?.campaign_type || (record?.position === 'home_hero' ? 'institutional' : 'custom');
    const categoryOptions = categories.map(item => `<option value="${item.id}" ${String(record?.category_id || promotion?.category_id || '') === String(item.id) ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
    const productOptions = products.map(product => {
      const cover = productCover(product);
      return `<label class="banner-product-option" data-product-category="${esc(product.category_id || '')}" data-product-search="${esc(`${product.name} ${product.sku || ''}`.toLowerCase())}"><input type="checkbox" name="campaign_products" value="${product.id}" ${selectedProducts.has(String(product.id)) ? 'checked' : ''}><span>${cover ? `<img src="${esc(cover)}" alt="">` : '<i>▦</i>'}<span><b>${esc(product.name)}</b><small>${product.sku ? esc(product.sku) : 'SKU não informado'} · ${brl(product.promotional_price ?? product.price)}</small></span></span></label>`;
    }).join('');
    editorState = { view: 'banners', config: configs.banners, record, promotion, promotionOptions, saveMode: 'publish', bannerPreviewMode: 'desktop', desktopPreviewUrl: '', mobilePreviewUrl: '', previewObjectUrls: [], products, categories };
    $('#editorDialog').classList.add('banner-editor-dialog');
    $('#dialogEyebrow').textContent = record ? (record.active === false ? '● Banner inativo' : '● Publicada no site') : '● Nova campanha';
    $('#dialogEyebrow').className = record && record.active !== false ? 'is-live' : 'is-draft';
    $('#dialogTitle').textContent = record ? `Editar banner — ${record.title}` : 'Novo banner';
    $('#saveDraftCategory').hidden = false;
    $('#saveDraftCategory').textContent = 'Salvar rascunho';
    $('#viewBannerSite').hidden = false;
    $('#viewBannerSite').onclick = () => window.open('index.html', '_blank', 'noopener');
    $('#saveEditor').textContent = 'Salvar e publicar';
    const permanent = !record?.start_at && !record?.end_at;
    const dateValue = value => value ? new Date(value).toISOString().slice(0, 16) : '';
    const destination = bannerDestination(record?.button_url);
    $('#editorFields').innerHTML = `<div class="banner-editor-layout">
      <div class="banner-editor-settings">
        <section class="banner-editor-section banner-campaign-setup"><header><span>1</span><div><h3>O que você quer divulgar?</h3><p>Escolha uma opção simples. O painel cuida dos detalhes técnicos.</p></div></header><div class="campaign-type-grid">
          ${[['promotion','Promoção','%'],['category','Categoria','▦'],['products','Produtos específicos','▤'],['new_arrivals','Novidades','✦'],['best_sellers','Mais vendidos','★'],['clearance','Liquidação','↓'],['institutional','Institucional','⌂'],['custom','Personalizado','✎']].map(([value,label,icon]) => `<label><input type="radio" name="campaign_type" value="${value}" ${campaignType === value ? 'checked' : ''}><span><i>${icon}</i><b>${label}</b></span></label>`).join('')}
        </div><div class="campaign-source-fields"><label>Categoria relacionada<select name="category_id"><option value="">Todas as categorias</option>${categoryOptions}</select></label><label>Formato da campanha<select name="content_mode"><option value="banner" ${record?.content_mode === 'banner' || !record?.content_mode ? 'selected' : ''}>Apenas banner</option><option value="banner_products" ${record?.content_mode === 'banner_products' ? 'selected' : ''}>Banner + produtos</option><option value="products" ${record?.content_mode === 'products' ? 'selected' : ''}>Apenas seção de produtos</option></select></label></div><label class="banner-switch-row"><span><b>Incluir automaticamente novos produtos da categoria</b><small>Produtos cadastrados depois também entram nesta campanha enquanto ela estiver ativa.</small></span><input name="auto_include_category" type="checkbox" ${record?.auto_include_category || promotion?.auto_include_category ? 'checked' : ''}><i></i></label>
        <div class="campaign-products"><div class="campaign-products-toolbar"><div><b>Produtos da campanha</b><small id="campaignProductCount">${selectedProducts.size} selecionado${selectedProducts.size === 1 ? '' : 's'}</small></div><label><span>⌕</span><input id="campaignProductSearch" type="search" placeholder="Pesquisar produto ou SKU"></label><button id="selectAllCampaignProducts" type="button" class="secondary">Selecionar todos</button></div><div class="campaign-product-list">${productOptions || '<p>Nenhum produto disponível.</p>'}</div></div>
        <div class="campaign-promotion-fields"><label>Tipo da promoção<select name="promotion_type"><option value="display_only" ${promotion?.promotion_type === 'display_only' || !promotion ? 'selected' : ''}>Apenas divulgar produtos</option><option value="percentage" ${promotion?.promotion_type === 'percentage' ? 'selected' : ''}>Desconto percentual</option><option value="fixed" ${promotion?.promotion_type === 'fixed' ? 'selected' : ''}>Desconto em valor</option><option value="individual" ${promotion?.promotion_type === 'individual' ? 'selected' : ''}>Preços promocionais individuais</option></select></label><label>Valor do desconto<input name="discount_value" type="number" min="0" step="0.01" value="${esc(promotion?.discount_value ?? '')}" placeholder="Ex.: 15"><small>Não altera o preço original do produto.</small></label></div></section>
        <section class="banner-editor-section"><header><span>2</span><div><h3>Imagem do banner</h3><p>Use arquivos separados para garantir o enquadramento ideal em cada tela.</p></div></header><div class="banner-image-pickers">
          <label><b>Imagem para desktop</b><span class="banner-upload-box" id="desktopBannerBox">${record?.image_desktop_url ? `<img src="${esc(record.image_desktop_url)}" alt="Imagem desktop atual">` : '<i>▣</i><strong>Selecionar imagem</strong><small>Recomendado: 1920 × 760 px</small>'}</span><input name="image_desktop_url" type="file" accept="image/jpeg,image/png,image/webp"></label>
          <label><b>Imagem para mobile</b><span class="banner-upload-box" id="mobileBannerBox">${record?.image_mobile_url ? `<img src="${esc(record.image_mobile_url)}" alt="Imagem mobile atual">` : '<i>▯</i><strong>Selecionar imagem</strong><small>Recomendado: 750 × 920 px</small>'}</span><input name="image_mobile_url" type="file" accept="image/jpeg,image/png,image/webp"></label>
        </div></section>
        <section class="banner-editor-section"><header><span>3</span><div><h3>Conteúdo</h3><p>Edite a mensagem que o cliente verá sobre a imagem.</p></div></header><div class="banner-fields"><label class="full">Título<input name="title" type="text" required value="${esc(record?.title || '')}" placeholder="Ex.: Sua casa com mais conforto"></label><label class="full">Subtítulo<textarea name="subtitle" placeholder="Explique a oferta em uma frase curta.">${esc(record?.subtitle || '')}</textarea></label><label>Texto do botão<input name="button_text" type="text" value="${esc(record?.button_text || '')}" placeholder="Ex.: Ver ofertas"></label><label>Alinhamento<select name="alignment"><option value="left" ${record?.alignment !== 'center' && record?.alignment !== 'right' ? 'selected' : ''}>À esquerda</option><option value="center" ${record?.alignment === 'center' ? 'selected' : ''}>Centralizado</option><option value="right" ${record?.alignment === 'right' ? 'selected' : ''}>À direita</option></select></label></div></section>
        <section class="banner-editor-section"><header><span>4</span><div><h3>Onde aparecerá?</h3><p>Escolha uma posição compreensível. Os códigos internos ficam ocultos.</p></div></header><div class="banner-fields"><label>Posição principal<select name="position" required><option value="home_hero" ${record?.position === 'home_hero' || !record ? 'selected' : ''}>Hero principal</option><option value="home_middle" ${record?.position === 'home_middle' ? 'selected' : ''}>Banner abaixo das categorias</option><option value="home_bottom" ${record?.position === 'home_bottom' ? 'selected' : ''}>Banner entre produtos / promoções</option></select></label><label>Ordem de exibição<input name="sort_order" type="number" min="0" step="1" value="${Number(record?.sort_order || 10)}"></label></div><div class="banner-location-checks"><label><input type="checkbox" name="display_location" value="home" checked> Página inicial</label><label><input type="checkbox" name="display_location" value="offers" ${(record?.display_locations || []).includes('offers') ? 'checked' : ''}> Página de ofertas</label><label><input type="checkbox" name="display_location" value="category" ${(record?.display_locations || []).includes('category') ? 'checked' : ''}> Página de categoria</label></div><label class="banner-switch-row"><span><b>Campanha publicada</b><small>Pode aparecer quando estiver dentro do período programado.</small></span><input name="active" type="checkbox" ${record?.active !== false ? 'checked' : ''}><i></i></label></section>
        <section class="banner-editor-section"><header><span>5</span><div><h3>Botão e destino</h3><p>Defina o que acontece quando o cliente clica no botão.</p></div></header><div class="banner-fields"><label>Destino<select name="link_type"><option value="link" ${(record?.link_type || destination.key) === 'link' ? 'selected' : ''}>Página ou link personalizado</option><option value="category" ${(record?.link_type || destination.key) === 'category' ? 'selected' : ''}>Categoria</option><option value="product" ${(record?.link_type || destination.key) === 'product' ? 'selected' : ''}>Produto</option><option value="promotion" ${(record?.link_type || destination.key) === 'promotion' ? 'selected' : ''}>Promoção</option></select></label><label id="bannerDestinationTargetWrap" hidden>Destino específico<select id="bannerDestinationTarget"><option value="">Selecione uma opção</option></select><small>O endereço é preenchido automaticamente.</small></label><label class="full">Endereço de destino<input name="button_url" type="text" value="${esc(record?.button_url || '')}" placeholder="#catalogo, ?product=... ou URL completa"><small id="bannerDestinationHelp">Use uma seção como #catalogo ou cole o endereço completo.</small></label></div></section>
        <section class="banner-editor-section"><header><span>6</span><div><h3>Quando essa campanha deve aparecer?</h3><p>Publique agora ou programe um período específico.</p></div></header><label class="banner-switch-row"><span><b>Publicar continuamente</b><small>Sem data de início ou encerramento.</small></span><input name="permanent" type="checkbox" ${permanent ? 'checked' : ''}><i></i></label><div class="banner-fields banner-schedule-fields"><label>Data e hora de início<input name="start_at" type="datetime-local" value="${esc(dateValue(record?.start_at))}" ${permanent ? 'disabled' : ''}></label><label>Data e hora de término<input name="end_at" type="datetime-local" value="${esc(dateValue(record?.end_at))}" ${permanent ? 'disabled' : ''}></label></div><label class="banner-switch-row"><span><b>Desativar automaticamente ao terminar</b><small>O site deixa de exibir a campanha após a data final.</small></span><input name="deactivate_on_end" type="checkbox" ${record?.deactivate_on_end !== false ? 'checked' : ''}><i></i></label><label class="banner-switch-row"><span><b>Manter produtos no catálogo depois da campanha</b><small>A campanha termina sem ocultar ou excluir nenhum produto.</small></span><input name="keep_products_after_end" type="checkbox" ${record?.keep_products_after_end !== false ? 'checked' : ''}><i></i></label></section>
      </div>
      <aside class="banner-live-preview"><div class="banner-preview-heading"><div><span>PRÉ-VISUALIZAÇÃO</span><b id="bannerPreviewPosition">${esc(bannerPositionLabels[record?.position] || 'Hero principal da Home')}</b></div><div class="banner-device-tabs" role="group" aria-label="Tamanho da prévia"><button class="is-active" type="button" data-banner-device="desktop">Desktop</button><button type="button" data-banner-device="tablet">Tablet</button><button type="button" data-banner-device="mobile">Celular</button></div></div><div class="banner-preview-canvas desktop" id="bannerPreviewCanvas"><div class="banner-preview-stage" id="bannerPreviewStage" data-alignment="${esc(record?.alignment || 'left')}"><div><small>ATACAREJO DOS MÓVEIS</small><strong id="bannerPreviewTitle">${esc(record?.title || 'Título do banner')}</strong><p id="bannerPreviewSubtitle">${esc(record?.subtitle || 'A mensagem principal aparecerá aqui para seus clientes.')}</p><em id="bannerPreviewProductCount">${selectedProducts.size ? `${selectedProducts.size} produto${selectedProducts.size === 1 ? '' : 's'} selecionado${selectedProducts.size === 1 ? '' : 's'}` : 'Produtos definidos pela categoria ou campanha'}</em><button id="bannerPreviewButton" type="button">${esc(record?.button_text || 'Ver produtos')} →</button></div></div></div><p>A prévia é atualizada enquanto você edita. O enquadramento final acompanha o tamanho da tela do cliente.</p></aside>
    </div>`;
    const permanentInput = $('[name="permanent"]');
    const syncSchedule = () => { $$('[name="start_at"], [name="end_at"]').forEach(input => { input.disabled = permanentInput.checked; if (permanentInput.checked) input.value = ''; }); };
    permanentInput.onchange = syncSchedule;
    $$('[name="title"], [name="subtitle"], [name="button_text"], [name="position"], [name="alignment"], [name="active"]').forEach(input => input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', syncBannerPreview));
    const updateCampaignProducts = () => {
      const categoryId = $('[name="category_id"]').value;
      const term = $('#campaignProductSearch').value.trim().toLowerCase();
      $$('.banner-product-option').forEach(option => { option.hidden = Boolean((categoryId && option.dataset.productCategory !== categoryId) || (term && !option.dataset.productSearch.includes(term))); });
      const count = $$('[name="campaign_products"]:checked').length;
      $('#campaignProductCount').textContent = `${count} selecionado${count === 1 ? '' : 's'}`;
      syncBannerPreview();
    };
    $('[name="category_id"]').onchange = updateCampaignProducts;
    $('#campaignProductSearch').oninput = updateCampaignProducts;
    $$('[name="campaign_products"]').forEach(input => input.onchange = updateCampaignProducts);
    $('#selectAllCampaignProducts').onclick = () => {
      const visible = $$('.banner-product-option').filter(option => !option.hidden);
      const shouldSelect = visible.some(option => !option.querySelector('input').checked);
      visible.forEach(option => { option.querySelector('input').checked = shouldSelect; });
      updateCampaignProducts();
    };
    const linkTypeInput = $('[name="link_type"]');
    const destinationTarget = $('#bannerDestinationTarget');
    const destinationTargetWrap = $('#bannerDestinationTargetWrap');
    const destinationUrlInput = $('[name="button_url"]');
    const syncDestinationOptions = () => {
      const type = linkTypeInput.value;
      const optionGroups = {
        category: categories.map(item => ({ value: `?category=${encodeURIComponent(item.slug)}#catalogo`, label: item.name })),
        product: products.map(item => ({ value: `?product=${encodeURIComponent(item.id)}`, label: item.sku ? `${item.name} · ${item.sku}` : item.name })),
        promotion: promotionOptions.map(item => ({ value: `?promotion=${encodeURIComponent(item.id)}#ofertas`, label: item.title }))
      };
      const choices = optionGroups[type] || [];
      destinationTargetWrap.hidden = type === 'link';
      destinationTarget.innerHTML = `<option value="">Selecione uma opção</option>${choices.map(item => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join('')}`;
      const current = destinationUrlInput.value.trim();
      const matched = choices.find(item => item.value === current);
      if (matched) destinationTarget.value = matched.value;
      $('#bannerDestinationHelp').textContent = type === 'link' ? 'Use uma seção como #catalogo ou cole o endereço completo.' : 'Escolha acima para preencher o destino automaticamente; o endereço ainda pode ser ajustado.';
    };
    linkTypeInput.onchange = syncDestinationOptions;
    destinationTarget.onchange = () => { if (destinationTarget.value) destinationUrlInput.value = destinationTarget.value; };
    syncDestinationOptions();
    $$('[name="campaign_type"]').forEach(input => input.onchange = () => { $('.campaign-promotion-fields').hidden = !['promotion', 'clearance'].includes(input.value); });
    const chosenCampaignType = $('[name="campaign_type"]:checked')?.value;
    $('.campaign-promotion-fields').hidden = !['promotion', 'clearance'].includes(chosenCampaignType);
    $('#saveDraftCategory').onclick = () => { editorState.saveMode = 'draft'; $('#editorForm').requestSubmit(); };
    $$('[data-banner-device]').forEach(button => button.onclick = () => {
      $$('[data-banner-device]').forEach(item => item.classList.toggle('is-active', item === button));
      editorState.bannerPreviewMode = button.dataset.bannerDevice;
      $('#bannerPreviewCanvas').className = `banner-preview-canvas ${button.dataset.bannerDevice}`;
      syncBannerPreview();
    });
    const bindImagePreview = (name, boxId, stateKey) => {
      const input = $(`[name="${name}"]`);
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        editorState.previewObjectUrls.push(url);
        editorState[stateKey] = url;
        $(`#${boxId}`).innerHTML = `<img src="${esc(url)}" alt="Nova imagem selecionada">`;
        syncBannerPreview();
      };
    };
    bindImagePreview('image_desktop_url', 'desktopBannerBox', 'desktopPreviewUrl');
    bindImagePreview('image_mobile_url', 'mobileBannerBox', 'mobilePreviewUrl');
    syncBannerPreview();
    $('#editorDialog').showModal();
  }
  async function saveBanner(event) {
    event.preventDefault();
    if (!editorState || !event.currentTarget.reportValidity()) return;
    const { record } = editorState;
    const form = event.currentTarget;
    const button = $('#saveEditor');
    let rollbackPromotionId = null;
    const uploadedImages = [];
    let persisted = false;
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
      const [bannerSchema, promotionSchema] = await Promise.all([
        db.from('banners').select('campaign_type,content_mode,display_locations,promotion_id').limit(1),
        db.from('promotions').select('promotion_type,discount_value,category_id,selection_mode').limit(1)
      ]);
      const schemaError = bannerSchema.error || promotionSchema.error;
      if (schemaError) throw schemaError;
      const permanent = form.elements.permanent.checked;
      const saveMode = editorState.saveMode || 'publish';
      const selectedProductIds = [...form.querySelectorAll('[name="campaign_products"]:checked')].map(input => input.value);
      const campaignType = form.querySelector('[name="campaign_type"]:checked')?.value || 'custom';
      const categoryId = form.elements.category_id.value || null;
      const startAt = permanent || !form.elements.start_at.value ? null : new Date(form.elements.start_at.value).toISOString();
      const endAt = permanent || !form.elements.end_at.value ? null : new Date(form.elements.end_at.value).toISOString();
      if (startAt && endAt && new Date(endAt) <= new Date(startAt)) throw new Error('A data final precisa ser posterior à data inicial.');
      if (saveMode === 'publish') {
        const categoryName = editorState.categories.find(item => String(item.id) === String(categoryId))?.name || 'Todas as categorias';
        const summary = `${form.elements.title.value.trim()}\n\n${selectedProductIds.length} produto(s) selecionado(s)\n${categoryName}\n${startAt ? dateTime(startAt) : 'Publicar agora'} → ${endAt ? dateTime(endAt) : 'sem data final'}`;
        if (!await confirmAction({ title: 'Confirmar publicação?', message: summary, confirmLabel: 'Salvar e publicar' })) { button.disabled = false; button.textContent = 'Salvar e publicar'; return; }
      }
      const values = {
        title: form.elements.title.value.trim(), subtitle: form.elements.subtitle.value.trim() || null,
        button_text: form.elements.button_text.value.trim() || null, button_url: form.elements.button_url.value.trim() || null,
        position: form.elements.position.value, sort_order: Number(form.elements.sort_order.value || 0), active: saveMode === 'publish' && form.elements.active.checked,
        start_at: startAt, end_at: endAt, campaign_type: campaignType, content_mode: form.elements.content_mode.value,
        category_id: categoryId, link_type: form.elements.link_type.value, alignment: form.elements.alignment.value,
        display_locations: [...form.querySelectorAll('[name="display_location"]:checked')].map(input => input.value),
        draft: saveMode === 'draft', paused: false, auto_include_category: form.elements.auto_include_category.checked,
        deactivate_on_end: form.elements.deactivate_on_end.checked, keep_products_after_end: form.elements.keep_products_after_end.checked
      };
      for (const key of ['image_desktop_url', 'image_mobile_url']) {
        const file = form.elements[key].files?.[0];
        if (file) {
          const saved = await upload('banners', file, record?.id || 'novos');
          uploadedImages.push({ key, ...saved });
          values[key] = saved.url;
        }
      }
      const needsPromotion = ['promotion', 'category', 'products', 'new_arrivals', 'best_sellers', 'clearance'].includes(campaignType) || selectedProductIds.length > 0;
      let promotionId = record?.promotion_id || null;
      if (needsPromotion) {
        const promotionValues = {
          title: values.title, description: values.subtitle, start_at: startAt, end_at: endAt, active: values.active,
          banner_url: values.image_desktop_url || record?.image_desktop_url || null,
          promotion_type: form.elements.promotion_type.value, discount_value: form.elements.discount_value.value === '' ? null : Number(form.elements.discount_value.value),
          category_id: categoryId, selection_mode: form.elements.auto_include_category.checked ? 'all_category' : 'manual', auto_include_category: form.elements.auto_include_category.checked
        };
        const promotionSave = promotionId ? await db.from('promotions').update(promotionValues).eq('id', promotionId).select().single() : await db.from('promotions').insert(promotionValues).select().single();
        if (promotionSave.error) throw promotionSave.error;
        promotionId = promotionSave.data.id;
        if (!record?.promotion_id) rollbackPromotionId = promotionId;
        const { error: clearLinksError } = await db.from('promotion_products').delete().eq('promotion_id', promotionId);
        if (clearLinksError) throw clearLinksError;
        if (selectedProductIds.length) {
          const { error: linkError } = await db.from('promotion_products').insert(selectedProductIds.map(productId => ({ promotion_id: promotionId, product_id: productId })));
          if (linkError) throw linkError;
        }
      }
      values.promotion_id = promotionId;
      const result = record ? await db.from('banners').update(values).eq('id', record.id).select().single() : await db.from('banners').insert(values).select().single();
      if (result.error) {
        if (result.error.code === '42703' || /campaign_type|content_mode|promotion_id|display_locations/i.test(result.error.message || '')) throw new Error('Execute a migration 20260920_visual_campaign_manager.sql no Supabase antes de salvar campanhas completas.');
        throw result.error;
      }
      persisted = true;
      for (const saved of uploadedImages) {
        const previousUrl = record?.[saved.key];
        if (previousUrl && previousUrl !== saved.url) await removeUnusedBannerImage(previousUrl);
      }
      rollbackPromotionId = null;
      notifyStorefront('banners');
      $('#editorDialog').close();
      toast(saveMode === 'draft' ? 'Campanha salva como rascunho.' : 'Campanha publicada e sincronizada com o site.');
      render('banners');
    } catch (error) {
      if (!persisted) await Promise.all(uploadedImages.map(saved => db.storage.from(saved.bucket).remove([saved.path])));
      if (rollbackPromotionId) await db.from('promotions').delete().eq('id', rollbackPromotionId);
      if (error?.code === '42703' || /campaign_type|content_mode|promotion_id|promotion_type|display_locations/i.test(error?.message || '')) toast('Execute a migration 20260920_visual_campaign_manager.sql no Supabase antes de salvar campanhas completas.');
      else toast(explain(error));
    }
    finally { button.disabled = false; button.textContent = 'Salvar e publicar'; }
  }
  async function openEditor(view, record = null) {
    if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.');
    if (view === 'categories') return openCategoryEditor(record);
    if (view === 'banners') return openBannerEditor(record);
    resetEditorChrome();
    const config = configs[view];
    editorState = { view, config, record };
    $('#dialogEyebrow').textContent = config.singular.toUpperCase();
    $('#dialogTitle').textContent = `${record ? 'Editar' : 'Novo'} ${config.singular.toLowerCase()}`;
    $('#editorFields').innerHTML = (await Promise.all(config.fields.map(field => fieldHtml(field, record || {})))).join('');
    const source = $('[name="name"], [name="title"]', $('#editorFields'));
    const slug = $('[name="slug"]', $('#editorFields'));
    if (source && slug && !record) source.addEventListener('input', () => { slug.value = slugify(source.value); });
    if (view === 'inspirations' && record) await loadGallery(record.id, 'inspiration_images', 'inspiration_id');
    if (['promotions', 'coupons'].includes(view)) await loadProductPicker(view, record?.id);
    $('#editorDialog').showModal();
  }
  async function loadProductPicker(view, recordId) {
    const linkTable = view === 'promotions' ? 'promotion_products' : 'coupon_products';
    const ownerKey = view === 'promotions' ? 'promotion_id' : 'coupon_id';
    const [productResult, selectedResult] = await Promise.all([
      db.from('products').select('id,name,sku').is('deleted_at', null).order('name'),
      recordId ? db.from(linkTable).select('product_id').eq(ownerKey, recordId) : Promise.resolve({ data: [] })
    ]);
    if (productResult.error) throw productResult.error;
    if (selectedResult.error) throw selectedResult.error;
    const selected = new Set((selectedResult.data || []).map(item => item.product_id));
    $('#editorFields').insertAdjacentHTML('beforeend', `<div class="field full"><label for="f-participants">Produtos participantes</label><select id="f-participants" name="participant_products" multiple size="7">${(productResult.data || []).map(item => `<option value="${item.id}" ${selected.has(item.id) ? 'selected' : ''}>${esc(item.name)}${item.sku ? ` · ${esc(item.sku)}` : ''}</option>`).join('')}</select><small class="helper">Use Ctrl para selecionar mais de um produto.</small></div>`);
  }
  async function saveProductLinks(view, recordId, form) {
    if (!['promotions', 'coupons'].includes(view)) return;
    const linkTable = view === 'promotions' ? 'promotion_products' : 'coupon_products';
    const ownerKey = view === 'promotions' ? 'promotion_id' : 'coupon_id';
    const selected = [...form.elements.participant_products.selectedOptions].map(option => option.value);
    const { error: clearError } = await db.from(linkTable).delete().eq(ownerKey, recordId);
    if (clearError) throw clearError;
    if (selected.length) {
      const { error: insertError } = await db.from(linkTable).insert(selected.map(productId => ({ [ownerKey]: recordId, product_id: productId })));
      if (insertError) throw insertError;
    }
  }
  async function loadGallery(parentId, table, foreignKey) {
    const productGallery = table === 'product_images';
    const bucket = productGallery ? 'products' : 'inspirations';
    const { data, error } = await db.from(table).select('*').eq(foreignKey, parentId).order('sort_order');
    if (error) throw error;
    if (productGallery && editorState?.view === 'products') editorState.existingGalleryCount = (data || []).length;
    const root = $('#existingGallery');
    if (!root) return;
    root.innerHTML = (data || []).map((item, index, rows) => `<figure data-image-id="${item.id}"><img src="${esc(item.image_url)}" alt="Foto ${index + 1}"><figcaption>${productGallery && item.is_cover ? '<b>Imagem principal</b>' : `Foto ${index + 1}`}</figcaption><div class="gallery-actions">${productGallery && !item.is_cover ? `<button type="button" data-image-cover="${item.id}">Principal</button>` : ''}<button type="button" data-image-move="up" ${index === 0 ? 'disabled' : ''} aria-label="Mover foto para a esquerda">←</button><button type="button" data-image-move="down" ${index === rows.length - 1 ? 'disabled' : ''} aria-label="Mover foto para a direita">→</button><button type="button" class="danger" data-image-delete="${item.id}" aria-label="Excluir foto">×</button></div></figure>`).join('');
    $$('[data-image-cover]', root).forEach(button => button.onclick = async () => {
      const { error: clearError } = await db.from(table).update({ is_cover: false }).eq(foreignKey, parentId);
      if (clearError) return toast(explain(clearError));
      const { error: coverError } = await db.from(table).update({ is_cover: true }).eq('id', button.dataset.imageCover);
      if (coverError) return toast(explain(coverError));
      notifyStorefront('product_images'); toast('Imagem principal atualizada.'); await loadGallery(parentId, table, foreignKey);
    });
    $$('[data-image-move]', root).forEach(button => button.onclick = async () => {
      const figure = button.closest('figure');
      const figures = $$('figure', root);
      const from = figures.indexOf(figure);
      const to = button.dataset.imageMove === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= figures.length) return;
      const firstId = figures[from].dataset.imageId;
      const secondId = figures[to].dataset.imageId;
      const updates = await Promise.all([
        db.from(table).update({ sort_order: to }).eq('id', firstId),
        db.from(table).update({ sort_order: from }).eq('id', secondId)
      ]);
      const moveError = updates.find(result => result.error)?.error;
      if (moveError) return toast(explain(moveError));
      notifyStorefront(table); await loadGallery(parentId, table, foreignKey);
    });
    $$('[data-image-delete]', root).forEach(button => button.onclick = () => runAction(button, async () => {
      if (!await confirmAction({ title: 'Remover esta imagem?', message: 'A imagem será removida deste item. Esta ação não poderá ser desfeita.', confirmLabel: 'Remover', tone: 'danger' })) return;
      const item = (data || []).find(image => image.id === button.dataset.imageDelete);
      const { error: deleteError } = await db.from(table).delete().eq('id', button.dataset.imageDelete);
      if (deleteError) return toast(explain(deleteError), 'error');
      if (item?.storage_path && /\/storage\/v1\/object\//.test(item.image_url || '')) await db.storage.from(bucket).remove([item.storage_path]);
      if (productGallery && item?.is_cover) {
        const { data: next } = await db.from(table).select('id').eq(foreignKey, parentId).order('sort_order').limit(1).maybeSingle();
        if (next) await db.from(table).update({ is_cover: true }).eq('id', next.id);
      }
      notifyStorefront(table); toast('Imagem removida.'); await loadGallery(parentId, table, foreignKey);
    }));
  }
  const imageUploadRules = {
    products: { maxDimension: 1800, quality: .84 },
    categories: { maxDimension: 1400, quality: .84 },
    banners: { maxDimension: 1920, quality: .86 },
    environments: { maxDimension: 1400, quality: .84 },
    inspirations: { maxDimension: 1800, quality: .84 },
    brands: { maxDimension: 1200, quality: .88 },
    site: { maxDimension: 1920, quality: .86 }
  };
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const maxImageBytes = 8 * 1024 * 1024;
  async function optimizeImage(file, bucket) {
    const rules = imageUploadRules[bucket] || imageUploadRules.site;
    if (!allowedImageTypes.has(file.type)) throw new Error('Formato inválido. Envie uma imagem JPG, PNG ou WebP.');
    if (file.size > maxImageBytes) throw new Error('A imagem deve ter no máximo 8 MB.');
    let bitmap;
    try { bitmap = await createImageBitmap(file); }
    catch { throw new Error('Não foi possível processar esta imagem. Escolha outro arquivo.'); }
    const largestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, rules.maxDimension / largestSide);
    if (scale === 1 && file.size <= 900 * 1024 && file.type === 'image/webp') { bitmap.close?.(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', rules.quality));
    if (!blob) throw new Error('Não foi possível otimizar esta imagem.');
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'imagem'}.webp`;
    return new File([blob], name, { type: 'image/webp', lastModified: file.lastModified });
  }
  function storageReference(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url, location.href);
      const marker = '/storage/v1/object/public/';
      const index = parsed.pathname.indexOf(marker);
      if (index < 0) return null;
      const [bucket, ...parts] = parsed.pathname.slice(index + marker.length).split('/');
      if (!bucket || !parts.length) return null;
      return { bucket: decodeURIComponent(bucket), path: parts.map(decodeURIComponent).join('/') };
    } catch { return null; }
  }
  async function removeStoredUrl(url, expectedBucket = '') {
    const reference = storageReference(url);
    if (!reference || (expectedBucket && reference.bucket !== expectedBucket)) return;
    const { error } = await db.storage.from(reference.bucket).remove([reference.path]);
    if (error) console.warn('Não foi possível remover a imagem substituída do Storage.', error);
  }
  async function removeUnusedBannerImage(url) {
    if (!storageReference(url)) return;
    const [banners, promotions] = await Promise.all([db.from('banners').select('image_desktop_url,image_mobile_url'), db.from('promotions').select('banner_url')]);
    if (banners.error || promotions.error) return console.warn('Não foi possível verificar referências da imagem; o arquivo foi mantido por segurança.', banners.error || promotions.error);
    const usedByBanner = (banners.data || []).some(item => item.image_desktop_url === url || item.image_mobile_url === url);
    const usedByPromotion = (promotions.data || []).some(item => item.banner_url === url);
    if (!usedByBanner && !usedByPromotion) await removeStoredUrl(url, 'banners');
  }
  async function upload(bucket, file, folder = '') {
    const optimized = await optimizeImage(file, bucket);
    const extension = 'webp';
    const path = `${folder ? folder + '/' : ''}${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from(bucket).upload(path, optimized, { cacheControl: '31536000', contentType: optimized.type, upsert: false });
    if (error) throw error;
    return { url: db.storage.from(bucket).getPublicUrl(path).data.publicUrl, path, bucket };
  }
  function formValues(fields, form) {
    const values = {};
    fields.forEach(([key, , type]) => {
      const input = form.elements[key];
      if (!input || ['file', 'multifile'].includes(type)) return;
      if (type === 'checkbox') values[key] = input.checked;
      else if (type === 'number') values[key] = input.value === '' ? null : Number(input.value);
      else if (type === 'datetime-local') values[key] = input.value ? new Date(input.value).toISOString() : null;
      else if (type === 'relation') values[key] = input.value || null;
      else values[key] = input.value.trim();
    });
    return values;
  }
  async function saveGallery(parentId, input, view, options = {}) {
    const files = options.files ? [...options.files] : [...(input?.files || [])];
    if (!files.length) return;
    const product = view === 'products';
    const table = product ? 'product_images' : 'inspiration_images';
    const foreignKey = product ? 'product_id' : 'inspiration_id';
    const bucket = product ? 'products' : 'inspirations';
    const { count: total } = await db.from(table).select('id', { count: 'exact', head: true }).eq(foreignKey, parentId);
    const max = product ? 10 : 4;
    if ((total || 0) + files.length > max) throw new Error(`Envie no máximo ${max} fotos.`);
    const created = [];
    let previousCoverId = null;
    if (product && options.coverFile) {
      const { data: previousCover, error: previousCoverError } = await db.from(table).select('id').eq(foreignKey, parentId).eq('is_cover', true).limit(1).maybeSingle();
      if (previousCoverError) throw previousCoverError;
      previousCoverId = previousCover?.id || null;
    }
    try {
      for (let index = 0; index < files.length; index++) {
        const saved = await upload(bucket, files[index], parentId);
        const row = { [foreignKey]: parentId, image_url: saved.url, storage_path: saved.path, sort_order: (total || 0) + index };
        if (product) row.is_cover = !options.coverFile && (total || 0) + index === 0;
        const { data, error } = await db.from(table).insert(row).select('id').single();
        if (error) { await db.storage.from(bucket).remove([saved.path]); throw error; }
        created.push({ id: data.id, path: saved.path, file: files[index] });
      }
      if (product && options.coverFile) {
        const target = created.find(item => item.file === options.coverFile);
        if (target) {
          const { error: clearCoverError } = await db.from(table).update({ is_cover: false }).eq(foreignKey, parentId);
          if (clearCoverError) throw clearCoverError;
          const { error: newCoverError } = await db.from(table).update({ is_cover: true }).eq('id', target.id);
          if (newCoverError) {
            if (previousCoverId) await db.from(table).update({ is_cover: true }).eq('id', previousCoverId);
            throw newCoverError;
          }
        }
      }
      return created;
    } catch (error) {
      for (const item of created.reverse()) {
        await db.from(table).delete().eq('id', item.id);
        await db.storage.from(bucket).remove([item.path]);
      }
      throw error;
    }
  }
  async function saveGeneric(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!editorState || !form?.reportValidity()) return;
    const { view, config, record } = editorState;
    const button = $('#saveEditor');
    button.disabled = true;
    button.textContent = 'Salvando…';
    const uploadedFiles = [];
    let persisted = false;
    let createdRecordId = null;
    let completed = false;
    try {
      const values = formValues(config.fields, form);
      if (view === 'environments' && !values.icon_key) values.icon_key = CategoryIcons.keyFor(values.name);
      if (view === 'sections') {
        try { values.content = values.content_text ? JSON.parse(values.content_text) : {}; }
        catch { throw new Error('O conteúdo JSON da seção não é válido.'); }
        delete values.content_text;
      }
      for (const [key, , type] of config.fields) {
        const file = type === 'file' ? form.elements[key]?.files?.[0] : null;
        if (file) {
          const saved = await upload(config.bucket, file, view);
          uploadedFiles.push({ key, ...saved });
          values[key] = saved.url;
        }
      }
      const result = record
        ? await db.from(config.table).update(values).eq('id', record.id).select().single()
        : await db.from(config.table).insert(values).select().single();
      if (result.error) throw result.error;
      persisted = true;
      if (!record) createdRecordId = result.data.id;
      for (const saved of uploadedFiles) {
        const previousUrl = record?.[saved.key];
        if (previousUrl && previousUrl !== saved.url) await removeStoredUrl(previousUrl, config.bucket);
      }
      await saveProductLinks(view, result.data.id, form);
      if (config.fields.some(field => field[2] === 'multifile')) await saveGallery(result.data.id, form.elements.gallery, view);
      completed = true;
      $('#editorDialog').close();
      notifyStorefront(config.table);
      toast(`${config.singular} salvo com sucesso.`);
      render(view);
    } catch (error) {
      if (createdRecordId && !completed) {
        const { error: rollbackError } = await db.from(config.table).delete().eq('id', createdRecordId);
        if (!rollbackError) await Promise.all(uploadedFiles.map(saved => db.storage.from(saved.bucket).remove([saved.path])));
      } else if (!persisted) await Promise.all(uploadedFiles.map(saved => db.storage.from(saved.bucket).remove([saved.path])));
      toast(view === 'environments' && /icon_key/i.test(error.message || '') ? 'Execute a migration 20260925_category_icon_keys.sql no Supabase antes de salvar os ícones.' : explain(error));
    }
    finally { button.disabled = false; button.textContent = 'Salvar alterações'; }
  }
  async function normalizeCategoryPosition(categoryId, position, environmentId) {
    const { data, error } = await db.from('categories').select('id,sort_order,created_at,environment_id').eq('environment_id', environmentId).order('sort_order').order('created_at');
    if (error) throw error;
    const ordered = (data || []).filter(item => String(item.id) !== String(categoryId));
    ordered.splice(Math.max(0, Math.min(ordered.length, Number(position || 1) - 1)), 0, { id: categoryId });
    const updates = await Promise.all(ordered.map((item, index) => db.from('categories').update({ sort_order: (index + 1) * 10 }).eq('id', item.id)));
    const updateError = updates.find(result => result.error)?.error;
    if (updateError) throw updateError;
  }
  async function deleteCategorySafely(record) {
    if (!record || !canWrite()) { toast('Seu perfil possui acesso somente para consulta.', 'error'); return false; }
    const { count: productCount, error: countError } = await db.from('products').select('id', { count: 'exact', head: true }).eq('category_id', record.id);
    if (countError) { toast(explain(countError), 'error'); return false; }
    if (productCount) {
      toast(`A categoria “${record.name}” possui ${productCount} produto${productCount === 1 ? '' : 's'}. Reatribua os produtos antes de excluí-la.`, 'error');
      return false;
    }
    if (!await confirmAction({ title: 'Excluir esta categoria?', message: `“${record.name}” não possui produtos vinculados e será excluída permanentemente.`, confirmLabel: 'Excluir', tone: 'danger' })) return false;
    const { error } = await db.from('categories').delete().eq('id', record.id);
    if (error) { toast(explain(error), 'error'); return false; }
    await removeStoredUrl(record.image_url, 'categories');
    notifyStorefront('categories');
    toast('Categoria excluída com sucesso.');
    return true;
  }
  async function saveCategory(event) {
    event.preventDefault();
    if (!editorState || !event.currentTarget.reportValidity()) return;
    const { record, saveMode } = editorState;
    const button = $('#saveEditor');
    const draftButton = $('#saveDraftCategory');
    button.disabled = true;
    draftButton.disabled = true;
    button.textContent = saveMode === 'draft' ? 'Salvando rascunho…' : 'Publicando…';
    let uploadedImage = null;
    let persisted = false;
    let createdCategoryId = null;
    let completed = false;
    try {
      const form = event.currentTarget;
      const values = {
        environment_id: form.elements.environment_id.value,
        name: form.elements.name.value.trim(),
        slug: slugify(form.elements.slug.value || form.elements.name.value),
        description: form.elements.description.value.trim() || null,
        search_keywords: form.elements.search_keywords.value.trim() || null,
        icon_key: form.elements.icon_key.value || CategoryIcons.keyFor(form.elements.name.value, form.elements.environment_id.selectedOptions[0]?.textContent),
        active: saveMode === 'draft' ? false : form.elements.active.checked,
        show_on_homepage: form.elements.show_on_homepage.checked,
        show_in_menu: form.elements.show_in_menu.checked
      };
      const file = form.elements.image_url.files?.[0];
      if (file) { uploadedImage = await upload('categories', file, 'categories'); values.image_url = uploadedImage.url; }
      else if (editorState.removeImage) values.image_url = null;
      const result = record
        ? await db.from('categories').update(values).eq('id', record.id).select().single()
        : await db.from('categories').insert(values).select().single();
      if (result.error) {
        if (result.error.code === '42703' && /icon_key/i.test(result.error.message || '')) throw new Error('Execute a migration 20260925_category_icon_keys.sql no Supabase antes de salvar os ícones.');
        if (result.error.code === '42703' || /show_on_homepage|show_in_menu/i.test(result.error.message || '')) throw new Error('Execute a migration 20260920_category_visibility_options.sql no Supabase antes de salvar.');
        throw result.error;
      }
      persisted = true;
      if (!record) createdCategoryId = result.data.id;
      if ((uploadedImage || editorState.removeImage) && record?.image_url && record.image_url !== values.image_url) await removeStoredUrl(record.image_url, 'categories');
      await normalizeCategoryPosition(result.data.id, form.elements.position_index.value, values.environment_id);
      completed = true;
      notifyStorefront('categories');
      $('#editorDialog').close();
      toast(saveMode === 'draft' ? 'Subcategoria salva como rascunho.' : 'Subcategoria salva e publicada no site.');
      render('categories');
    } catch (error) {
      if (createdCategoryId && !completed) {
        const { error: rollbackError } = await db.from('categories').delete().eq('id', createdCategoryId);
        if (!rollbackError && uploadedImage) await db.storage.from(uploadedImage.bucket).remove([uploadedImage.path]);
      } else if (uploadedImage && !persisted) await db.storage.from(uploadedImage.bucket).remove([uploadedImage.path]);
      toast(explain(error));
    }
    finally {
      if (editorState) editorState.saveMode = 'publish';
      button.disabled = false;
      draftButton.disabled = false;
      button.textContent = editorState?.view === 'categories' ? 'Salvar e publicar' : 'Salvar alterações';
    }
  }
  function categoryRow(row, productCount) {
    const countLabel = `${productCount} produto${productCount === 1 ? '' : 's'}`;
    const actions = ActionMenu({
      id: `category-${row.id}`,
      label: row.name,
      primary: { label: 'Editar', icon: 'edit', attributes: { 'data-category-edit': row.id } },
      actions: [
        { label: 'Visualizar', icon: 'view', attributes: { 'data-category-view': row.id } },
        { label: 'Editar', icon: 'edit', attributes: { 'data-category-edit': row.id } },
        { label: 'Duplicar', icon: 'copy', attributes: { 'data-category-duplicate': row.id } },
        { label: row.active ? 'Desativar' : 'Ativar', icon: row.active ? 'pause' : 'play', attributes: { 'data-category-toggle': row.id } },
        { separator: true },
        { label: 'Excluir', icon: 'trash', danger: true, attributes: { 'data-category-delete': row.id } }
      ]
    });
    return `<tr data-category-id="${row.id}" data-environment-id="${esc(row.environment_id || '')}" data-name="${esc(row.name.toLowerCase())}" data-active="${row.active}" data-order="${Number(row.sort_order || 0)}">
      <td class="category-drag-cell"><span class="category-drag" draggable="${canWrite()}" title="Arraste para reordenar" aria-label="Reordenar ${esc(row.name)}">⠿</span></td>
      <td><div class="category-identity"><span class="category-thumb-placeholder" aria-hidden="true">${CategoryIcons.icon(row.icon_key||row.name,{environment:row.environments?.name,size:32})}</span><span><b>${esc(row.name)}</b><small>${countLabel}</small></span></div></td>
      <td><span class="product-category-chip">${esc(row.environments?.name || 'Sem ambiente')}</span></td>
      <td class="category-slug">${esc(row.slug)}</td>
      <td>${Number(row.sort_order || 0)}</td>
      <td><span class="badge ${row.active ? '' : 'off'}"><i aria-hidden="true"></i>${row.active ? 'Ativo' : 'Inativo'}</span></td>
      <td class="category-actions action-cell">${actions}</td>
    </tr>`;
  }
  async function renderCategories(revision) {
    const [categoryResult, productResult] = await Promise.all([
      db.from('categories').select('*,environments(name)').order('sort_order').order('created_at', { ascending: false }),
      db.from('products').select('category_id').is('deleted_at', null)
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (productResult.error) throw productResult.error;
    if (revision !== viewRevision) return;
    const rows = categoryResult.data || [];
    const productCounts = (productResult.data || []).reduce((counts, product) => {
      if (product.category_id) counts.set(product.category_id, (counts.get(product.category_id) || 0) + 1);
      return counts;
    }, new Map());
    const active = rows.filter(row => row.active).length;
    const inactive = rows.length - active;
    $('#content').innerHTML = `<div class="category-metrics">
      <article class="category-metric total"><span class="metric-icon" aria-hidden="true">▱</span><div><b>${rows.length}</b><small>Total de subcategorias</small></div></article>
      <article class="category-metric active"><span class="metric-icon" aria-hidden="true">✓</span><div><b>${active}</b><small>Subcategorias ativas</small></div></article>
      <article class="category-metric inactive"><span class="metric-icon" aria-hidden="true">−</span><div><b>${inactive}</b><small>Subcategorias inativas</small></div></article>
    </div>
    <div class="category-toolbar card"><label class="category-search"><span aria-hidden="true">⌕</span><input id="searchList" type="search" placeholder="Pesquisar subcategoria ou ambiente..."></label><label class="inline-filter"><span>Ambiente:</span><select id="categoryEnvironment"><option value="">Todos</option>${[...new Map(rows.filter(row=>row.environment_id).map(row=>[row.environment_id,row.environments?.name||'Sem ambiente'])).entries()].map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('')}</select></label><label class="inline-filter"><span>Status:</span><select id="categoryStatus"><option value="">Todas</option><option value="true">Ativas</option><option value="false">Inativas</option></select></label><label class="inline-filter"><span>Ordenar por:</span><select id="categorySort"><option value="order">Posição no ambiente</option><option value="name">Nome (A–Z)</option><option value="order-desc">Posição inversa</option></select></label><div class="category-view-toggle" role="group" aria-label="Modo de visualização"><button type="button" data-category-view-mode="list" aria-label="Visualização em lista">☷</button><button class="is-active" type="button" data-category-view-mode="grid" aria-label="Visualização em grade">▦</button></div></div>
    <div class="card table-wrap category-table-card grid-mode" id="categoryTableCard">${rows.length ? `<table class="data-table category-table"><thead><tr><th>#</th><th>Subcategoria</th><th>Ambiente</th><th>Identificação</th><th>Posição</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(row => categoryRow(row, productCounts.get(row.id) || 0)).join('')}</tbody></table>` : '<div class="empty"><h2>Nenhuma subcategoria cadastrada</h2><p>Comece adicionando a primeira subcategoria.</p></div>'}</div>
    <div id="categoryFilterEmpty" class="card empty admin-empty" hidden><span class="admin-empty-icon" aria-hidden="true">⌕</span><h2>Nenhuma subcategoria encontrada</h2><p>Tente ajustar a busca ou os filtros.</p></div>
    <div class="category-pagination card" ${rows.length ? "" : "hidden"}><span id="categoryCount">Mostrando ${Math.min(rows.length, 20)} de ${rows.length} subcategorias</span><div><button id="categoryPrev" type="button" aria-label="Página anterior">‹</button><span id="categoryPage" aria-live="polite">Página 1</span><button id="categoryNext" type="button" aria-label="Próxima página">›</button><select id="categoryPageSize" aria-label="Itens por página"><option value="20">20 por página</option><option value="40">40 por página</option><option value="80">80 por página</option></select></div></div>`;
    const pageAction = $('#pageAction');
    pageAction.hidden = false;
    pageAction.textContent = '+  Nova subcategoria';
    pageAction.onclick = () => openEditor('categories');

    const rowFor = id => rows.find(row => String(row.id) === String(id));
    $$('[data-category-edit], [data-category-view]').forEach(button => button.onclick = () => openEditor('categories', rowFor(button.dataset.categoryEdit || button.dataset.categoryView)));
    $$('[data-category-toggle]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const record = rowFor(button.dataset.categoryToggle);
      const verb = record.active ? 'desativar' : 'ativar';
      if (!await confirmAction({ title: `${record.active ? 'Desativar' : 'Ativar'} esta categoria?`, message: `A categoria “${record.name}” será ${verb === 'desativar' ? 'ocultada da loja' : 'publicada novamente na loja'}.`, confirmLabel: record.active ? 'Desativar' : 'Ativar' })) return;
      const { error } = await db.from('categories').update({ active: !record.active }).eq('id', record.id);
      if (error) return toast(explain(error), 'error');
      notifyStorefront('categories'); toast(record.active ? 'Categoria desativada.' : 'Categoria ativada.'); render('categories');
    }));
    $$('[data-category-duplicate]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const record = rowFor(button.dataset.categoryDuplicate);
      const copy = { environment_id: record.environment_id, name: `${record.name} — cópia`, slug: `${record.slug}-copia-${Date.now().toString().slice(-6)}`, description: record.description, search_keywords: record.search_keywords, icon_key: record.icon_key||CategoryIcons.keyFor(record.name, record.environments?.name), image_url: record.image_url, sort_order: Number(record.sort_order || 0) + 1, active: false, show_on_homepage: record.show_on_homepage !== false, show_in_menu: record.show_in_menu !== false };
      const { error } = await db.from('categories').insert(copy);
      if (error) return toast(explain(error), 'error');
      notifyStorefront('categories'); toast('Subcategoria duplicada como inativa.'); render('categories');
    }));
    $$('[data-category-delete]').forEach(button => button.onclick = () => runAction(button, async () => {
      const record = rowFor(button.dataset.categoryDelete);
      if (await deleteCategorySafely(record)) render('categories');
    }));

    let categoryPage = 1;
    const applyCategoryFilters = (resetPage = false) => {
      if (resetPage) categoryPage = 1;
      const term = $('#searchList').value.trim().toLowerCase();
      const environmentId = $('#categoryEnvironment').value;
      const status = $('#categoryStatus').value;
      const sort = $('#categorySort').value;
      const pageSize = Number($('#categoryPageSize').value);
      const body = $('.category-table tbody');
      if (!body) return;
      const elements = $$('tr', body).sort((left, right) => {
        if (sort === 'name') return left.dataset.name.localeCompare(right.dataset.name, 'pt-BR');
        const direction = sort === 'order-desc' ? -1 : 1;
        return (Number(left.dataset.order) - Number(right.dataset.order)) * direction;
      });
      elements.forEach(row => body.append(row));
      const matches = elements.filter(row => (!term || row.textContent.toLowerCase().includes(term)) && (!environmentId || row.dataset.environmentId === environmentId) && (!status || row.dataset.active === status));
      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
      categoryPage = Math.min(categoryPage, pageCount);
      const start = (categoryPage - 1) * pageSize;
      const visible = new Set(matches.slice(start, start + pageSize));
      elements.forEach(row => { row.hidden = !visible.has(row); });
      $('#categoryCount').textContent = matches.length ? `Mostrando ${start + 1}–${Math.min(start + pageSize, matches.length)} de ${matches.length} subcategorias` : 'Nenhuma subcategoria encontrada';
      $('#categoryFilterEmpty').hidden = matches.length > 0;
      $('#categoryPage').textContent = `Página ${categoryPage} de ${pageCount}`;
      $('#categoryPrev').disabled = categoryPage <= 1;
      $('#categoryNext').disabled = categoryPage >= pageCount;
    };
    for (const id of ['searchList', 'categoryEnvironment', 'categoryStatus', 'categorySort', 'categoryPageSize']) {
      $(`#${id}`).addEventListener(id === 'searchList' ? 'input' : 'change', () => applyCategoryFilters(true));
    }
    $('#categoryPrev').onclick = () => { categoryPage--; applyCategoryFilters(); };
    $('#categoryNext').onclick = () => { categoryPage++; applyCategoryFilters(); };
    applyCategoryFilters();
    $$('[data-category-view-mode]').forEach(button => button.onclick = () => {
      $$('[data-category-view-mode]').forEach(item => item.classList.toggle('is-active', item === button));
      $('#categoryTableCard').classList.toggle('grid-mode', button.dataset.categoryViewMode === 'grid');
    });

    $$('.category-drag').forEach(handle => handle.addEventListener('dragstart', event => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', handle.closest('tr').dataset.categoryId);
    }));
    $$('.category-drag').forEach(handle => handle.addEventListener('dragend', () => $$('.category-table tbody tr').forEach(row => row.classList.remove('drag-over'))));
    $$('.category-table tbody tr').forEach(target => {
      target.addEventListener('dragover', event => { if (canWrite()) { event.preventDefault(); target.classList.add('drag-over'); } });
      target.addEventListener('dragleave', event => { if (!target.contains(event.relatedTarget)) target.classList.remove('drag-over'); });
      target.addEventListener('drop', async event => {
        event.preventDefault();
        target.classList.remove('drag-over');
        const sourceId = event.dataTransfer.getData('text/plain');
        const targetId = target.dataset.categoryId;
        if (!sourceId || sourceId === targetId) return;
        const source = rowFor(sourceId);
        const destination = rowFor(targetId);
        if (String(source.environment_id) !== String(destination.environment_id)) return toast('Para mover uma subcategoria para outro ambiente, use a edição.', 'error');
        const results = await Promise.all([
          db.from('categories').update({ sort_order: destination.sort_order }).eq('id', source.id),
          db.from('categories').update({ sort_order: source.sort_order }).eq('id', destination.id)
        ]);
        const error = results.find(result => result.error)?.error;
        if (error) return toast(explain(error));
        notifyStorefront('categories'); toast('Ordem das subcategorias atualizada.'); render('categories');
      });
    });
  }
  function bannerCard(row, now, productCount = 0) {
    const status = bannerSchedule(row, now);
    const destination = bannerDestination(row.button_url);
    const image = row.image_desktop_url || row.image_mobile_url;
    const campaignTypes = { promotion: 'Promoção', category: 'Categoria', products: 'Produtos específicos', new_arrivals: 'Novidades', best_sellers: 'Mais vendidos', clearance: 'Liquidação', institutional: 'Institucional', custom: 'Personalizado' };
    const campaignType = campaignTypes[row.campaign_type] || (row.position === 'home_hero' ? 'Institucional' : 'Banner personalizado');
    const contentLabel = row.auto_include_category ? 'Todos os produtos da categoria' : productCount ? `${productCount} produto${productCount === 1 ? '' : 's'} selecionado${productCount === 1 ? '' : 's'}` : row.content_mode === 'products' ? 'Seção automática de produtos' : 'Apenas conteúdo visual';
    const period = status.key === 'scheduled' ? status.detail : (!row.start_at && !row.end_at ? 'Sempre ativo' : `${row.start_at ? dateTime(row.start_at) : 'Agora'} → ${row.end_at ? dateTime(row.end_at) : 'Sem término'}`);
    const actions = ActionMenu({
      id: `banner-${row.id}`,
      label: row.title,
      primary: { label: 'Editar', icon: 'edit', attributes: { 'data-banner-edit': row.id } },
      actions: [
        { label: 'Visualizar', icon: 'view', attributes: { 'data-banner-preview': row.id } },
        { label: 'Editar', icon: 'edit', attributes: { 'data-banner-edit': row.id } },
        { label: 'Duplicar', icon: 'copy', attributes: { 'data-banner-duplicate': row.id } },
        { label: 'Subir na ordem', icon: 'up', attributes: { 'data-banner-move': 'up', 'data-banner-id': row.id } },
        { label: 'Descer na ordem', icon: 'down', attributes: { 'data-banner-move': 'down', 'data-banner-id': row.id } },
        { label: row.paused || !row.active ? 'Ativar' : 'Desativar', icon: row.paused || !row.active ? 'play' : 'pause', attributes: { 'data-banner-toggle': row.id } },
        { separator: true },
        { label: 'Excluir', icon: 'trash', danger: true, attributes: { 'data-banner-delete': row.id } }
      ]
    });
    return `<article class="banner-card" data-banner-id="${row.id}" data-position="${esc(row.position)}" data-campaign="${esc(row.campaign_type || 'custom')}" data-status="${status.key}" data-title="${esc(String(row.title || '').toLowerCase())}" data-order="${Number(row.sort_order || 0)}">
      <div class="banner-card-preview" ${image ? `style="background-image:linear-gradient(90deg,rgba(3,31,78,.74),rgba(3,31,78,.08)),url(&quot;${esc(image)}&quot;)"` : ''}><span class="banner-order-handle" draggable="${canWrite()}" title="Arraste para mudar a ordem" aria-label="Reordenar ${esc(row.title)}">⠿</span><div><small>${esc(bannerPositionShort[row.position] || row.position)}</small><strong>${esc(row.title)}</strong><p>${esc(row.subtitle || '')}</p>${row.button_text ? `<em>${esc(row.button_text)} →</em>` : ''}</div></div>
      <div class="banner-card-body"><div class="banner-card-heading"><div><h3>${esc(row.title)}</h3><p>${esc(bannerPositionLabels[row.position] || 'Área personalizada do site')}</p></div><span class="banner-status ${status.key}"><i></i>${esc(status.label)}</span></div>
      <dl><div><dt>Tipo</dt><dd>${esc(campaignType)}</dd></div><div><dt>Período</dt><dd>${esc(period)}</dd></div><div><dt>Conteúdo</dt><dd>${esc(contentLabel)}</dd></div><div><dt>Destino</dt><dd><b>${esc(destination.type)}</b><span title="${esc(destination.label)}">${esc(destination.label)}</span></dd></div></dl>
      <div class="banner-card-actions action-cell">${actions}</div></div>
    </article>`;
  }
  async function renderBanners(revision) {
    const [bannerResult, sectionResult, quickProductResult, quickCategoryResult] = await Promise.all([
      db.from('banners').select('*').order('sort_order').order('created_at', { ascending: false }).limit(200),
      db.from('site_sections').select('id,section_key,title,active,sort_order').order('sort_order'),
      db.from('products').select('id,name,category_id,stock_quantity,low_stock_threshold,promotional_price,new_arrival,active,product_images(image_url,is_cover,sort_order)').is('deleted_at', null).eq('active', true),
      db.from('categories').select('id,name').eq('active', true)
    ]);
    const { data, error } = bannerResult;
    if (error) throw error;
    if (sectionResult.error) throw sectionResult.error;
    if (quickProductResult.error) throw quickProductResult.error;
    if (quickCategoryResult.error) throw quickCategoryResult.error;
    if (revision !== viewRevision) return;
    const rows = data || [];
    const homeSections = sectionResult.data || [];
    const sectionLabels = { hero: 'Hero principal', environments: 'Categorias', office: 'Escritório', featured_products: 'Produtos em destaque', promotions: 'Ofertas', promo_banners: 'Campanhas e banners', best_sellers: 'Mais vendidos', benefits: 'Benefícios', ambient: 'Ambientes', inspirations: 'Inspirações' };
    const homeOrderHtml = homeSections.map(section => `<div class="home-order-item ${section.active ? '' : 'is-off'}" draggable="${canWrite()}" data-home-section="${section.id}"><span>⠿</span><div><b>${esc(sectionLabels[section.section_key] || section.title || section.section_key)}</b><small>${section.active ? 'Visível no site' : 'Oculto'} · posição ${Number(section.sort_order || 0)}</small></div></div>`).join('');
    const promotionIds = rows.map(row => row.promotion_id).filter(Boolean);
    const linkResult = promotionIds.length ? await db.from('promotion_products').select('promotion_id,product_id').in('promotion_id', promotionIds) : { data: [] };
    const productCounts = (linkResult.data || []).reduce((map, item) => map.set(String(item.promotion_id), (map.get(String(item.promotion_id)) || 0) + 1), new Map());
    const now = new Date();
    const statusFor = row => bannerSchedule(row, now).key;
    const active = rows.filter(row => statusFor(row) === 'active').length;
    const scheduled = rows.filter(row => statusFor(row) === 'scheduled').length;
    const ended = rows.filter(row => statusFor(row) === 'ended').length;
    const drafts = rows.filter(row => ['draft', 'paused'].includes(statusFor(row))).length;
    const quickProducts = quickProductResult.data || [];
    const quickCategories = quickCategoryResult.data || [];
    const availableSofas = quickProducts.filter(item => /sof[aá]/i.test(item.name) && Number(item.stock_quantity || 0) > 0 && productCover(item)).length;
    const promotionalProducts = quickProducts.filter(item => item.promotional_price != null).length;
    const lowStockProducts = quickProducts.filter(item => Number(item.stock_quantity || 0) > 0 && Number(item.stock_quantity) <= Number(item.low_stock_threshold || 5)).length;
    const newProducts = quickProducts.filter(item => item.new_arrival).length;
    const suggestions = [
      { icon: '🛋️', text: `Você possui ${availableSofas} ${availableSofas === 1 ? 'sofá disponível' : 'sofás disponíveis'}.`, action: 'Criar banner para sala', preset: 'living' },
      { icon: '🔥', text: `${promotionalProducts} produto${promotionalProducts === 1 ? '' : 's'} com preço promocional.`, action: 'Divulgar ofertas', preset: 'flash' },
      { icon: '📦', text: `${lowStockProducts} produto${lowStockProducts === 1 ? '' : 's'} com estoque baixo.`, action: 'Criar queima de estoque', preset: 'stock_clearance' },
      { icon: '✨', text: `${newProducts} novidade${newProducts === 1 ? '' : 's'} cadastrada${newProducts === 1 ? '' : 's'}.`, action: 'Divulgar novidades', preset: 'news' }
    ];
    const slotBanners = position => rows.filter(row => row.position === position);
    const structureBanner = (position, emptyText) => {
      const items = slotBanners(position);
      return items.length ? items.map(item => `<button type="button" data-banner-edit="${item.id}"><span class="banner-structure-thumb" ${item.image_desktop_url ? `style="background-image:url(&quot;${esc(item.image_desktop_url)}&quot;)"` : ''}></span><span><b>${esc(item.title)}</b><small>${esc(bannerSchedule(item, now).label)} · ordem ${Number(item.sort_order || 0)}</small></span></button>`).join('') : `<p>${esc(emptyText)}</p>`;
    };
    $('#content').innerHTML = `<div class="banner-summary"><article><span>▣</span><div><b>${active}</b><small>Campanhas ativas</small></div></article><article class="scheduled"><span>◷</span><div><b>${scheduled}</b><small>Agendadas</small></div></article><article class="ended"><span>✓</span><div><b>${ended}</b><small>Encerradas</small></div></article><article class="inactive"><span>−</span><div><b>${drafts}</b><small>Rascunhos / pausadas</small></div></article></div>
      <details class="quick-suggestions card admin-disclosure"><summary><span aria-hidden="true">💡</span><span><strong>Sugestões para sua loja</strong><small>Ideias criadas a partir do catálogo e estoque.</small></span><em aria-hidden="true">⌄</em></summary><div>${suggestions.map(item => `<article><span>${item.icon}</span><p>${esc(item.text)}</p><button type="button" data-quick-suggestion="${item.preset}">${esc(item.action)}</button></article>`).join('')}</div></details>
      <section class="banner-toolbar card"><label class="banner-search"><span aria-hidden="true">⌕</span><input id="searchList" type="search" placeholder="Pesquisar campanha ou banner..."></label><div class="banner-filter-tabs" role="group" aria-label="Filtrar campanhas"><button class="is-active" type="button" data-banner-filter="all">Todos</button><button type="button" data-banner-filter="home_hero">Hero principal</button><button type="button" data-banner-filter="campaign:promotion">Promoções</button><button type="button" data-banner-filter="campaign:category">Categorias</button><button type="button" data-banner-filter="campaign:products">Produtos</button><button type="button" data-banner-filter="status:scheduled">Agendados</button><button type="button" data-banner-filter="status:draft">Rascunhos</button><button type="button" data-banner-filter="status:ended">Encerrados</button></div><label class="banner-sort">Ordenar<select id="bannerSort"><option value="order">Ordem no site</option><option value="name">Nome (A–Z)</option><option value="order-desc">Ordem inversa</option></select></label></section>
      <div class="banner-workspace"><section><div class="banner-section-heading"><div><h2>Campanhas e banners</h2><p>Arraste pelo ícone ⠿ para reorganizar a ordem de exibição.</p></div><span id="bannerResults">${rows.length} campanha${rows.length === 1 ? '' : 's'}</span></div><div class="banner-card-list" id="bannerCardList">${rows.map(row => bannerCard(row, now, productCounts.get(String(row.promotion_id)) || 0)).join('') || '<div class="card empty admin-empty"><span class="admin-empty-icon" aria-hidden="true">▣</span><h2>Nenhuma campanha cadastrada</h2><p>Crie o primeiro destaque comercial da loja.</p><button class="secondary" type="button" data-open-quick-campaign>Explorar modelos</button></div>'}</div></section>
      <aside class="home-structure card"><header><span>⌂</span><div><h2>Estrutura da Home</h2><p>Veja onde cada banner aparece para os clientes.</p></div></header><ol>
        <li><i>1</i><div><strong>Hero principal</strong><small>Primeira área da página</small><div class="home-slot-banners">${structureBanner('home_hero', 'Nenhum banner nesta posição.')}</div></div></li>
        <li class="fixed"><i>2</i><div><strong>Categorias</strong><small>Seção automática do catálogo</small></div></li>
        <li><i>3</i><div><strong>Banner intermediário</strong><small>Entre categorias e produtos</small><div class="home-slot-banners">${structureBanner('home_middle', 'Nenhum banner nesta posição.')}</div></div></li>
        <li class="fixed"><i>4</i><div><strong>Produtos em destaque</strong><small>Seção automática do catálogo</small></div></li>
        <li><i>5</i><div><strong>Banner promocional</strong><small>Faixa de campanha da Home</small><div class="home-slot-banners">${structureBanner('home_bottom', 'Nenhum banner nesta posição.')}</div></div></li>
      </ol><div class="home-organizer"><div><b>Organizar Home</b><small>Arraste as seções e salve a nova ordem.</small></div><div class="home-order-list" id="homeOrderList">${homeOrderHtml || '<p>Nenhuma seção configurada.</p>'}</div><button id="saveHomeOrder" type="button" ${homeSections.length ? '' : 'disabled'}>Salvar ordem</button></div></aside></div>`;
    const pageAction = $('#pageAction');
    pageAction.hidden = false;
    pageAction.textContent = '+  Modelos prontos';
    pageAction.onclick = () => openQuickCampaign();
    const rowFor = id => rows.find(row => String(row.id) === String(id));
    $$('[data-banner-edit]').forEach(button => button.onclick = () => openQuickCampaign(rowFor(button.dataset.bannerEdit)));
    $$('[data-quick-suggestion]').forEach(button => button.onclick = () => openQuickCampaign(null, button.dataset.quickSuggestion, true));
    $$('[data-open-quick-campaign]').forEach(button => button.onclick = () => openQuickCampaign());
    $$('[data-banner-preview]').forEach(button => button.onclick = () => { const row = rowFor(button.dataset.bannerPreview); const url = row?.image_desktop_url || row?.image_mobile_url; if (url) window.open(url, '_blank', 'noopener'); else toast('Este banner ainda não possui imagem.'); });
    $$('[data-banner-duplicate]').forEach(button => button.onclick = () => runAction(button, async () => {
      const source = rowFor(button.dataset.bannerDuplicate);
      if (!source || !canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      let promotionId = null;
      if (source.promotion_id) {
        const { data: promotionSource } = await db.from('promotions').select('*').eq('id', source.promotion_id).maybeSingle();
        if (promotionSource) {
          const { id, created_at, updated_at, ...promotionCopy } = promotionSource;
          promotionCopy.title = `${promotionCopy.title} — cópia`;
          promotionCopy.active = false;
          promotionCopy.start_at = null;
          promotionCopy.end_at = null;
          const { data: newPromotion, error: promotionError } = await db.from('promotions').insert(promotionCopy).select().single();
          if (promotionError) return toast(explain(promotionError), 'error');
          promotionId = newPromotion.id;
          const { data: links, error: linkLoadError } = await db.from('promotion_products').select('product_id').eq('promotion_id', source.promotion_id);
          if (linkLoadError) { await db.from('promotions').delete().eq('id', promotionId); return toast(explain(linkLoadError), 'error'); }
          if (links?.length) {
            const { error: linkCopyError } = await db.from('promotion_products').insert(links.map(item => ({ promotion_id: promotionId, product_id: item.product_id })));
            if (linkCopyError) { await db.from('promotions').delete().eq('id', promotionId); return toast(explain(linkCopyError), 'error'); }
          }
        }
      }
      const keys = ['subtitle','image_desktop_url','image_mobile_url','button_text','button_url','position','campaign_type','content_mode','category_id','link_type','alignment','display_locations','auto_include_category','deactivate_on_end','keep_products_after_end'];
      const copy = { title: `${source.title} — cópia`, active: false, draft: true, paused: false, start_at: null, end_at: null, sort_order: Number(source.sort_order || 0) + 1, promotion_id: promotionId };
      keys.forEach(key => { if (key in source) copy[key] = source[key]; });
      if (promotionId && source.promotion_id && copy.button_url) {
        const oldParam = `promotion=${encodeURIComponent(source.promotion_id)}`;
        if (copy.button_url.includes(oldParam)) copy.button_url = copy.button_url.replace(oldParam, `promotion=${encodeURIComponent(promotionId)}`);
      }
      const { error: duplicateError } = await db.from('banners').insert(copy);
      if (duplicateError) { if (promotionId) await db.from('promotions').delete().eq('id', promotionId); return toast(explain(duplicateError), 'error'); }
      notifyStorefront('banners'); toast('Campanha duplicada como rascunho.'); render('banners');
    }));
    $$('[data-banner-toggle]').forEach(button => button.onclick = () => runAction(button, async () => {
      const source = rowFor(button.dataset.bannerToggle);
      if (!source || !canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const resume = source.paused || !source.active;
      if (!await confirmAction({ title: `${resume ? 'Ativar' : 'Desativar'} esta campanha?`, message: `A campanha “${source.title}” será ${resume ? 'publicada novamente na loja' : 'retirada da loja até ser reativada'}.`, confirmLabel: resume ? 'Ativar' : 'Desativar' })) return;
      const { error: toggleError } = await db.from('banners').update({ active: resume, paused: !resume, draft: false }).eq('id', source.id);
      if (toggleError) return toast(explain(toggleError), 'error');
      if (source.promotion_id) await db.from('promotions').update({ active: resume }).eq('id', source.promotion_id);
      notifyStorefront('banners'); toast(resume ? 'Banner ativado.' : 'Banner desativado.'); render('banners');
    }));
    $$('[data-banner-move]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const ordered = [...rows].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
      const index = ordered.findIndex(item => String(item.id) === String(button.dataset.bannerId));
      const targetIndex = button.dataset.bannerMove === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return toast(button.dataset.bannerMove === 'up' ? 'Este banner já é o primeiro.' : 'Este banner já é o último.');
      const source = ordered[index]; const target = ordered[targetIndex];
      const results = await Promise.all([db.from('banners').update({ sort_order: target.sort_order }).eq('id', source.id), db.from('banners').update({ sort_order: source.sort_order }).eq('id', target.id)]);
      const moveError = results.find(result => result.error)?.error;
      if (moveError) return toast(explain(moveError), 'error');
      notifyStorefront('banners'); toast('Ordem dos banners atualizada.'); render('banners');
    }));
    $$('[data-banner-delete]').forEach(button => button.onclick = () => runAction(button, async () => {
      const source = rowFor(button.dataset.bannerDelete);
      if (!source || !canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      if (!await confirmAction({ title: 'Excluir este banner?', message: `“${source.title}” será excluído. Esta ação não poderá ser desfeita e ficará registrada na auditoria.`, confirmLabel: 'Excluir', tone: 'danger' })) return;
      const { error: deleteError } = await db.from('banners').delete().eq('id', source.id);
      if (deleteError) return toast(explain(deleteError), 'error');
      if (source.promotion_id) {
        const { count, error: referenceError } = await db.from('banners').select('id', { count: 'exact', head: true }).eq('promotion_id', source.promotion_id);
        if (referenceError) console.warn('Não foi possível verificar referências da promoção.', referenceError);
        else if (!count) {
          const { error: promotionDeleteError } = await db.from('promotions').delete().eq('id', source.promotion_id);
          if (promotionDeleteError) console.warn('O banner foi removido, mas a promoção vinculada não pôde ser excluída.', promotionDeleteError);
        }
      }
      const storedUrls = new Set([source.image_desktop_url, source.image_mobile_url].filter(Boolean));
      for (const url of storedUrls) await removeUnusedBannerImage(url);
      notifyStorefront('banners'); toast('Banner excluído com sucesso. Os produtos permaneceram intactos.'); render('banners');
    }));
    let activeFilter = 'all';
    const applyFilters = () => {
      const term = $('#searchList').value.trim().toLowerCase();
      const cards = $$('.banner-card', $('#bannerCardList'));
      let shown = 0;
      cards.forEach(card => {
        const filterMatch = activeFilter === 'all' || (activeFilter.startsWith('status:') ? card.dataset.status === activeFilter.split(':')[1] || (activeFilter === 'status:draft' && card.dataset.status === 'paused') : activeFilter.startsWith('campaign:') ? card.dataset.campaign === activeFilter.split(':')[1] : card.dataset.position === activeFilter);
        const visible = filterMatch && card.dataset.title.includes(term); card.hidden = !visible; if (visible) shown++;
      });
      $('#bannerResults').textContent = `${shown} campanha${shown === 1 ? '' : 's'}`;
    };
    $('#searchList').oninput = applyFilters;
    $$('[data-banner-filter]').forEach(button => button.onclick = () => { activeFilter = button.dataset.bannerFilter; $$('[data-banner-filter]').forEach(item => item.classList.toggle('is-active', item === button)); applyFilters(); });
    $('#bannerSort').onchange = event => {
      const list = $('#bannerCardList');
      const cards = $$('.banner-card', list);
      cards.sort((a, b) => event.target.value === 'name' ? a.dataset.title.localeCompare(b.dataset.title, 'pt-BR') : (Number(a.dataset.order) - Number(b.dataset.order)) * (event.target.value === 'order-desc' ? -1 : 1));
      cards.forEach(card => list.append(card));
    };
    $$('.banner-order-handle').forEach(handle => handle.addEventListener('dragstart', event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', handle.closest('.banner-card').dataset.bannerId); handle.closest('.banner-card').classList.add('dragging'); }));
    $$('.banner-order-handle').forEach(handle => handle.addEventListener('dragend', () => $$('.banner-card').forEach(card => card.classList.remove('dragging', 'drag-over'))));
    $$('.banner-card').forEach(card => {
      card.addEventListener('dragover', event => { if (canWrite()) { event.preventDefault(); card.classList.add('drag-over'); } });
      card.addEventListener('dragleave', event => { if (!card.contains(event.relatedTarget)) card.classList.remove('drag-over'); });
      card.addEventListener('drop', async event => {
        event.preventDefault(); card.classList.remove('drag-over');
        const sourceId = event.dataTransfer.getData('text/plain');
        const targetId = card.dataset.bannerId;
        if (!sourceId || sourceId === targetId) return;
        const source = rowFor(sourceId), target = rowFor(targetId);
        const results = await Promise.all([db.from('banners').update({ sort_order: target.sort_order }).eq('id', source.id), db.from('banners').update({ sort_order: source.sort_order }).eq('id', target.id)]);
        const swapError = results.find(result => result.error)?.error;
        if (swapError) return toast(explain(swapError));
        notifyStorefront('banners'); toast('Ordem dos banners atualizada.'); render('banners');
      });
    });
    let draggedSectionId = '';
    $$('.home-order-item').forEach(item => {
      item.addEventListener('dragstart', event => { draggedSectionId = item.dataset.homeSection; event.dataTransfer.effectAllowed = 'move'; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => { draggedSectionId = ''; $$('.home-order-item').forEach(section => section.classList.remove('dragging', 'drag-over')); });
      item.addEventListener('dragover', event => { if (canWrite()) { event.preventDefault(); item.classList.add('drag-over'); } });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', event => {
        event.preventDefault(); item.classList.remove('drag-over');
        const source = $(`.home-order-item[data-home-section="${draggedSectionId}"]`);
        if (!source || source === item) return;
        const list = $('#homeOrderList');
        const after = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2;
        list.insertBefore(source, after ? item.nextSibling : item);
      });
    });
    $('#saveHomeOrder')?.addEventListener('click', async event => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.');
      event.currentTarget.disabled = true;
      const ordered = $$('.home-order-item', $('#homeOrderList'));
      const results = await Promise.all(ordered.map((item, index) => db.from('site_sections').update({ sort_order: (index + 1) * 10 }).eq('id', item.dataset.homeSection)));
      const orderError = results.find(result => result.error)?.error;
      event.currentTarget.disabled = false;
      if (orderError) return toast(explain(orderError));
      notifyStorefront('site_sections'); toast('Ordem da Home salva e sincronizada com o site.'); render('banners');
    });
  }
  async function renderSimple(view, revision) {
    const config = configs[view];
    let query = db.from(config.table).select('*');
    query = config.fields.some(field => field[0] === 'sort_order') ? query.order('sort_order').order('created_at', { ascending: false }) : query.order('created_at', { ascending: false });
    const { data, error } = await query.limit(200);
    if (error) throw error;
    if (revision !== viewRevision) return;
    const rows = (data || []).map(row => view === 'sections' ? { ...row, content_text: JSON.stringify(row.content || {}, null, 2) } : row);
    if (view === 'promotions') {
      const pageAction = $('#pageAction');
      pageAction.hidden = false;
      pageAction.textContent = '+ Nova promoção';
      pageAction.onclick = () => openEditor(view);
    }
    $('#content').innerHTML = `<div class="toolbar admin-list-toolbar card"><label class="admin-search-label"><span class="sr-only">Pesquisar ${config.plural}</span><input id="searchList" type="search" placeholder="Pesquisar ${config.plural}…"></label>${view === 'promotions' ? '' : `<button class="primary-action" data-new>+ Novo ${config.singular.toLowerCase()}</button>`}</div><div class="card table-wrap">${rows.length ? `<table class="data-table"><thead><tr><th>${config.singular}</th><th>Identificação</th><th>Ordem / período</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(row => simpleRow(config, row)).join('')}</tbody></table>` : `<div class="empty admin-empty"><span class="admin-empty-icon" aria-hidden="true">＋</span><h2>${view === 'promotions' ? 'Nenhuma promoção cadastrada' : 'Nenhum registro cadastrado'}</h2><p>Comece adicionando ${config.singular.toLowerCase()}.</p><button class="secondary" data-new type="button">+ Novo ${config.singular.toLowerCase()}</button></div>`}</div>`;
    $$('[data-new]').forEach(button => button.onclick = () => openEditor(view));
    $$('[data-edit]').forEach(button => button.onclick = () => openEditor(view, rows.find(row => String(row.id) === button.dataset.edit)));
    $$('[data-toggle]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const record = rows.find(row => String(row.id) === button.dataset.toggle);
      if (!await confirmAction({ title: `${record.active ? 'Desativar' : 'Ativar'} este item?`, message: `“${record.name || record.title || record.code || config.singular}” será ${record.active ? 'desativado' : 'ativado'}.`, confirmLabel: record.active ? 'Desativar' : 'Ativar' })) return;
      const { error: toggleError } = await db.from(config.table).update({ active: !record.active }).eq('id', record.id);
      if (toggleError) return toast(explain(toggleError), 'error');
      notifyStorefront(config.table); toast(record.active ? `${config.singular} desativado.` : `${config.singular} ativado.`); render(view);
    }));
    $$('[data-duplicate]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const record = rows.find(row => String(row.id) === button.dataset.duplicate);
      if (!record) return;
      const clone = {};
      config.fields.forEach(([key, , type]) => { if (!['multifile'].includes(type) && key !== 'content_text') clone[key] = record[key] ?? null; });
      if ('name' in clone) clone.name = `${clone.name} — cópia`;
      if ('title' in clone) clone.title = `${clone.title} — cópia`;
      if ('slug' in clone) clone.slug = `${clone.slug || slugify(clone.name || clone.title)}-copia-${Date.now().toString().slice(-6)}`;
      if ('code' in clone) clone.code = `${clone.code}-COPIA-${Date.now().toString().slice(-4)}`;
      if ('active' in clone) clone.active = false;
      const { data: duplicate, error: duplicateError } = await db.from(config.table).insert(clone).select().single();
      if (duplicateError) return toast(explain(duplicateError), 'error');
      if (view === 'inspirations') {
        const { data: gallery } = await db.from('inspiration_images').select('*').eq('inspiration_id', record.id).order('sort_order');
        if (gallery?.length) await db.from('inspiration_images').insert(gallery.map(item => ({ inspiration_id: duplicate.id, image_url: item.image_url, storage_path: `references/${duplicate.id}/${crypto.randomUUID()}`, alt_text: item.alt_text, sort_order: item.sort_order })));
      }
      notifyStorefront(config.table); toast(`${config.singular} duplicado como inativo.`); render(view);
    }));
    $$('[data-delete]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const record = rows.find(row => String(row.id) === button.dataset.delete);
      if (!await confirmAction({ title: 'Excluir este item?', message: `“${record?.name || record?.title || record?.code || config.singular}” será excluído. Esta ação não poderá ser desfeita e ficará registrada na auditoria.`, confirmLabel: 'Excluir', tone: 'danger' })) return;
      const storedUrls = config.fields.filter(field => field[2] === 'file').map(([key]) => record?.[key]).filter(Boolean);
      if (view === 'inspirations') {
        const { data: gallery, error: galleryError } = await db.from('inspiration_images').select('image_url').eq('inspiration_id', record.id);
        if (galleryError) return toast(explain(galleryError), 'error');
        storedUrls.push(...(gallery || []).map(item => item.image_url).filter(Boolean));
      }
      const { error: deleteError } = await db.from(config.table).delete().eq('id', button.dataset.delete);
      if (deleteError) return toast(explain(deleteError), 'error');
      for (const url of new Set(storedUrls)) await removeStoredUrl(url, config.bucket);
      notifyStorefront(config.table); toast(`${config.singular} excluído com sucesso.`); render(view);
    }));
    bindSearch();
  }
  function simpleRow(config, row) {
    const imageKey = config.fields.find(field => field[2] === 'file')?.[0];
    const title = row.name || row.title || row.code || row.section_key;
    const identity = row.slug || row.position || row.discount_type || row.section_key || '—';
    const timing = row.sort_order ?? (row.start_at ? dateTime(row.start_at) : '—');
    const protectedSection = config.table === 'site_sections';
    const actions = [
      { label: 'Editar', icon: 'edit', attributes: { 'data-edit': row.id } },
      { label: row.active ? 'Desativar' : 'Ativar', icon: row.active ? 'pause' : 'play', attributes: { 'data-toggle': row.id } }
    ];
    if (!protectedSection) actions.push(
      { label: 'Duplicar', icon: 'copy', attributes: { 'data-duplicate': row.id } },
      { separator: true },
      { label: 'Excluir', icon: 'trash', danger: true, attributes: { 'data-delete': row.id } }
    );
    const menu = ActionMenu({
      id: `simple-${config.table}-${row.id}`,
      label: title,
      primary: { label: 'Editar', icon: 'edit', attributes: { 'data-edit': row.id } },
      actions
    });
    return `<tr><td>${config.table === 'environments' ? CategoryIcons.icon(row.icon_key||row.name,{size:28}) : imageKey && row[imageKey] ? `<img class="thumb" src="${esc(row[imageKey])}" alt=""> ` : ''}<b>${esc(title)}</b></td><td>${esc(identity)}</td><td>${esc(timing)}</td><td><span class="badge ${row.active ? '' : 'off'}">${row.active ? 'Ativo' : 'Inativo'}</span></td><td class="action-cell">${menu}</td></tr>`;
  }
  function bindSearch() {
    const search = $('#searchList');
    const content = $('#content');
    if (!search || !content) return;
    const rows = $$('tbody tr', content);
    if (!rows.length) return;
    const empty = document.createElement('div');
    empty.className = 'card empty admin-empty admin-search-empty';
    empty.hidden = true;
    empty.innerHTML = '<span class="admin-empty-icon" aria-hidden="true">⌕</span><h2>Nenhum resultado encontrado</h2><p>Tente outro termo de busca.</p>';
    ($('.table-wrap', content) || content.lastElementChild)?.after(empty);
    search.addEventListener('input', event => {
      const term = event.target.value.trim().toLocaleLowerCase('pt-BR');
      let visible = 0;
      rows.forEach(row => {
        row.hidden = !row.textContent.toLocaleLowerCase('pt-BR').includes(term);
        if (!row.hidden) visible++;
      });
      empty.hidden = visible > 0;
    });
  }

  const productEditorSections = [
    { key: 'basic', label: 'Informações básicas', help: 'Nome, endereço do produto e classificação.', fields: [
      ['name', 'Nome do produto', 'text', true], ['slug', 'Slug / URL', 'slug', true],
      ['environment_id', 'Ambiente', 'relation', true, 'environments'], ['category_id', 'Subcategoria', 'relation', true, 'categories'],
      ['sku', 'Código / SKU (opcional)', 'text'], ['brand_id', 'Marca (opcional)', 'relation', false, 'brands']
    ] },
    { key: 'price', label: 'Preço e condições', help: 'Preço normal, promoção e parcelamento.', fields: [
      ['price', 'Preço normal', 'number', true], ['promotional_price', 'Preço promocional (opcional)', 'number'],
      ['installment_enabled', 'Permitir parcelamento', 'checkbox'], ['max_installments', 'Máximo de parcelas', 'number']
    ] },
    { key: 'photos', label: 'Fotos', help: 'Envie até 10 fotos e escolha a imagem principal.', fields: [
      ['gallery', 'Galeria do produto — até 10 fotos', 'multifile'],
      ['og_image_url', 'Imagem de compartilhamento (opcional)', 'file']
    ] },
    { key: 'availability', label: 'Disponibilidade', help: 'Controle de quantidade e aviso de estoque baixo.', fields: [
      ['stock_quantity', 'Quantidade em estoque', 'number', true], ['low_stock_threshold', 'Avisar quando chegar a', 'number', true]
    ] },
    { key: 'benefits', label: 'Benefícios / Selos', help: 'Escolha nenhum, um ou os dois benefícios.', fields: [
      ['benefits', 'Benefícios e Selos'], ['free_city_shipping', 'Frete grátis', 'checkbox'], ['free_assembly', 'Armação gratuita', 'checkbox']
    ] },
    { key: 'description', label: 'Descrição', help: 'Apresente o produto e registre suas especificações.', fields: [
      ['short_description', 'Descrição curta', 'textarea'], ['description', 'Descrição completa', 'textarea'],
      ['specifications_text', 'Especificações — uma por linha (ex.: Lugares: 3)', 'textarea'],
      ['dimensions_text', 'Medidas', 'text'], ['material', 'Material', 'text'], ['color', 'Cores', 'text'], ['warranty', 'Garantia', 'text']
    ] },
    { key: 'publication', label: 'Publicação', help: 'Venda, destaques e visibilidade no site.', fields: [
      ['whatsapp_enabled', 'Permitir compra pelo WhatsApp', 'checkbox'], ['cart_enabled', 'Permitir adicionar à sacola', 'checkbox'],
      ['featured', 'Produto em destaque', 'checkbox'], ['best_seller', 'Mais vendido', 'checkbox'],
      ['new_arrival', 'Lançamento', 'checkbox'], ['on_sale', 'Em oferta', 'checkbox'],
      ['is_campaign', 'Produto em campanha', 'checkbox'], ['active', 'Produto publicado', 'checkbox'],
      ['sort_order', 'Ordem de exibição', 'number'], ['meta_title', 'Título SEO (opcional)', 'text'],
      ['meta_description', 'Descrição SEO (opcional)', 'textarea']
    ] }
  ];
  const productFields = productEditorSections.flatMap(section => section.fields);
  function formatSpecificationsText(specifications) {
    if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) return '';
    return Object.entries(specifications).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`).join('\n');
  }
  function parseSpecificationsText(value) {
    const specifications = {};
    String(value || '').split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const separator = trimmed.indexOf(':');
      if (separator < 1 || !trimmed.slice(separator + 1).trim()) throw new Error(`Especificação inválida na linha ${index + 1}. Use o formato Nome: valor.`);
      specifications[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
    });
    return specifications;
  }
  function productBenefitBadgesMarkup(freeShipping, freeAssembly) {
    return [
      freeShipping ? '<span class="product-benefit-preview-badge is-shipping"><img src="assets/seal-free-shipping.png" alt="Frete grátis para a cidade"></span>' : '',
      freeAssembly ? '<span class="product-benefit-preview-badge is-assembly"><img src="assets/seal-free-assembly.png" alt="Armação gratuita"></span>' : ''
    ].join('');
  }
  function productBenefitsEditorHtml(record = {}) {
    const image = productCover(record) || record.og_image_url || '';
    const shipping = Boolean(record.free_city_shipping);
    const assembly = Boolean(record.free_assembly);
    return `<section class="product-benefit-editor" aria-labelledby="productBenefitTitle">
      <div class="product-benefit-settings">
        <header><span class="product-benefit-heading-icon" aria-hidden="true">${actionIcon('tools')}</span><div><h3 id="productBenefitTitle">Benefícios e Selos</h3><p>Marque os benefícios deste produto. O sistema aplica o visual automaticamente.</p></div></header>
        <div class="product-benefit-options">
          <label class="product-benefit-option"><input name="free_city_shipping" type="checkbox" ${shipping ? 'checked' : ''}><span class="product-benefit-option-art" aria-hidden="true"><img src="assets/seal-free-shipping.png" alt=""></span><span><b>Frete grátis para a cidade</b><small>Usar este selo no produto</small></span><i aria-hidden="true"></i></label>
          <label class="product-benefit-option"><input name="free_assembly" type="checkbox" ${assembly ? 'checked' : ''}><span class="product-benefit-option-art" aria-hidden="true"><img src="assets/seal-free-assembly.png" alt=""></span><span><b>Armação gratuita</b><small>Usar este selo no produto</small></span><i aria-hidden="true"></i></label>
        </div>
        <p class="product-benefit-note">Não é necessário escrever textos, escolher cores ou enviar imagens.</p>
      </div>
      <aside class="product-benefit-live-preview" aria-label="Prévia dos selos no card">
        <div class="product-benefit-preview-title"><span>PRÉ-VISUALIZAÇÃO</span><b>Atualização instantânea</b></div>
        <div class="product-benefit-preview-photo ${image ? 'has-image' : ''}" id="productBenefitPreviewPhoto">
          ${image ? `<img id="productBenefitPreviewImage" src="${esc(image)}" alt="Prévia da foto do produto">` : `<span class="product-benefit-photo-placeholder" id="productBenefitPhotoPlaceholder" aria-hidden="true">${actionIcon('grid')}</span>`}
          <div class="product-benefit-preview-badges" id="productBenefitPreviewBadges" ${shipping || assembly ? '' : 'hidden'}>${productBenefitBadgesMarkup(shipping, assembly)}</div>
        </div>
        <strong id="productBenefitPreviewName">${esc(record.name || 'Nome do produto')}</strong>
        <small id="productBenefitPreviewStatus">${shipping || assembly ? `${Number(shipping) + Number(assembly)} selo${shipping && assembly ? 's' : ''} selecionado${shipping && assembly ? 's' : ''}` : 'Nenhum selo selecionado'}</small>
      </aside>
    </section>`;
  }
  function syncProductBenefitPreview() {
    const shipping = Boolean($('[name="free_city_shipping"]')?.checked);
    const assembly = Boolean($('[name="free_assembly"]')?.checked);
    const badges = $('#productBenefitPreviewBadges');
    if (!badges) return;
    badges.innerHTML = productBenefitBadgesMarkup(shipping, assembly);
    badges.hidden = !shipping && !assembly;
    const count = Number(shipping) + Number(assembly);
    const status = $('#productBenefitPreviewStatus');
    if (status) status.textContent = count ? `${count} selo${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}` : 'Nenhum selo selecionado';
  }
  function setProductBenefitPreviewImage(file) {
    if (!file) return;
    if (editorState?.previewObjectUrl) URL.revokeObjectURL(editorState.previewObjectUrl);
    editorState.previewObjectUrl = URL.createObjectURL(file);
    const photo = $('#productBenefitPreviewPhoto');
    if (!photo) return;
    let image = $('#productBenefitPreviewImage');
    if (!image) {
      $('#productBenefitPhotoPlaceholder')?.remove();
      image = document.createElement('img');
      image.id = 'productBenefitPreviewImage';
      image.alt = 'Prévia da foto do produto';
      photo.prepend(image);
    }
    image.src = editorState.previewObjectUrl;
    photo.classList.add('has-image');
  }
  function activateProductEditorTab(key, focus = false) {
    const dialog = $('#editorDialog');
    $$('[data-product-tab]', dialog).forEach(button => {
      const active = button.dataset.productTab === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    $$('[data-product-panel]', dialog).forEach(panel => { panel.hidden = panel.dataset.productPanel !== key; });
    if (editorState?.view === 'products') editorState.activeTab = key;
  }
  function setProductEditorDirty(dirty = true, message = '') {
    if (editorState?.view !== 'products') return;
    editorState.dirty = dirty;
    const status = $('#productUnsavedStatus');
    if (!status) return;
    status.classList.toggle('has-changes', dirty);
    status.textContent = message || (dirty ? 'Alterações não salvas' : 'Sem alterações pendentes');
  }
  function productGalleryFileKey(file) {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }
  function validatePendingProductImages(files) {
    for (const file of files) {
      if (!allowedImageTypes.has(file.type)) throw new Error(`“${file.name}” não é JPG, PNG ou WebP.`);
      if (file.size > maxImageBytes) throw new Error(`“${file.name}” ultrapassa o limite de 8 MB.`);
    }
  }
  function renderPendingProductGallery() {
    const root = $('#pendingGalleryPreview');
    if (!root || editorState?.view !== 'products') return;
    (editorState.previewObjectUrls || []).forEach(url => URL.revokeObjectURL(url));
    editorState.previewObjectUrls = [];
    const files = editorState.pendingGalleryFiles || [];
    if (!files.length) {
      root.innerHTML = '<p class="pending-gallery-empty">As novas fotos aparecerão aqui antes de salvar.</p>';
      return;
    }
    root.innerHTML = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      editorState.previewObjectUrls.push(url);
      const cover = file === editorState.pendingCoverFile;
      return `<figure data-pending-image="${index}"><img src="${esc(url)}" alt="Prévia de ${esc(file.name)}"><figcaption>${cover ? '<b>Imagem principal</b>' : `Nova foto ${index + 1}`}</figcaption><div class="gallery-actions">${cover ? '' : `<button type="button" data-pending-cover="${index}">Principal</button>`}<button type="button" data-pending-move="up" data-pending-index="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Mover foto para a esquerda">←</button><button type="button" data-pending-move="down" data-pending-index="${index}" ${index === files.length - 1 ? 'disabled' : ''} aria-label="Mover foto para a direita">→</button><button type="button" class="danger" data-pending-delete="${index}" aria-label="Remover foto antes de salvar">×</button></div></figure>`;
    }).join('');
    $$('[data-pending-cover]', root).forEach(button => button.onclick = () => {
      editorState.pendingCoverFile = files[Number(button.dataset.pendingCover)];
      setProductBenefitPreviewImage(editorState.pendingCoverFile);
      setProductEditorDirty();
      renderPendingProductGallery();
    });
    $$('[data-pending-move]', root).forEach(button => button.onclick = () => {
      const from = Number(button.dataset.pendingIndex);
      const to = button.dataset.pendingMove === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= files.length) return;
      [files[from], files[to]] = [files[to], files[from]];
      setProductEditorDirty();
      renderPendingProductGallery();
    });
    $$('[data-pending-delete]', root).forEach(button => button.onclick = () => {
      const [removed] = files.splice(Number(button.dataset.pendingDelete), 1);
      if (removed === editorState.pendingCoverFile) editorState.pendingCoverFile = editorState.record ? null : files[0] || null;
      if (editorState.pendingCoverFile) setProductBenefitPreviewImage(editorState.pendingCoverFile);
      setProductEditorDirty();
      renderPendingProductGallery();
    });
  }
  function addPendingProductImages(fileList) {
    const incoming = [...(fileList || [])];
    if (!incoming.length || editorState?.view !== 'products') return;
    try { validatePendingProductImages(incoming); }
    catch (error) { toast(error.message, 'error'); return; }
    const files = editorState.pendingGalleryFiles || (editorState.pendingGalleryFiles = []);
    const known = new Set(files.map(productGalleryFileKey));
    incoming.forEach(file => { if (!known.has(productGalleryFileKey(file))) files.push(file); });
    if ((editorState.existingGalleryCount || 0) + files.length > 10) {
      files.splice(Math.max(0, 10 - (editorState.existingGalleryCount || 0)));
      toast('A galeria aceita no máximo 10 fotos.', 'error');
    }
    if (!editorState.record && !editorState.pendingCoverFile) editorState.pendingCoverFile = files[0] || null;
    setProductBenefitPreviewImage(editorState.pendingCoverFile || files[0]);
    setProductEditorDirty();
    renderPendingProductGallery();
  }
  async function productEditorMarkup(record) {
    const tabs = productEditorSections.map((section, index) => `<button type="button" role="tab" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}" class="${index === 0 ? 'is-active' : ''}" data-product-tab="${section.key}">${esc(section.label)}</button>`).join('');
    const panels = [];
    for (const [index, section] of productEditorSections.entries()) {
      const fields = [];
      for (const field of section.fields) {
        if (field[0] === 'benefits') fields.push(productBenefitsEditorHtml(record));
        else if (!['free_city_shipping', 'free_assembly'].includes(field[0])) fields.push(await fieldHtml(field, record));
      }
      panels.push(`<section class="product-editor-panel" role="tabpanel" data-product-panel="${section.key}" ${index === 0 ? '' : 'hidden'}><header><div><h3>${esc(section.label)}</h3><p>${esc(section.help)}</p></div><span>${index + 1} de ${productEditorSections.length}</span></header><div class="product-section-fields">${fields.join('')}</div></section>`);
    }
    return `<nav class="product-editor-tabs" role="tablist" aria-label="Seções do produto">${tabs}</nav><div class="product-editor-panels">${panels.join('')}</div>`;
  }
  async function productEditor(record = null) {
    if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.');
    resetEditorChrome();
    const commerceDefaults = {
      whatsapp_enabled: true,
      cart_enabled: true,
      free_city_shipping: false,
      free_assembly: false,
      is_campaign: false,
      max_installments: 12,
      stock_quantity: 0,
      low_stock_threshold: 5,
      sort_order: 0
    };
    const editRecord = record ? {
      ...commerceDefaults,
      ...record,
      dimensions_text: record.dimensions?.description || '',
      specifications_text: formatSpecificationsText(record.specifications)
    } : { ...commerceDefaults, specifications_text: '' };
    // Keep the defaults only for rendering a new product. The persistence
    // layer must receive a null record so it executes INSERT instead of
    // attempting PATCH /products?id=eq.undefined.
    editorState = {
      view: 'products', record: record ? editRecord : null, activeTab: 'basic', dirty: false, saving: false,
      existingGalleryCount: record?.product_images?.length || 0, pendingGalleryFiles: [], pendingCoverFile: null,
      previewObjectUrls: []
    };
    $('#editorDialog').classList.add('product-editor-dialog');
    $('#dialogEyebrow').textContent = 'CATÁLOGO';
    $('#dialogTitle').textContent = record ? 'Editar produto' : 'Novo produto';
    $('#editorFields').innerHTML = await productEditorMarkup(editRecord);
    const environmentSelect = $('[name="environment_id"]');
    const categorySelect = $('[name="category_id"]');
    if (environmentSelect && categorySelect) {
      const categoryOptions = [...categorySelect.options].slice(1).map(option => ({ value: option.value, label: option.textContent, environmentId: option.dataset.environmentId || '' }));
      const initialCategory = String(editRecord.category_id || '');
      const syncSubcategories = reset => {
        const environmentId = environmentSelect.value;
        const selected = reset ? '' : (categorySelect.value || initialCategory);
        const matching = categoryOptions.filter(option => String(option.environmentId) === String(environmentId));
        categorySelect.innerHTML = `<option value="">${environmentId ? 'Selecione a subcategoria' : 'Selecione primeiro o ambiente'}</option>${matching.map(option => `<option value="${option.value}" data-environment-id="${option.environmentId}" ${String(option.value) === String(selected) ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}`;
        categorySelect.disabled = !environmentId;
        categorySelect.setCustomValidity(environmentId && !matching.length ? 'Cadastre uma subcategoria ativa para este ambiente.' : '');
      };
      syncSubcategories(false);
      environmentSelect.addEventListener('change', () => { syncSubcategories(true); setProductEditorDirty(); });
    }
    $('#existingGallery')?.insertAdjacentHTML('afterend', '<div class="pending-gallery-heading"><b>Novas fotos</b><small>Prévia antes de salvar</small></div><div id="pendingGalleryPreview" class="multi-images pending-gallery-preview"></div>');
    renderPendingProductGallery();
    $('#editorForm>footer .editor-footer-spacer')?.insertAdjacentHTML('beforebegin', '<span id="productUnsavedStatus" class="product-unsaved-status" role="status">Sem alterações pendentes</span>');
    $$('[data-product-tab]').forEach(button => {
      button.onclick = () => activateProductEditorTab(button.dataset.productTab);
      button.onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = $$('[data-product-tab]');
        const currentIndex = tabs.indexOf(button);
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        activateProductEditorTab(tabs[nextIndex].dataset.productTab, true);
      };
    });
    const numericRules = {
      price: { min: '0.01', step: '0.01' }, promotional_price: { min: '0.01', step: '0.01' },
      max_installments: { min: '1', max: '24', step: '1' }, stock_quantity: { min: '0', step: '1' },
      low_stock_threshold: { min: '0', step: '1' }, sort_order: { min: '0', step: '1' }
    };
    Object.entries(numericRules).forEach(([name, rules]) => {
      const input = $(`[name="${name}"]`);
      Object.entries(rules).forEach(([attribute, value]) => input?.setAttribute(attribute, value));
    });
    $('[name="name"]')?.addEventListener('input', event => {
      if (!record) $('[name="slug"]').value = slugify(event.target.value);
      const previewName = $('#productBenefitPreviewName');
      if (previewName) previewName.textContent = event.target.value.trim() || 'Nome do produto';
    });
    $$('[name="free_city_shipping"], [name="free_assembly"]').forEach(input => input.addEventListener('change', syncProductBenefitPreview));
    $('[name="gallery"]')?.addEventListener('change', event => { addPendingProductImages(event.target.files); event.target.value = ''; });
    $('[name="og_image_url"]')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try { validatePendingProductImages([file]); }
      catch (error) { event.target.value = ''; return toast(error.message, 'error'); }
      if (!editorState.pendingGalleryFiles.length) setProductBenefitPreviewImage(file);
    });
    if (record) await loadGallery(record.id, 'product_images', 'product_id');
    $('#editorForm').oninput = () => setProductEditorDirty();
    $('#editorForm').onchange = () => setProductEditorDirty();
    $('#editorDialog').showModal();
  }
  async function saveProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form) return;
    if (!form.checkValidity()) {
      const invalid = form.querySelector(':invalid');
      const panel = invalid?.closest('[data-product-panel]');
      if (panel) activateProductEditorTab(panel.dataset.productPanel);
      form.reportValidity();
      invalid?.focus();
      return toast('Revise os campos obrigatórios antes de salvar.', 'error');
    }
    const price = Number(form.elements.price.value);
    const promotionalPrice = form.elements.promotional_price.value === '' ? null : Number(form.elements.promotional_price.value);
    if (!Number.isFinite(price) || price <= 0) { activateProductEditorTab('price'); form.elements.price.focus(); return toast('Informe um preço normal maior que zero.', 'error'); }
    if (promotionalPrice != null && (!Number.isFinite(promotionalPrice) || promotionalPrice <= 0 || promotionalPrice >= price)) {
      activateProductEditorTab('price'); form.elements.promotional_price.focus();
      return toast('O preço promocional deve ser maior que zero e menor que o preço normal.', 'error');
    }
    for (const name of ['stock_quantity', 'low_stock_threshold', 'sort_order']) {
      const input = form.elements[name];
      if (input?.value !== '' && (!Number.isInteger(Number(input.value)) || Number(input.value) < 0)) {
        activateProductEditorTab(name === 'sort_order' ? 'publication' : 'availability'); input.focus();
        return toast('Quantidade, estoque mínimo e ordem devem usar números inteiros positivos.', 'error');
      }
    }
    const record = editorState?.record || null;
    const button = $('#saveEditor');
    button.disabled = true;
    button.textContent = 'Salvando…';
    if (editorState) editorState.saving = true;
    setProductEditorDirty(true, editorState?.pendingGalleryFiles?.length ? 'Salvando e enviando fotos…' : 'Salvando alterações…');
    let uploadedOgImage = null;
    let persisted = false;
    let createdProductId = null;
    let completed = false;
    try {
      const values = formValues(productFields.filter(field => !['section', 'benefits'].includes(field[0])), form);
      values.dimensions = values.dimensions_text ? { description: values.dimensions_text } : {};
      values.specifications = parseSpecificationsText(values.specifications_text);
      values.sku = values.sku || null;
      delete values.dimensions_text;
      delete values.specifications_text;
      const ogFile = form.elements.og_image_url?.files?.[0];
      if (ogFile) { uploadedOgImage = await upload('products', ogFile, 'sharing'); values.og_image_url = uploadedOgImage.url; }
      else delete values.og_image_url;
      const result = record
        ? await db.from('products').update(values).eq('id', record.id).select().single()
        : await db.from('products').insert(values).select().single();
      if (result.error) throw result.error;
      persisted = true;
      if (!record) createdProductId = result.data.id;
      if (uploadedOgImage && record?.og_image_url && record.og_image_url !== uploadedOgImage.url) await removeStoredUrl(record.og_image_url, 'products');
      await saveGallery(result.data.id, form.elements.gallery, 'products', {
        files: editorState?.pendingGalleryFiles || [], coverFile: editorState?.pendingCoverFile || null
      });
      completed = true;
      if (editorState) editorState.dirty = false;
      notifyStorefront('products'); $('#editorDialog').close(); toast('Produto salvo e sincronizado com o catálogo.'); render('products');
    } catch (error) {
      if (createdProductId && !completed) {
        const { error: rollbackError } = await db.from('products').delete().eq('id', createdProductId);
        if (!rollbackError && uploadedOgImage) await db.storage.from(uploadedOgImage.bucket).remove([uploadedOgImage.path]);
      } else if (uploadedOgImage && !persisted) await db.storage.from(uploadedOgImage.bucket).remove([uploadedOgImage.path]);
      if (error?.code === '23502' && /sku/i.test(error?.message || error?.details || '')) toast('Execute a migration 20260922_complete_product_editor.sql no Supabase para permitir produtos sem SKU.', 'error');
      else if (error?.code === '42703' || /whatsapp_enabled|cart_enabled|free_city_shipping|free_assembly|is_campaign/i.test(error?.message || '')) toast('Execute a migration 20260920_product_commerce_cards.sql no Supabase antes de salvar estes campos.', 'error');
      else toast(explain(error), 'error');
      if (editorState) { editorState.saving = false; setProductEditorDirty(true); }
    }
    finally { button.disabled = false; button.textContent = 'Salvar alterações'; if (editorState) editorState.saving = false; }
  }
  function productStockState(row) {
    if (Number(row.stock_quantity) === 0) return { key: 'out', label: 'Sem estoque' };
    if (Number(row.stock_quantity) <= Number(row.low_stock_threshold)) return { key: 'low', label: 'Estoque baixo' };
    return { key: 'in', label: 'Em estoque' };
  }
  function productCover(row) {
    return [...(row.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || Number(a.sort_order) - Number(b.sort_order))[0]?.image_url;
  }
  function productRow(row) {
    const image = productCover(row);
    const stock = productStockState(row);
    const currentPrice = row.promotional_price ?? row.price;
    const actions = ActionMenu({
      id: `product-${row.id}`,
      label: row.name,
      primary: { label: 'Editar', icon: 'edit', attributes: { 'data-product-edit': row.id } },
      actions: [
        { label: 'Visualizar', icon: 'view', attributes: { 'data-product-view': row.id } },
        { label: 'Editar', icon: 'edit', attributes: { 'data-product-edit': row.id } },
        { label: 'Duplicar', icon: 'copy', attributes: { 'data-product-duplicate': row.id } },
        { label: row.active ? 'Desativar' : 'Ativar', icon: row.active ? 'pause' : 'play', attributes: { 'data-product-toggle': row.id } },
        { separator: true },
        { label: 'Excluir', icon: 'trash', danger: true, attributes: { 'data-product-delete': row.id } }
      ]
    });
    return `<tr data-product-id="${row.id}">
      <td class="product-select-cell"><input type="checkbox" data-product-select="${row.id}" aria-label="Selecionar ${esc(row.name)}" ${productViewState.selected.has(row.id) ? 'checked' : ''}></td>
      <td><div class="product-identity">${image ? `<img class="thumb" src="${esc(image)}" alt="${esc(row.name)}">` : '<span class="product-thumb-placeholder" aria-hidden="true">▦</span>'}<span><b>${esc(row.name)}</b><small>${row.sku ? `SKU: ${esc(row.sku)}` : 'SKU não informado'}</small></span></div></td>
      <td><span class="product-category-chip">${esc(row.categories?.name || 'Sem categoria')}</span></td>
      <td class="product-price">${row.promotional_price ? `<del>${brl(row.price)}</del>` : ''}<strong>${brl(currentPrice)}</strong></td>
      <td class="product-stock"><b>${Number(row.stock_quantity)}</b><span class="stock-chip ${stock.key}">${stock.label}</span></td>
      <td><span class="product-status ${row.active ? 'published' : 'inactive'}"><i aria-hidden="true"></i>${row.active ? 'Publicado' : 'Inativo'}</span></td>
      <td><label class="product-switch" title="${row.featured ? 'Remover dos destaques' : 'Adicionar aos destaques'}"><input type="checkbox" data-product-featured="${row.id}" ${row.featured ? 'checked' : ''} ${canWrite() ? '' : 'disabled'}><span></span><em>${row.featured ? 'ON' : 'OFF'}</em></label></td>
      <td class="product-actions action-cell">${actions}</td>
    </tr>`;
  }
  function productPagination(current, total) {
    if (total <= 1) return `<button class="current" type="button" aria-current="page">1</button>`;
    const pages = total <= 7 ? Array.from({ length: total }, (_, index) => index + 1) : [1, ...(current > 3 ? ['…'] : []), ...[current - 1, current, current + 1].filter(page => page > 1 && page < total), ...(current < total - 2 ? ['…'] : []), total];
    return `<button type="button" data-product-page="${Math.max(1, current - 1)}" ${current === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>${pages.map(page => page === '…' ? '<span>…</span>' : `<button type="button" data-product-page="${page}" class="${page === current ? 'current' : ''}" ${page === current ? 'aria-current="page"' : ''}>${page}</button>`).join('')}<button type="button" data-product-page="${Math.min(total, current + 1)}" ${current === total ? 'disabled' : ''} aria-label="Próxima página">›</button>`;
  }
  async function renderProducts(revision) {
    const { data, error } = await db.from('products').select('*,categories(name),product_images(id,image_url,storage_path,alt_text,is_cover,sort_order)').is('deleted_at', null).order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    if (revision !== viewRevision) return;
    const rows = data || [];
    const rowFor = id => rows.find(row => row.id === id);
    const categories = [...new Set(rows.map(row => row.categories?.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    productViewState.selected = new Set([...productViewState.selected].filter(id => rowFor(id)));
    if (productViewState.category && !categories.includes(productViewState.category)) productViewState.category = '';
    const active = rows.filter(row => row.active).length;
    const inactive = rows.length - active;
    const lowStock = rows.filter(row => Number(row.stock_quantity) <= Number(row.low_stock_threshold)).length;
    const pageBadge = $('#pageBadge');
    pageBadge.hidden = false;
    pageBadge.textContent = `Total de ${rows.length} produtos`;
    const pageAction = $('#pageAction');
    pageAction.hidden = false;
    pageAction.textContent = '+  Novo produto';
    pageAction.onclick = () => productEditor();
    $('#content').innerHTML = `<div class="product-metrics">
      <article class="product-metric total"><span class="metric-icon" aria-hidden="true">▦</span><div><b>${rows.length}</b><small>Total de produtos</small></div></article>
      <article class="product-metric active"><span class="metric-icon" aria-hidden="true">✓</span><div><b>${active}</b><small>Produtos ativos</small></div></article>
      <article class="product-metric inactive"><span class="metric-icon" aria-hidden="true">Ⅱ</span><div><b>${inactive}</b><small>Produtos inativos</small></div></article>
      <article class="product-metric low"><span class="metric-icon" aria-hidden="true">!</span><div><b>${lowStock}</b><small>Estoque baixo</small></div></article>
    </div>
    <div class="product-controls card"><label class="product-search"><span aria-hidden="true">⌕</span><input id="searchList" type="search" placeholder="Buscar produto ou SKU..." value="${esc(productViewState.search)}"></label><div class="product-filter-row"><select id="categoryFilter" aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>${categories.map(name => `<option value="${esc(name)}" ${productViewState.category === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select><select id="statusFilter" aria-label="Filtrar por status"><option value="">Todos os status</option><option value="active" ${productViewState.status === 'active' ? 'selected' : ''}>Publicados</option><option value="inactive" ${productViewState.status === 'inactive' ? 'selected' : ''}>Inativos</option></select><select id="stockFilter" aria-label="Filtrar por estoque"><option value="">Todo estoque</option><option value="out" ${productViewState.stock === 'out' ? 'selected' : ''}>Sem estoque</option><option value="low" ${productViewState.stock === 'low' ? 'selected' : ''}>Estoque baixo</option><option value="in" ${productViewState.stock === 'in' ? 'selected' : ''}>Em estoque</option></select><select id="productSort" aria-label="Ordenar produtos"><option value="newest" ${productViewState.sort === 'newest' ? 'selected' : ''}>Ordenar por: recentes</option><option value="name" ${productViewState.sort === 'name' ? 'selected' : ''}>Nome (A–Z)</option><option value="price-asc" ${productViewState.sort === 'price-asc' ? 'selected' : ''}>Menor preço</option><option value="price-desc" ${productViewState.sort === 'price-desc' ? 'selected' : ''}>Maior preço</option><option value="stock" ${productViewState.sort === 'stock' ? 'selected' : ''}>Menor estoque</option></select></div><div class="product-view-toggle" role="group" aria-label="Modo de visualização"><button type="button" data-product-view-mode="list" class="${productViewState.view === 'list' ? 'is-active' : ''}" aria-label="Visualização em lista">${actionIcon('list')}</button><button type="button" data-product-view-mode="grid" class="${productViewState.view === 'grid' ? 'is-active' : ''}" aria-label="Visualização em grade">${actionIcon('grid')}</button></div><button class="advanced-filters" id="openProductFilters" type="button">${actionIcon('filter')}<span>Filtros avançados</span></button></div>
    <div class="card product-table-card ${productViewState.view === 'grid' ? 'grid-mode' : ''}" id="productTableCard"><div class="table-wrap"><table class="data-table product-table" id="productTable"><thead><tr><th><input id="selectPageProducts" type="checkbox" aria-label="Selecionar produtos desta página"></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Destaque</th><th>Ações</th></tr></thead><tbody id="productRows"></tbody></table></div><div class="empty product-empty admin-empty" id="productEmpty" hidden><span class="admin-empty-icon" aria-hidden="true">⌕</span><h2>Nenhum produto encontrado</h2><p>Ajuste os filtros ou cadastre um novo produto.</p><button id="emptyNewProduct" class="secondary" type="button">+ Novo produto</button></div><footer class="product-pagination" id="productPagination"></footer></div>
    <div class="product-filter-drawer" id="productFilterDrawer" hidden><button class="product-filter-backdrop" type="button" data-product-filters-close aria-label="Fechar filtros"></button><aside role="dialog" aria-modal="true" aria-labelledby="productFilterTitle"><header><div><small>CATÁLOGO</small><h2 id="productFilterTitle">Filtros avançados</h2></div><button type="button" data-product-filters-close aria-label="Fechar filtros">×</button></header><div class="product-filter-fields"><label>Categoria<select id="mobileCategoryFilter"><option value="">Todas as categorias</option>${categories.map(name => `<option value="${esc(name)}" ${productViewState.category === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label><label>Status<select id="mobileStatusFilter"><option value="">Todos os status</option><option value="active" ${productViewState.status === 'active' ? 'selected' : ''}>Publicados</option><option value="inactive" ${productViewState.status === 'inactive' ? 'selected' : ''}>Inativos</option></select></label><label>Estoque<select id="mobileStockFilter"><option value="">Todo estoque</option><option value="out" ${productViewState.stock === 'out' ? 'selected' : ''}>Sem estoque</option><option value="low" ${productViewState.stock === 'low' ? 'selected' : ''}>Estoque baixo</option><option value="in" ${productViewState.stock === 'in' ? 'selected' : ''}>Em estoque</option></select></label><label>Ordenação<select id="mobileProductSort"><option value="newest" ${productViewState.sort === 'newest' ? 'selected' : ''}>Mais recentes</option><option value="name" ${productViewState.sort === 'name' ? 'selected' : ''}>Nome (A–Z)</option><option value="price-asc" ${productViewState.sort === 'price-asc' ? 'selected' : ''}>Menor preço</option><option value="price-desc" ${productViewState.sort === 'price-desc' ? 'selected' : ''}>Maior preço</option><option value="stock" ${productViewState.sort === 'stock' ? 'selected' : ''}>Menor estoque</option></select></label><label class="drawer-check"><input id="featuredOnly" type="checkbox" ${productViewState.featuredOnly ? 'checked' : ''}> Somente produtos em destaque</label><label class="drawer-check"><input id="promotionOnly" type="checkbox" ${productViewState.promotionOnly ? 'checked' : ''}> Somente produtos em promoção</label></div><footer><button class="secondary" id="clearProductFilters" type="button">Limpar filtros</button><button type="button" data-product-filters-close>Aplicar filtros</button></footer></aside></div>`;

    const filteredProducts = () => {
      const term = productViewState.search.trim().toLowerCase();
      const filtered = rows.filter(row => {
        const stock = productStockState(row).key;
        return (!term || `${row.name} ${row.sku || ''}`.toLowerCase().includes(term))
          && (!productViewState.category || row.categories?.name === productViewState.category)
          && (!productViewState.status || (productViewState.status === 'active') === Boolean(row.active))
          && (!productViewState.stock || stock === productViewState.stock)
          && (!productViewState.featuredOnly || row.featured)
          && (!productViewState.promotionOnly || row.promotional_price);
      });
      return filtered.sort((left, right) => {
        if (productViewState.sort === 'name') return left.name.localeCompare(right.name, 'pt-BR');
        if (productViewState.sort === 'price-asc') return Number(left.promotional_price ?? left.price) - Number(right.promotional_price ?? right.price);
        if (productViewState.sort === 'price-desc') return Number(right.promotional_price ?? right.price) - Number(left.promotional_price ?? left.price);
        if (productViewState.sort === 'stock') return Number(left.stock_quantity) - Number(right.stock_quantity);
        return new Date(right.created_at) - new Date(left.created_at);
      });
    };
    const duplicateProduct = async source => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const allowed = ['short_description','description','category_id','brand_id','environment_id','price','promotional_price','cost_price','stock_quantity','low_stock_threshold','featured','best_seller','new_arrival','on_sale','sort_order','warranty','dimensions','material','color','specifications','installment_enabled','max_installments','meta_title','meta_description','og_image_url','whatsapp_enabled','cart_enabled','free_city_shipping','free_assembly','is_campaign'];
      const copy = Object.fromEntries(allowed.map(key => [key, source[key]]));
      copy.name = `${source.name} — cópia`;
      copy.slug = `${source.slug}-copia-${Date.now().toString().slice(-6)}`;
      copy.sku = source.sku ? `${source.sku}-C${Date.now().toString().slice(-5)}` : null;
      copy.active = false;
      copy.view_count = 0;
      const { data: duplicate, error: duplicateError } = await db.from('products').insert(copy).select().single();
      if (duplicateError) return toast(explain(duplicateError), 'error');
      if (source.product_images?.length) {
        const imageCopies = source.product_images.map(image => ({ product_id: duplicate.id, image_url: image.image_url, storage_path: `references/${duplicate.id}/${crypto.randomUUID()}`, alt_text: image.alt_text, is_cover: image.is_cover, sort_order: image.sort_order }));
        const { error: imageError } = await db.from('product_images').insert(imageCopies);
        if (imageError) toast(`Produto duplicado, mas as fotos não foram copiadas: ${explain(imageError)}`, 'error');
      }
      notifyStorefront('products'); toast('Produto duplicado como rascunho.'); render('products');
    };
    const bindProductRows = pageRows => {
      bindActionMenus($('#productRows'));
      $$('[data-product-view]').forEach(button => button.onclick = () => window.open(`index.html?product=${encodeURIComponent(button.dataset.productView)}#catalogo`, '_blank', 'noopener'));
      $$('[data-product-edit]').forEach(button => button.onclick = () => productEditor(rowFor(button.dataset.productEdit)));
      $$('[data-product-duplicate]').forEach(button => button.onclick = () => runAction(button, () => duplicateProduct(rowFor(button.dataset.productDuplicate))));
      $$('[data-product-toggle]').forEach(button => button.onclick = () => runAction(button, async () => {
        if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
        const row = rowFor(button.dataset.productToggle);
        if (!await confirmAction({ title: `${row.active ? 'Desativar' : 'Ativar'} este produto?`, message: `“${row.name}” será ${row.active ? 'retirado da vitrine' : 'publicado novamente na vitrine'}.`, confirmLabel: row.active ? 'Desativar' : 'Ativar' })) return;
        const { error: toggleError } = await db.from('products').update({ active: !row.active }).eq('id', row.id);
        if (toggleError) return toast(explain(toggleError), 'error');
        notifyStorefront('products'); toast(row.active ? 'Produto desativado no site.' : 'Produto publicado no site.'); render('products');
      }));
      $$('[data-product-delete]').forEach(button => button.onclick = () => runAction(button, async () => {
        const row = rowFor(button.dataset.productDelete);
        if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
        if (!await confirmAction({ title: 'Excluir este produto?', message: `“${row.name}” será removido do catálogo. Esta ação não poderá ser desfeita pelo painel.`, confirmLabel: 'Excluir', tone: 'danger' })) return;
        const { error: updateError } = await db.from('products').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', row.id);
        if (updateError) return toast(explain(updateError), 'error');
        productViewState.selected.delete(row.id);
        notifyStorefront('products'); toast('Produto excluído com sucesso.'); render('products');
      }));
      $$('[data-product-featured]').forEach(input => input.onchange = async () => {
        if (!canWrite()) { input.checked = !input.checked; return toast('Seu perfil possui acesso somente para consulta.'); }
        input.disabled = true;
        const row = rowFor(input.dataset.productFeatured);
        const { error: updateError } = await db.from('products').update({ featured: input.checked }).eq('id', row.id);
        input.disabled = false;
        if (updateError) { input.checked = !input.checked; return toast(explain(updateError)); }
        row.featured = input.checked;
        input.closest('.product-switch').querySelector('em').textContent = input.checked ? 'ON' : 'OFF';
        notifyStorefront('products'); toast(input.checked ? 'Produto adicionado aos destaques.' : 'Produto removido dos destaques.');
      });
      const updateSelection = () => {
        const selectedOnPage = pageRows.filter(row => productViewState.selected.has(row.id)).length;
        const selectAll = $('#selectPageProducts');
        if (selectAll) {
          selectAll.checked = Boolean(pageRows.length) && selectedOnPage === pageRows.length;
          selectAll.indeterminate = selectedOnPage > 0 && selectedOnPage < pageRows.length;
        }
        $('#selectedProductCount').textContent = `${productViewState.selected.size} produto${productViewState.selected.size === 1 ? '' : 's'} selecionado${productViewState.selected.size === 1 ? '' : 's'}`;
      };
      $$('[data-product-select]').forEach(input => input.onchange = () => {
        if (input.checked) productViewState.selected.add(input.dataset.productSelect);
        else productViewState.selected.delete(input.dataset.productSelect);
        updateSelection();
      });
      $('#selectPageProducts').onchange = event => {
        pageRows.forEach(row => event.target.checked ? productViewState.selected.add(row.id) : productViewState.selected.delete(row.id));
        $$('[data-product-select]').forEach(input => { input.checked = event.target.checked; });
        updateSelection();
      };
      updateSelection();
    };
    const paintProducts = () => {
      const filtered = filteredProducts();
      const totalPages = Math.max(1, Math.ceil(filtered.length / productViewState.pageSize));
      productViewState.page = Math.min(Math.max(1, productViewState.page), totalPages);
      const start = (productViewState.page - 1) * productViewState.pageSize;
      const pageRows = filtered.slice(start, start + productViewState.pageSize);
      $('#productRows').innerHTML = pageRows.map(productRow).join('');
      $('#productTable').hidden = !filtered.length;
      $('#productEmpty').hidden = Boolean(filtered.length);
      $('#productPagination').innerHTML = `<span id="selectedProductCount">${productViewState.selected.size} produtos selecionados</span><div><label>Itens por página <select id="productPageSize"><option value="10" ${productViewState.pageSize === 10 ? 'selected' : ''}>10</option><option value="20" ${productViewState.pageSize === 20 ? 'selected' : ''}>20</option><option value="50" ${productViewState.pageSize === 50 ? 'selected' : ''}>50</option></select></label><nav aria-label="Paginação dos produtos">${productPagination(productViewState.page, totalPages)}</nav></div>`;
      bindProductRows(pageRows);
      $$('[data-product-page]').forEach(button => button.onclick = () => { productViewState.page = Number(button.dataset.productPage); paintProducts(); $('#productTableCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      $('#productPageSize').onchange = event => { productViewState.pageSize = Number(event.target.value); productViewState.page = 1; paintProducts(); };
      $('#emptyNewProduct')?.addEventListener('click', () => productEditor());
    };
    const applyDesktopFilters = () => {
      productViewState.search = $('#searchList').value;
      productViewState.category = $('#categoryFilter').value;
      productViewState.status = $('#statusFilter').value;
      productViewState.stock = $('#stockFilter').value;
      productViewState.sort = $('#productSort').value;
      $('#mobileCategoryFilter').value = productViewState.category;
      $('#mobileStatusFilter').value = productViewState.status;
      $('#mobileStockFilter').value = productViewState.stock;
      $('#mobileProductSort').value = productViewState.sort;
      productViewState.page = 1;
      paintProducts();
    };
    $('#searchList').addEventListener('input', applyDesktopFilters);
    ['categoryFilter', 'statusFilter', 'stockFilter', 'productSort'].forEach(id => $('#' + id).addEventListener('change', applyDesktopFilters));
    [['mobileCategoryFilter','category','categoryFilter'],['mobileStatusFilter','status','statusFilter'],['mobileStockFilter','stock','stockFilter'],['mobileProductSort','sort','productSort']].forEach(([id, key, desktopId]) => $('#' + id).addEventListener('change', event => { productViewState[key] = event.target.value; $('#' + desktopId).value = event.target.value; productViewState.page = 1; paintProducts(); }));
    $('#featuredOnly').onchange = event => { productViewState.featuredOnly = event.target.checked; productViewState.page = 1; paintProducts(); };
    $('#promotionOnly').onchange = event => { productViewState.promotionOnly = event.target.checked; productViewState.page = 1; paintProducts(); };
    $$('[data-product-view-mode]').forEach(button => button.onclick = () => {
      productViewState.view = button.dataset.productViewMode;
      $$('[data-product-view-mode]').forEach(item => item.classList.toggle('is-active', item === button));
      $('#productTableCard').classList.toggle('grid-mode', productViewState.view === 'grid');
    });
    const filterDrawer = $('#productFilterDrawer');
    const closeFilters = () => { filterDrawer.hidden = true; document.body.classList.remove('product-filters-open'); };
    $('#openProductFilters').onclick = () => { filterDrawer.hidden = false; document.body.classList.add('product-filters-open'); requestAnimationFrame(() => $('#mobileCategoryFilter').focus()); };
    $$('[data-product-filters-close]').forEach(button => button.onclick = closeFilters);
    $('#clearProductFilters').onclick = () => {
      Object.assign(productViewState, { page: 1, search: '', category: '', status: '', stock: '', sort: 'newest', featuredOnly: false, promotionOnly: false });
      $('#searchList').value = '';
      ['categoryFilter','statusFilter','stockFilter','mobileCategoryFilter','mobileStatusFilter','mobileStockFilter'].forEach(id => { $('#' + id).value = ''; });
      $('#productSort').value = $('#mobileProductSort').value = 'newest';
      $('#featuredOnly').checked = $('#promotionOnly').checked = false;
      paintProducts();
    };
    paintProducts();
  }

  async function renderStock(revision) {
    const [productsResult, historyResult] = await Promise.all([
      db.from('products').select('id,name,sku,stock_quantity,low_stock_threshold').is('deleted_at', null).order('name'),
      db.from('stock_history').select('id,product_id,previous_quantity,new_quantity,change_quantity,reason,user_id,created_at').order('created_at', { ascending: false }).limit(100)
    ]);
    if (productsResult.error) throw productsResult.error;
    if (historyResult.error) throw historyResult.error;
    if (revision !== viewRevision) return;
    const productNames = Object.fromEntries((productsResult.data || []).map(item => [item.id, item.name]));
    $('#content').innerHTML = `<div class="toolbar"><input id="searchList" placeholder="Buscar produto…"><select id="stockFilter"><option value="">Todos</option><option>Sem estoque</option><option>Estoque baixo</option></select></div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Produto</th><th>SKU</th><th>Quantidade</th><th>Mínimo</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${(productsResult.data || []).map(stockRow).join('')}</tbody></table></div><details class="card history"><summary>Histórico de movimentações (${(historyResult.data || []).length})</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Produto</th><th>Anterior</th><th>Novo</th><th>Alteração</th><th>Motivo</th></tr></thead><tbody>${(historyResult.data || []).map(row => `<tr><td>${dateTime(row.created_at)}</td><td>${esc(productNames[row.product_id] || row.product_id)}</td><td>${row.previous_quantity}</td><td>${row.new_quantity}</td><td>${row.change_quantity > 0 ? '+' : ''}${row.change_quantity}</td><td>${esc(row.reason)}</td></tr>`).join('')}</tbody></table></div></details>`;
    bindSearch();
    $('#stockFilter').onchange = event => $$('tbody tr').forEach(row => { if (row.dataset.stock) row.hidden = event.target.value && row.dataset.stock !== event.target.value; });
    $$('[data-stock-save]').forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const id = button.dataset.stockSave;
      const values = { stock_quantity: Number($(`[data-stock-qty="${id}"]`).value), low_stock_threshold: Number($(`[data-stock-min="${id}"]`).value) };
      const { error } = await db.from('products').update(values).eq('id', id);
      if (error) return toast(explain(error), 'error');
      notifyStorefront('products'); toast('Estoque atualizado e histórico registrado.'); render('stock');
    }));
  }
  function stockRow(row) {
    const label = row.stock_quantity === 0 ? 'Sem estoque' : row.stock_quantity <= row.low_stock_threshold ? 'Estoque baixo' : 'Disponível';
    const action = ActionMenu({ id: `stock-${row.id}`, label: row.name, primary: { label: 'Salvar', icon: 'save', attributes: { 'data-stock-save': row.id } } });
    return `<tr data-stock="${label}"><td><b>${esc(row.name)}</b></td><td>${row.sku ? esc(row.sku) : '—'}</td><td><input style="width:90px" type="number" min="0" value="${row.stock_quantity}" data-stock-qty="${row.id}"></td><td><input style="width:90px" type="number" min="0" value="${row.low_stock_threshold}" data-stock-min="${row.id}"></td><td><span class="badge ${label === 'Sem estoque' ? 'off' : label === 'Estoque baixo' ? 'warn' : ''}">${label}</span></td><td class="action-cell">${action}</td></tr>`;
  }

  async function renderLeads(revision) {
    const { data, error } = await db.from('leads').select('*,products(name)').order('created_at', { ascending: false }).limit(300);
    if (error) throw error;
    if (revision !== viewRevision) return;
    $('#content').innerHTML = `<div class="toolbar"><input id="searchList" placeholder="Buscar lead…"><select id="leadFilter"><option value="">Todos os status</option><option value="novo">Novo</option><option value="em_atendimento">Em atendimento</option><option value="convertido">Convertido</option><option value="encerrado">Encerrado</option></select></div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Produto</th><th>Origem</th><th>Mensagem</th><th>Status</th></tr></thead><tbody>${(data || []).map(row => `<tr data-status="${row.status}"><td><b>${esc(row.name)}</b><small class="price-old">${dateTime(row.created_at)}</small></td><td>${esc(row.phone || row.email)}</td><td>${esc(row.products?.name || '—')}</td><td>${esc(row.source || 'Site')}</td><td title="${esc(row.message)}">${esc((row.message || '').slice(0, 45))}</td><td><select data-lead-status="${row.id}"><option value="novo" ${row.status === 'novo' ? 'selected' : ''}>Novo</option><option value="em_atendimento" ${row.status === 'em_atendimento' ? 'selected' : ''}>Em atendimento</option><option value="convertido" ${row.status === 'convertido' ? 'selected' : ''}>Convertido</option><option value="encerrado" ${row.status === 'encerrado' ? 'selected' : ''}>Encerrado</option></select></td></tr>`).join('')}</tbody></table></div>`;
    bindSearch();
    $('#leadFilter').onchange = event => $$('tbody tr').forEach(row => { row.hidden = event.target.value && row.dataset.status !== event.target.value; });
    $$('[data-lead-status]').forEach(select => select.onchange = async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      select.disabled = true;
      const { error: saveError } = await db.from('leads').update({ status: select.value }).eq('id', select.dataset.leadStatus);
      select.disabled = false;
      toast(saveError ? explain(saveError) : 'Status do atendimento atualizado.', saveError ? 'error' : 'success');
    });
  }

  function ecommerceSchemaMissing(error) {
    return ['42P01', 'PGRST205'].includes(error?.code) || /online_sales_settings|orders|does not exist|schema cache/i.test(error?.message || '');
  }
  function ecommerceMigrationNotice() {
    return `<div class="card empty ecommerce-migration"><h2>Estrutura pronta para ativação</h2><p>Execute a migration <b>20260923_ecommerce_foundation.sql</b> no Supabase para habilitar pedidos, reservas de estoque e configurações de vendas.</p><small>Nenhuma cobrança será criada enquanto um gateway oficial não estiver configurado.</small></div>`;
  }
  function orderStatusGroup(order) {
    if (['cancelled', 'refunded'].includes(order.status)) return 'cancelled';
    if (order.status === 'completed') return 'completed';
    if (['ready_for_pickup', 'out_for_delivery'].includes(order.status)) return 'fulfillment';
    if (order.status === 'preparing') return 'preparing';
    if (order.payment_status === 'approved') return 'paid';
    return 'pending';
  }
  function orderStatusTone(status) {
    if (['cancelled', 'refunded'].includes(status)) return 'off';
    if (['payment_approved', 'completed'].includes(status)) return 'success';
    if (['awaiting_payment', 'received'].includes(status)) return 'warn';
    return 'info';
  }
  function allowedOrderTransitions(order) {
    if (['received', 'awaiting_payment'].includes(order.status)) return [['cancelled', 'Cancelar pedido']];
    if (order.status === 'payment_approved') return [['preparing', 'Iniciar preparação']];
    if (order.status === 'preparing') return order.delivery_method === 'pickup' ? [['ready_for_pickup', 'Pronto para retirada']] : [['out_for_delivery', 'Saiu para entrega']];
    if (['ready_for_pickup', 'out_for_delivery'].includes(order.status)) return [['completed', 'Concluir pedido']];
    return [];
  }
  function orderAddress(order) {
    if (order.delivery_method === 'pickup') return 'Retirada na loja';
    const address = order.delivery_address || {};
    return [address.street && `${address.street}, ${address.number || 's/n'}`, address.complement, address.neighborhood, [address.city, address.state].filter(Boolean).join(' - '), address.postal_code].filter(Boolean).join(' · ') || 'Endereço não informado';
  }
  function openOrderDetail(order) {
    const dialog = $('#orderDetailDialog');
    const items = order.order_items || [];
    const events = [...(order.order_events || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const transitions = allowedOrderTransitions(order);
    dialog.innerHTML = `<div class="order-detail-shell"><header><div><small>PEDIDO</small><h2>${esc(order.order_number)}</h2><span class="badge ${orderStatusTone(order.status)}">${esc(ORDER_STATUS_LABELS[order.status] || order.status)}</span></div><button class="icon-close" type="button" data-order-close aria-label="Fechar">×</button></header><div class="order-detail-grid"><section><h3>Cliente</h3><p><b>${esc(order.customer_name)}</b><br>${esc(order.customer_email)}<br>${esc(order.customer_phone)}${order.customer_cpf ? `<br>CPF: ${esc(order.customer_cpf)}` : ''}</p></section><section><h3>Entrega</h3><p>${esc(orderAddress(order))}</p></section><section><h3>Pagamento</h3><p><b>${order.payment_method === 'pix' ? 'PIX' : 'Cartão de crédito'}</b><br>${esc(PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status)}${order.gateway_transaction_id ? `<br>Transação: ${esc(order.gateway_transaction_id)}` : ''}</p></section></div><section class="order-items"><h3>Itens do pedido</h3>${items.map(item => `<div><img src="${esc(item.product_image_url || 'assets/logo.png')}" alt=""><span><b>${esc(item.product_name)}</b><small>${item.quantity} × ${brl(item.unit_price)}</small></span><strong>${brl(item.line_total)}</strong></div>`).join('') || '<p>Nenhum item registrado.</p>'}</section><section class="order-money"><span>Subtotal <b>${brl(order.subtotal)}</b></span><span>Descontos <b>− ${brl(order.discount_total)}</b></span><span>Frete <b>${brl(order.shipping_total)}</b></span><strong>Total <b>${brl(order.total)}</b></strong></section><section class="order-timeline"><h3>Histórico</h3>${events.map(event => `<div><i></i><span><b>${esc(event.title)}</b><small>${dateTime(event.created_at)}${event.description ? ` · ${esc(event.description)}` : ''}</small></span></div>`).join('') || '<p>O histórico aparecerá conforme o pedido avançar.</p>'}</section><footer>${transitions.map(([status, label]) => `<button type="button" data-order-next="${status}" class="${status === 'cancelled' ? 'secondary' : ''}">${esc(label)}</button>`).join('')}<button class="secondary" type="button" data-order-close>Fechar</button></footer><p class="payment-safety-note">O pagamento não pode ser aprovado manualmente. Essa confirmação será feita somente pelo webhook autenticado do gateway.</p></div>`;
    $$('[data-order-close]', dialog).forEach(button => button.onclick = () => dialog.close());
    $$('[data-order-next]', dialog).forEach(button => button.onclick = () => runAction(button, async () => {
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const next = button.dataset.orderNext;
      const label = ORDER_STATUS_LABELS[next] || next;
      if (!await confirmAction({ title: `Atualizar para “${label}”?`, message: `O pedido ${order.order_number} avançará no fluxo operacional.`, confirmLabel: label, tone: next === 'cancelled' ? 'danger' : 'default' })) return;
      const { error } = await db.rpc('admin_transition_order', { target_order_id: order.id, target_status: next });
      if (error) throw error;
      dialog.close(); toast('Status operacional atualizado.'); render('orders');
    }));
    dialog.showModal();
  }
  async function renderOrders(revision) {
    const { data, error } = await db.from('orders').select('*,order_items(*),order_events(*)').order('created_at', { ascending: false }).limit(300);
    if (error) {
      if (ecommerceSchemaMissing(error)) { if (revision === viewRevision) $('#content').innerHTML = ecommerceMigrationNotice(); return; }
      throw error;
    }
    if (revision !== viewRevision) return;
    const rows = data || [];
    const filters = [['all','Todos'],['pending','Aguardando pagamento'],['paid','Pagos'],['preparing','Preparando'],['fulfillment','Entrega / Retirada'],['completed','Concluídos'],['cancelled','Cancelados']];
    $('#content').innerHTML = `<div class="order-toolbar"><label><span aria-hidden="true">⌕</span><input id="searchOrders" type="search" placeholder="Buscar número, cliente ou telefone…"></label><div class="order-filters">${filters.map(([key,label]) => `<button type="button" data-order-filter="${key}" class="${key === 'all' ? 'is-active' : ''}">${label}</button>`).join('')}</div></div>${rows.length ? `<div class="card table-wrap"><table class="data-table order-table"><thead><tr><th>Número</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Pagamento</th><th>Entrega</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(order => `<tr data-order-group="${orderStatusGroup(order)}" data-order-search="${esc(`${order.order_number} ${order.customer_name} ${order.customer_phone}`.toLowerCase())}"><td><b>${esc(order.order_number)}</b></td><td><b>${esc(order.customer_name)}</b><small>${esc(order.customer_phone)}</small></td><td>${dateTime(order.created_at)}</td><td><b>${brl(order.total)}</b></td><td><span class="badge ${order.payment_status === 'approved' ? 'success' : order.payment_status === 'pending' ? 'warn' : 'off'}">${esc(PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status)}</span></td><td>${order.delivery_method === 'pickup' ? 'Retirada' : 'Entrega'}</td><td><span class="badge ${orderStatusTone(order.status)}">${esc(ORDER_STATUS_LABELS[order.status] || order.status)}</span></td><td><button class="secondary compact" type="button" data-order-open="${order.id}">Ver pedido</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="card empty"><h2>Nenhum pedido recebido</h2><p>Os pedidos reais aparecerão aqui quando o checkout e o gateway forem ativados.</p><small>A estrutura não cria pedidos ou pagamentos demonstrativos.</small></div>`}<dialog id="orderDetailDialog" class="order-detail-dialog"></dialog>`;
    let activeFilter = 'all';
    const apply = () => {
      const term = ($('#searchOrders')?.value || '').trim().toLowerCase();
      $$('tbody tr', $('#content')).forEach(row => { row.hidden = (activeFilter !== 'all' && row.dataset.orderGroup !== activeFilter) || !row.dataset.orderSearch.includes(term); });
    };
    $('#searchOrders')?.addEventListener('input', apply);
    $$('[data-order-filter]').forEach(button => button.onclick = () => { activeFilter = button.dataset.orderFilter; $$('[data-order-filter]').forEach(item => item.classList.toggle('is-active', item === button)); apply(); });
    $$('[data-order-open]').forEach(button => button.onclick = () => openOrderDetail(rows.find(order => order.id === button.dataset.orderOpen)));
  }
  async function renderOnlineSales(revision) {
    const { data, error } = await db.from('online_sales_settings').select('*').eq('id', true).maybeSingle();
    if (error) {
      if (ecommerceSchemaMissing(error)) { if (revision === viewRevision) $('#content').innerHTML = ecommerceMigrationNotice(); return; }
      throw error;
    }
    if (revision !== viewRevision) return;
    const settings = data || {};
    const providerReady = Boolean(settings.gateway_provider);
    const rule = Array.isArray(settings.shipping_rules) ? settings.shipping_rules[0] || {} : {};
    $('#content').innerHTML = `<form id="onlineSalesForm" class="online-sales-layout"><section class="card panel"><div class="online-sales-heading"><div><small>STATUS DA VENDA ONLINE</small><h2>${providerReady ? 'Gateway preparado' : 'Integração financeira pendente'}</h2><p>${providerReady ? `Provedor: ${esc(settings.gateway_provider)}` : 'PIX e cartão permanecerão bloqueados até a configuração segura do provedor.'}</p></div><span class="online-status ${providerReady ? 'ready' : ''}">${providerReady ? 'PRONTO' : 'ESTRUTURA'}</span></div><div class="settings-toggles"><label class="toggle"><input name="online_sales_enabled" type="checkbox" ${settings.online_sales_enabled ? 'checked' : ''} ${providerReady ? '' : 'disabled'}> Venda online ativa</label><label class="toggle"><input name="pix_enabled" type="checkbox" ${settings.pix_enabled ? 'checked' : ''} ${providerReady ? '' : 'disabled'}> PIX</label><label class="toggle"><input name="card_enabled" type="checkbox" ${settings.card_enabled ? 'checked' : ''} ${providerReady ? '' : 'disabled'}> Cartão de crédito</label><label class="toggle"><input name="pickup_enabled" type="checkbox" ${settings.pickup_enabled !== false ? 'checked' : ''}> Retirada na loja</label><label class="toggle"><input name="delivery_enabled" type="checkbox" ${settings.delivery_enabled ? 'checked' : ''}> Entrega</label><label class="toggle"><input name="require_cpf" type="checkbox" ${settings.require_cpf ? 'checked' : ''}> Solicitar CPF no checkout</label></div></section><section class="card panel"><h2>Condições comerciais</h2><div class="form-grid compact-settings"><div class="field"><label>Pedido mínimo</label><input name="minimum_order_amount" type="number" min="0" step="0.01" value="${Number(settings.minimum_order_amount || 0)}"></div><div class="field"><label>Máximo de parcelas</label><input name="max_installments" type="number" min="1" max="24" value="${Number(settings.max_installments || 10)}"></div><div class="field"><label>Reserva de estoque (minutos)</label><input name="reservation_minutes" type="number" min="5" max="1440" value="${Number(settings.reservation_minutes || 30)}"></div></div></section><section class="card panel"><h2>Regra principal de entrega</h2><p class="helper">A regra será aplicada somente aos CEPs informados. Frete grátis nunca será presumido para todo o Brasil.</p><div class="form-grid compact-settings"><div class="field"><label>Nome da região</label><input name="region_label" value="${esc(rule.label || '')}" placeholder="Ex.: Ribeira do Pombal"></div><div class="field"><label>Prefixos de CEP</label><input name="cep_prefixes" value="${esc((rule.cep_prefixes || []).join(', '))}" placeholder="Ex.: 48400, 48401"></div><div class="field"><label>Frete fixo</label><input name="flat_rate" type="number" min="0" step="0.01" value="${Number(rule.flat_rate || 0)}"></div><div class="field"><label>Frete grátis acima de</label><input name="free_shipping_min" type="number" min="0" step="0.01" value="${Number(rule.free_shipping_min || 0)}"></div><label class="toggle field-span"><input name="allow_product_free_shipping" type="checkbox" ${rule.allow_product_free_shipping ? 'checked' : ''}> Respeitar selo “Frete Grátis” nesta região</label></div></section><section class="card panel gateway-security"><h2>Segurança do gateway</h2><p>As credenciais secretas serão configuradas somente no ambiente seguro da função backend. Elas não aparecerão neste painel nem no navegador.</p><dl><div><dt>Provedor</dt><dd>${esc(settings.gateway_provider || 'A definir com o cliente')}</dd></div><div><dt>Webhook</dt><dd>${providerReady ? 'Aguardando endpoint oficial' : 'Será criado após a escolha do provedor'}</dd></div></dl></section><footer class="online-sales-save"><button type="submit">Salvar estrutura</button></footer></form>`;
    $('#onlineSalesForm').onsubmit = async event => {
      event.preventDefault();
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const form = event.currentTarget; const button = form.querySelector('[type="submit"]');
      if (button.disabled) return; button.disabled = true; button.classList.add('is-loading');
      try {
        const prefixes = form.elements.cep_prefixes.value.split(',').map(value => value.replace(/\D/g, '')).filter(Boolean);
        const shippingRules = prefixes.length ? [{ id: rule.id || crypto.randomUUID(), label: form.elements.region_label.value.trim() || 'Região de entrega', active: true, cep_prefixes: prefixes, flat_rate: Number(form.elements.flat_rate.value || 0), free_shipping_min: Number(form.elements.free_shipping_min.value || 0), allow_product_free_shipping: form.elements.allow_product_free_shipping.checked }] : [];
        const values = { pickup_enabled: form.elements.pickup_enabled.checked, delivery_enabled: form.elements.delivery_enabled.checked, require_cpf: form.elements.require_cpf.checked, minimum_order_amount: Number(form.elements.minimum_order_amount.value || 0), max_installments: Number(form.elements.max_installments.value || 10), reservation_minutes: Number(form.elements.reservation_minutes.value || 30), shipping_rules: shippingRules };
        if (providerReady) Object.assign(values, { online_sales_enabled: form.elements.online_sales_enabled.checked, pix_enabled: form.elements.pix_enabled.checked, card_enabled: form.elements.card_enabled.checked });
        const { error: saveError } = await db.from('online_sales_settings').update(values).eq('id', true);
        if (saveError) throw saveError;
        notifyStorefront('online_sales_settings'); toast('Estrutura de vendas online salva.'); render('online-sales');
      } catch (saveError) { toast(explain(saveError), 'error'); }
      finally { button.disabled = false; button.classList.remove('is-loading'); }
    };
  }

  const settingGroups = {
    store: { title: 'Dados da loja e WhatsApp', fields: [['store_name', 'Nome da loja', 'text'], ['phone', 'Telefone', 'text'], ['whatsapp', 'Número oficial do WhatsApp', 'text'], ['whatsapp_message', 'Mensagem padrão do WhatsApp', 'textarea'], ['whatsapp_button_text', 'Texto do botão de produto', 'text'], ['whatsapp_button_subtitle', 'Texto de apoio do botão', 'text'], ['product_benefit_secure_text', 'Benefício: compra segura', 'text'], ['product_benefit_pickup_text', 'Benefício: retirada na loja', 'text'], ['service_region', 'Cidade / região atendida', 'text'], ['address', 'Endereço', 'text'], ['city', 'Cidade', 'text'], ['state', 'Estado', 'text'], ['postal_code', 'CEP', 'text'], ['map_url', 'Link do Google Maps', 'text'], ['instagram', 'Instagram', 'text'], ['facebook', 'Facebook', 'text'], ['opening_hours', 'Horários', 'textarea']] },
    seo: { title: 'SEO padrão do site', fields: [['default_meta_title', 'Título do site', 'text'], ['default_meta_description', 'Descrição', 'textarea'], ['default_og_image_url', 'Imagem de compartilhamento', 'file']] },
    settings: { title: 'Identidade e informações gerais', fields: [['logo_url', 'Logo oficial', 'file'], ['favicon_url', 'Favicon', 'file'], ['primary_color', 'Cor principal', 'color'], ['accent_color', 'Cor de destaque', 'color'], ['institutional_text', 'Texto institucional', 'textarea'], ['footer_text', 'Texto do rodapé', 'textarea']] }
  };
  async function renderSettings(view, revision) {
    const { data, error } = await db.from('store_settings').select('*').eq('id', true).single();
    if (error) throw error;
    if (revision !== viewRevision) return;
    const group = settingGroups[view];
    $('#content').innerHTML = `<form id="settingsForm" class="card panel settings-form admin-settings-form"><header class="admin-section-header"><div><h2>${group.title}</h2><p>Revise os dados abaixo e salve para atualizar a loja.</p></div></header><div class="form-grid admin-settings-fields">${(await Promise.all(group.fields.map(field => fieldHtml(field, data)))).join('')}</div><footer class="admin-form-footer"><button class="primary-action" type="submit">Salvar configurações</button></footer></form>`;
    $('#settingsForm').onsubmit = async event => {
      event.preventDefault();
      if (!canWrite()) return toast('Seu perfil possui acesso somente para consulta.', 'error');
      const form = event.currentTarget;
      const submit = form.querySelector('[type="submit"]');
      if (submit.disabled) return;
      submit.disabled = true;
      submit.classList.add('is-loading');
      try {
        const values = formValues(group.fields, form);
        for (const [key, , type] of group.fields) if (type === 'file') {
          const file = form.elements[key].files?.[0];
          if (file) values[key] = (await upload('site', file, view)).url; else delete values[key];
        }
        const { error: saveError } = await db.from('store_settings').update(values).eq('id', true);
        if (saveError) throw saveError;
        notifyStorefront('store_settings');
        toast('Configurações salvas e disponíveis para o site.');
      } catch (saveError) {
        if (saveError?.code === '42703' || /whatsapp_button_text|whatsapp_button_subtitle|product_benefit_secure_text|product_benefit_pickup_text|service_region/i.test(saveError?.message || '')) toast('Execute a migration 20260920_product_commerce_cards.sql no Supabase antes de salvar estas configurações.', 'error');
        else toast(explain(saveError), 'error');
      }
      finally { submit.disabled = false; submit.classList.remove('is-loading'); }
    };
  }

  async function renderUsers(revision) {
    if (!canAdmin()) { $('#content').innerHTML = '<div class="card empty">Somente administradores podem gerenciar usuários.</div>'; return; }
    const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (revision !== viewRevision) return;
    $('#content').innerHTML = `<div class="toolbar"><input id="searchList" placeholder="Buscar usuário…"><button class="secondary" id="newUser" type="button">Como convidar usuário</button></div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Usuário</th><th>E-mail</th><th>Função</th><th>Status</th><th>Ação</th></tr></thead><tbody>${(data || []).map(row => {
      const saveAction = ActionMenu({
        id: `user-${row.id}`,
        label: row.full_name || row.email,
        primary: { label: 'Salvar', icon: 'save', ariaLabel: `Salvar permissões de ${row.full_name || row.email}`, attributes: { 'data-user-save': row.id, ...(row.id === profile.id ? { disabled: true } : {}) } }
      });
      return `<tr><td>${esc(row.full_name || 'Sem nome')}</td><td>${esc(row.email)}</td><td><select data-user-role="${row.id}" ${row.id === profile.id ? 'disabled' : ''}>${['viewer', 'editor', 'admin', 'super_admin'].map(role => `<option ${row.role === role ? 'selected' : ''}>${role}</option>`).join('')}</select></td><td><label class="toggle"><input type="checkbox" data-user-active="${row.id}" ${row.active ? 'checked' : ''} ${row.id === profile.id ? 'disabled' : ''}> Ativo</label></td><td class="action-cell">${saveAction}</td></tr>`;
    }).join('')}</tbody></table></div><p class="helper">Viewer consulta; editor altera conteúdo; admin gerencia usuários; super_admin possui acesso total.</p>`;
    bindSearch();
    $('#newUser').onclick = openNewUser;
    $$('[data-user-save]').forEach(button => button.onclick = () => runAction(button, async () => {
      const id = button.dataset.userSave;
      const active = $(`[data-user-active="${id}"]`).checked;
      const values = { role: $(`[data-user-role="${id}"]`).value, active };
      if ((data || []).some(row => String(row.id) === id && Object.hasOwn(row, 'access_approved'))) values.access_approved = active;
      const { error: saveError } = await db.from('profiles').update(values).eq('id', id);
      toast(saveError ? explain(saveError) : 'Permissões atualizadas.', saveError ? 'error' : 'success');
    }));
  }
  function openNewUser() {
    toast('Convide o usuário em Supabase → Authentication → Users. Depois, defina a função e ative o perfil nesta tela.', 'info');
  }
  async function renderAudit(revision) {
    if (!canAdmin()) { $('#content').innerHTML = '<div class="card empty">Somente administradores podem consultar a auditoria.</div>'; return; }
    const { data, error } = await db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    const people = await profilesMap((data || []).map(item => item.user_id));
    if (revision !== viewRevision) return;
    $('#content').innerHTML = `<div class="toolbar"><input id="searchList" placeholder="Buscar na auditoria…"></div><div class="card table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Registro</th><th>Alteração</th></tr></thead><tbody>${(data || []).map(row => `<tr><td>${dateTime(row.created_at)}</td><td>${esc(people[row.user_id] || 'Sistema')}</td><td><span class="badge info">${esc(row.action)}</span></td><td>${esc(row.entity)}</td><td>${esc(row.record_id)}</td><td class="audit-json">${esc(JSON.stringify(row.new_data || row.old_data || {}))}</td></tr>`).join('')}</tbody></table></div>`;
    bindSearch();
  }

  function enhanceTables(root = document) {
    $$('.data-table', root).forEach(table => {
      const labels = $$('thead th', table).map(cell => cell.textContent.trim());
      $$('tbody tr', table).forEach(row => $$('td', row).forEach((cell, index) => cell.dataset.label = labels[index] || 'Informação'));
    });
  }

  async function render(view) {
    if (!profile || !titles[view]) return;
    current = view;
    const revision = ++viewRevision;
    const meta = viewMeta[view] || ['▦', 'Gerencie o conteúdo e as configurações da loja.'];
    $('#pageTitle').textContent = titles[view];
    $('#breadcrumbRoot').textContent = view === 'products' ? 'Dashboard' : 'Atacarejo dos Móveis';
    $('#breadcrumbTitle').textContent = titles[view];
    $('#pageIcon').textContent = meta[0];
    $('#pageSubtitle').textContent = meta[1];
    $('#pageAction').hidden = true;
    $('#pageAction').onclick = null;
    $('#pageBadge').hidden = true;
    $('#panelSearch').value = '';
    $$('nav button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $('#content').dataset.view = view;
    $('#content').innerHTML = `<div class="admin-loading" role="status" aria-label="Carregando ${esc(titles[view])}"><span class="sr-only">Carregando dados…</span><div class="admin-loading-cards" aria-hidden="true"><span class="admin-skeleton"></span><span class="admin-skeleton"></span><span class="admin-skeleton"></span></div><div class="admin-skeleton admin-loading-table" aria-hidden="true"><span></span><span></span><span></span><span></span></div></div>`;
    $('#refresh').disabled = true;
    try {
      if (view === 'dashboard') await dashboard(revision);
      else if (view === 'products') await renderProducts(revision);
      else if (view === 'categories') await renderCategories(revision);
      else if (view === 'banners') await renderBanners(revision);
      else if (view === 'stock') await renderStock(revision);
      else if (view === 'leads') await renderLeads(revision);
      else if (view === 'orders') await renderOrders(revision);
      else if (view === 'online-sales') await renderOnlineSales(revision);
      else if (['store', 'seo', 'settings'].includes(view)) await renderSettings(view, revision);
      else if (view === 'users') await renderUsers(revision);
      else if (view === 'audit') await renderAudit(revision);
      else await renderSimple(view, revision);
    } catch (error) {
      if (revision === viewRevision) $('#content').innerHTML = `<div class="card empty error admin-empty" role="alert"><span class="admin-empty-icon" aria-hidden="true">!</span><h2>Não foi possível carregar ${esc(titles[view])}</h2><p>${esc(explain(error))}</p><button class="secondary" id="retryView" type="button">Tentar novamente</button></div>`;
      if (revision === viewRevision) $('#retryView').onclick = () => render(view);
    } finally {
      if (revision === viewRevision) {
        enhanceTables($('#content'));
        bindActionMenus($('#content'));
        $('#refresh').disabled = false;
      }
    }
  }
  let menuHistoryPushed = false;
  function openMobileMenu() {
    if (window.matchMedia('(min-width: 851px)').matches) {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      $('#openMenu').setAttribute('aria-expanded', String(!collapsed));
      return;
    }
    if ($('#sidebar').classList.contains('open')) return;
    $('#sidebar').classList.add('open');
    $('#openMenu').setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    history.pushState({ ...history.state, adminMenu: true }, '');
    menuHistoryPushed = true;
    requestAnimationFrame(() => $('#closeMenu').focus());
  }
  function closeMobileMenu(fromHistory = false) {
    if (!$('#sidebar').classList.contains('open')) return;
    $('#sidebar').classList.remove('open');
    $('#openMenu').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (!fromHistory && menuHistoryPushed && history.state?.adminMenu) { menuHistoryPushed = false; history.back(); }
    else menuHistoryPushed = false;
    $('#openMenu').focus();
  }
  function bindNav(root = document) {
    $$('[data-view]', root).forEach(button => button.onclick = () => { render(button.dataset.view); closeMobileMenu(); });
  }

  window.AdminUI = Object.freeze({
    ActionMenu,
    bindActionMenus,
    confirmAction,
    toast,
    syncProductBenefitPreview
  });

  $('#loginForm').addEventListener('submit', login);
  $('#logout').onclick = logout;
  $('#refresh').onclick = () => render(current);
  $('#openMenu').onclick = openMobileMenu;
  $('#closeMenu').onclick = () => closeMobileMenu();
  $('#menuBackdrop').onclick = () => closeMobileMenu();
  $('#panelSearch').addEventListener('input', event => {
    const listSearch = $('#searchList');
    if (!listSearch) return;
    listSearch.value = event.target.value;
    listSearch.dispatchEvent(new Event('input', { bubbles: true }));
  });
  async function requestEditorClose() {
    const dialog = $('#editorDialog');
    if (!dialog.open) return;
    if (editorState?.view === 'products' && editorState.dirty && !editorState.saving) {
      const discard = await confirmAction({
        title: 'Descartar alterações?',
        message: 'Este produto possui alterações que ainda não foram salvas.',
        confirmLabel: 'Descartar', tone: 'danger'
      });
      if (!discard) return;
    }
    dialog.close();
  }
  $$('[data-close]').forEach(button => button.onclick = requestEditorClose);
  $('#editorForm').addEventListener('submit', event => {
    if (editorState?.quick) { event.preventDefault(); return; }
    if (editorState?.view === 'products') return saveProduct(event);
    if (editorState?.view === 'categories') return saveCategory(event);
    if (editorState?.view === 'banners') return saveBanner(event);
    return saveGeneric(event);
  });
  const editorDialog = $('#editorDialog');
  new MutationObserver(() => document.body.classList.toggle('dialog-open', editorDialog.open)).observe(editorDialog, { attributes: true, attributeFilter: ['open'] });
  editorDialog.addEventListener('click', event => { if (event.target === editorDialog) requestEditorClose(); });
  editorDialog.addEventListener('cancel', event => { event.preventDefault(); requestEditorClose(); });
  editorDialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (editorState?.previewObjectUrl) URL.revokeObjectURL(editorState.previewObjectUrl);
    (editorState?.previewObjectUrls || []).forEach(url => URL.revokeObjectURL(url));
    if (editorState?.quick?.uploadObjectUrl) URL.revokeObjectURL(editorState.quick.uploadObjectUrl);
    editorState = null;
    $('#editorFields').replaceChildren();
    resetEditorChrome();
  });
  window.addEventListener('popstate', () => { if ($('#sidebar').classList.contains('open')) closeMobileMenu(true); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (activeActionTrigger) closeActionMenus({ restoreFocus: true });
    if ($('#sidebar').classList.contains('open')) closeMobileMenu();
    const drawer = $('#productFilterDrawer');
    if (drawer && !drawer.hidden) { drawer.hidden = true; document.body.classList.remove('product-filters-open'); }
  });
  document.addEventListener('click', () => closeActionMenus());
  window.addEventListener('resize', () => closeActionMenus());
  document.addEventListener('scroll', event => { if (!event.target.closest?.('.action-menu-popover')) closeActionMenus(); }, true);
  window.addEventListener('offline', () => toast('Conexão interrompida.'));
  bindNav();
  restore();
})();
