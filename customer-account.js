(() => {
  'use strict';

  const SUPABASE_URL = 'https://ejcmuygnfrmytdqlyhjr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
  if (!window.supabase?.createClient) return;

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'atacarejo-customer-auth'
    }
  });
  let session = null;
  let profile = null;
  let addresses = [];
  let returnToCheckout = false;
  let authRevision = 0;
  let favoritesSyncing = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const brl = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const digits = value => String(value || '').replace(/\D/g, '');
  const firstName = value => String(value || '').trim().split(/\s+/)[0] || 'Cliente';
  const orderNumber = order => `#${String(order.sequence_number || '').padStart(6, '0')}`;
  const statusLabels = { received: 'Pedido recebido', awaiting_payment: 'Aguardando pagamento', payment_approved: 'Pagamento aprovado', preparing: 'Preparando', ready_for_pickup: 'Pronto para retirada', out_for_delivery: 'Saiu para entrega', completed: 'Concluído', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const paymentLabels = { pending: 'Aguardando pagamento', approved: 'Pagamento aprovado', declined: 'Pagamento recusado', cancelled: 'Pagamento cancelado', refunded: 'Pagamento estornado' };

  function explain(error) {
    const message = String(error?.message || error || 'Não foi possível concluir.').toLowerCase();
    if (/invalid login credentials/.test(message)) return 'E-mail ou senha incorretos.';
    if (/user already registered|already been registered|already exists/.test(message)) return 'Este e-mail já possui uma conta.';
    if (/email not confirmed/.test(message)) return 'Confirme seu e-mail antes de entrar.';
    if (/password should be|weak password/.test(message)) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (/rate limit|too many/.test(message)) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (/network|fetch/.test(message)) return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
    if (/jwt|session|refresh token/.test(message)) return 'Sua sessão expirou. Entre novamente.';
    if (/row-level security|permission|42501/.test(message)) return 'Você não tem permissão para acessar estes dados.';
    if (/customer_profiles|customer_addresses|customer_favorites|create_customer_order|schema cache/.test(message)) return 'A estrutura da conta do cliente ainda não foi ativada no banco.';
    return String(error?.message || error || 'Não foi possível concluir.');
  }

  function alertBox(message, type = 'error') {
    return message ? `<p class="customer-alert ${type}">${esc(message)}</p>` : '';
  }

  function setBusy(form, busy, label = 'Aguarde…') {
    const button = form?.querySelector('[type="submit"]');
    if (!button) return;
    if (busy) { button.dataset.originalLabel = button.textContent; button.textContent = label; }
    else button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = busy;
  }

  function updateHeader() {
    const desktop = document.querySelector('#accountBtn');
    if (desktop) desktop.innerHTML = session ? `♙<span>Olá, ${esc(firstName(profile?.full_name || session.user.user_metadata?.full_name))}<small>Minha conta</small></span>` : '♙<span>Minha conta<small>Entrar / Cadastrar</small></span>';
    const mobile = document.querySelector('[data-mobile-route="conta"] small');
    if (mobile) mobile.textContent = session ? firstName(profile?.full_name || 'Conta') : 'Conta';
  }

  async function loadPrivateData() {
    if (!session) { profile = null; addresses = []; updateHeader(); return; }
    const revision = ++authRevision;
    const [profileResult, addressResult] = await Promise.all([
      db.from('customer_profiles').select('id,full_name,phone,created_at,updated_at').eq('id', session.user.id).maybeSingle(),
      db.from('customer_addresses').select('*').eq('customer_id', session.user.id).order('is_default', { ascending: false }).order('created_at')
    ]);
    if (revision !== authRevision) return;
    if (profileResult.error) throw profileResult.error;
    if (addressResult.error) throw addressResult.error;
    profile = profileResult.data || { id: session.user.id, full_name: session.user.user_metadata?.full_name || '', phone: session.user.user_metadata?.phone || '' };
    addresses = addressResult.data || [];
    updateHeader();
    await syncFavoritesAfterLogin();
  }

  async function restore() {
    try {
      const { data, error } = await db.auth.getSession();
      if (error) throw error;
      session = data.session || null;
      await loadPrivateData();
    } catch (error) {
      session = null; profile = null; addresses = []; updateHeader();
      console.warn('Não foi possível restaurar a conta do cliente.', error);
    } finally {
      const url = new URL(location.href); const accountRoute = url.searchParams.get('conta');
      if (accountRoute) {
        url.searchParams.delete('conta'); history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
        setTimeout(() => session ? renderDashboard() : accountRoute === 'recuperar' ? renderForgotPassword() : renderLogin(), 0);
      }
    }
  }

  function authShell(title, body, message = '', messageType = 'error') {
    window.openDrawer(`<section class="customer-auth"><header><small>CONTA DO CLIENTE</small><h2>${esc(title)}</h2><p>Compras, pedidos, endereços e favoritos em um só lugar.</p></header>${alertBox(message, messageType)}${body}</section>`);
    document.querySelector('#drawer')?.classList.add('customer-account-open');
  }

  function renderAuthHome(message = '', type = 'success') {
    authShell('Sua conta', `<div class="customer-auth-choices"><button type="button" data-customer-login><b>ENTRAR</b><span>Acessar pedidos e dados salvos</span></button><button type="button" data-customer-signup><b>CRIAR CONTA</b><span>Cadastro rápido e seguro</span></button></div><p class="customer-auth-note">Sua sacola continuará aqui durante o acesso.</p>`, message, type);
    document.querySelector('[data-customer-login]').onclick = () => renderLogin();
    document.querySelector('[data-customer-signup]').onclick = () => renderSignup();
  }

  function renderLogin(message = '', type = 'error') {
    authShell('Entrar na sua conta', `<form id="customerLoginForm" class="customer-form"><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">ENTRAR</button></form><button class="customer-text-button" type="button" data-customer-forgot>Esqueci minha senha</button><div class="customer-auth-switch"><span>Ainda não possui conta?</span><button type="button" data-customer-signup>CRIAR CONTA</button></div>`, message, type);
    document.querySelector('[data-customer-signup]').onclick = () => renderSignup();
    document.querySelector('[data-customer-forgot]').onclick = () => renderForgotPassword();
    document.querySelector('#customerLoginForm').onsubmit = login;
  }

  function renderSignup(message = '') {
    authShell('Criar conta', `<form id="customerSignupForm" class="customer-form"><label>Nome completo<input name="full_name" autocomplete="name" minlength="3" maxlength="160" required></label><label>WhatsApp / telefone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" minlength="10" maxlength="20" required></label><label>E-mail<input name="email" type="email" autocomplete="email" required></label><div class="customer-form-columns"><label>Senha<input name="password" type="password" autocomplete="new-password" minlength="8" required></label><label>Confirmar senha<input name="password_confirmation" type="password" autocomplete="new-password" minlength="8" required></label></div><small>Use pelo menos 8 caracteres.</small><button type="submit">CRIAR MINHA CONTA</button></form><div class="customer-auth-switch"><span>Já possui conta?</span><button type="button" data-customer-login>ENTRAR</button></div>`, message);
    document.querySelector('[data-customer-login]').onclick = () => renderLogin();
    document.querySelector('#customerSignupForm').onsubmit = signup;
  }

  function renderForgotPassword(message = '', type = 'error') {
    authShell('Recuperar senha', `<form id="customerForgotForm" class="customer-form"><p>Informe seu e-mail. Se houver uma conta correspondente, você receberá as instruções de recuperação.</p><label>E-mail<input name="email" type="email" autocomplete="email" required></label><button type="submit">ENVIAR INSTRUÇÕES</button></form><button class="customer-text-button" type="button" data-customer-login>← Voltar para entrar</button>`, message, type);
    document.querySelector('[data-customer-login]').onclick = () => renderLogin();
    document.querySelector('#customerForgotForm').onsubmit = forgotPassword;
  }

  async function login(event) {
    event.preventDefault(); const form = event.currentTarget; setBusy(form, true, 'ENTRANDO…');
    try {
      const values = new FormData(form);
      const { data, error } = await db.auth.signInWithPassword({ email: String(values.get('email')).trim(), password: String(values.get('password')) });
      if (error) throw error;
      session = data.session; await loadPrivateData();
      if (returnToCheckout) { returnToCheckout = false; window.closeDrawer(); window.resumeCheckoutAfterAuth?.(); }
      else renderDashboard('Bem-vindo de volta!', 'success');
    } catch (error) { renderLogin(explain(error)); }
    finally { setBusy(form, false); }
  }

  async function signup(event) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const name = String(values.get('full_name')).trim(); const phone = digits(values.get('phone')); const email = String(values.get('email')).trim(); const password = String(values.get('password')); const confirmation = String(values.get('password_confirmation'));
    if (name.split(/\s+/).length < 2) return renderSignup('Informe seu nome completo.');
    if (phone.length < 10 || phone.length > 13) return renderSignup('Informe um telefone válido com DDD.');
    if (password.length < 8) return renderSignup('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmation) return renderSignup('As senhas não coincidem.');
    setBusy(form, true, 'CRIANDO…');
    try {
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name, phone }, emailRedirectTo: `${location.origin}/` } });
      if (error) throw error;
      if (data.session) {
        session = data.session; await loadPrivateData();
        if (returnToCheckout) { returnToCheckout = false; window.closeDrawer(); window.resumeCheckoutAfterAuth?.(); }
        else renderDashboard('Conta criada com sucesso.', 'success');
      } else renderLogin('Conta criada. Verifique seu e-mail para confirmar o cadastro.', 'success');
    } catch (error) { renderSignup(explain(error)); }
    finally { setBusy(form, false); }
  }

  async function forgotPassword(event) {
    event.preventDefault(); const form = event.currentTarget; setBusy(form, true, 'ENVIANDO…');
    try {
      const email = String(new FormData(form).get('email')).trim();
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/redefinir-senha` });
      if (error) throw error;
      renderForgotPassword('Se houver uma conta com este e-mail, as instruções foram enviadas.', 'success');
    } catch (error) { renderForgotPassword(explain(error)); }
    finally { setBusy(form, false); }
  }

  async function logout() {
    const { error } = await db.auth.signOut({ scope: 'local' });
    if (error) return renderDashboard(explain(error), 'error');
    session = null; profile = null; addresses = []; authRevision++; updateHeader(); renderAuthHome('Você saiu da sua conta.', 'success');
  }

  function dashboardCards() {
    return `<div class="customer-dashboard-grid"><button type="button" data-account-view="orders"><span>📦</span><b>Meus Pedidos</b><small>Acompanhar compras</small></button><button type="button" data-account-view="addresses"><span>📍</span><b>Meus Endereços</b><small>Entrega mais rápida</small></button><button type="button" data-account-view="favorites"><span>❤️</span><b>Favoritos</b><small>Produtos que você salvou</small></button><button type="button" data-account-view="profile"><span>👤</span><b>Meus Dados</b><small>Nome e telefone</small></button><button class="is-logout" type="button" data-account-view="logout"><span>🚪</span><b>Sair</b><small>Encerrar sessão</small></button></div>`;
  }

  function bindDashboard() {
    document.querySelectorAll('[data-account-view]').forEach(button => button.onclick = () => {
      const view = button.dataset.accountView;
      if (view === 'orders') renderOrders(); else if (view === 'addresses') renderAddresses(); else if (view === 'favorites') renderFavorites(); else if (view === 'profile') renderProfile(); else logout();
    });
  }

  function renderDashboard(message = '', type = 'success') {
    if (!session) return renderAuthHome(message, type);
    authShell(`Olá, ${firstName(profile?.full_name)}`, `${dashboardCards()}<p class="customer-security-note">Seus dados e pedidos são privados e protegidos pela sua sessão.</p>`, message, type); bindDashboard();
  }

  function accountBackButton() { return '<button class="customer-back" type="button" data-account-back>← Minha Conta</button>'; }
  function bindBack() { document.querySelector('[data-account-back]')?.addEventListener('click', () => renderDashboard()); }

  async function renderOrders(message = '') {
    if (!session) return renderLogin('Entre para visualizar seus pedidos.');
    authShell('Meus Pedidos', `${accountBackButton()}${alertBox(message)}<div class="customer-loading">Carregando seus pedidos…</div>`); bindBack();
    const { data, error } = await db.from('orders').select('id,sequence_number,order_number,created_at,total,payment_method,payment_status,status,delivery_method,delivery_address,order_items(id,product_name,product_image_url,quantity,unit_price,line_total),order_events(id,title,description,created_at)').order('created_at', { ascending: false });
    if (error) { authShell('Meus Pedidos', `${accountBackButton()}${alertBox(explain(error))}<div class="customer-empty"><b>Não foi possível carregar seus pedidos.</b><p>Tente novamente em instantes.</p></div>`); bindBack(); return; }
    const container = document.querySelector('.customer-loading');
    if (!container) return;
    container.outerHTML = `<div class="customer-orders">${(data || []).map(order => `<article><div><small>${new Date(order.created_at).toLocaleDateString('pt-BR')}</small><h3>Pedido ${orderNumber(order)}</h3><span>${statusLabels[order.status] || order.status}</span></div><div><strong>${brl(order.total)}</strong><small>${order.payment_method === 'pix' ? 'PIX' : 'Cartão'} · ${paymentLabels[order.payment_status] || order.payment_status}</small><button type="button" data-order-id="${order.id}">VER PEDIDO</button></div></article>`).join('') || '<div class="customer-empty"><b>Você ainda não possui pedidos.</b><p>Quando finalizar uma compra, ela aparecerá aqui.</p></div>'}</div>`;
    document.querySelectorAll('[data-order-id]').forEach(button => button.onclick = () => renderOrderDetail((data || []).find(order => order.id === button.dataset.orderId)));
  }

  function renderOrderDetail(order) {
    if (!order) return renderOrders();
    const stages = order.delivery_method === 'pickup' ? ['received', 'payment_approved', 'preparing', 'ready_for_pickup', 'completed'] : ['received', 'payment_approved', 'preparing', 'out_for_delivery', 'completed'];
    const current = stages.indexOf(order.status); const stopped = ['cancelled', 'refunded'].includes(order.status);
    authShell(`Pedido ${orderNumber(order)}`, `${accountBackButton()}<div class="customer-order-summary"><span>${new Date(order.created_at).toLocaleString('pt-BR')}</span><strong>${brl(order.total)}</strong><b>${statusLabels[order.status] || order.status}</b></div><section class="customer-order-items"><h3>Produtos</h3>${(order.order_items || []).map(item => `<div><img src="${esc(item.product_image_url || 'assets/logo.png')}" alt=""><span><b>${esc(item.product_name)}</b><small>${item.quantity} × ${brl(item.unit_price)}</small></span><strong>${brl(item.line_total)}</strong></div>`).join('')}</section><section class="customer-order-timeline"><h3>Acompanhamento</h3>${stages.map((stage, index) => `<div class="${!stopped && index <= current ? 'is-done' : ''}"><i>${!stopped && index <= current ? '✓' : index + 1}</i><span>${statusLabels[stage]}</span></div>`).join('')}${stopped ? `<p class="customer-alert error">${statusLabels[order.status]}</p>` : ''}</section>`); bindBack();
  }

  function addressMarkup(address) {
    return `<article class="customer-address ${address.is_default ? 'is-default' : ''}"><div><small>${address.is_default ? 'ENDEREÇO PRINCIPAL' : esc(address.label)}</small><b>${esc(address.street)}, ${esc(address.number)}</b><span>${esc([address.complement, address.neighborhood].filter(Boolean).join(' · '))}<br>${esc(address.city)} - ${esc(address.state)} · CEP ${esc(address.postal_code.replace(/^(\d{5})(\d{3})$/, '$1-$2'))}</span></div><footer><button type="button" data-address-edit="${address.id}">Editar</button>${address.is_default ? '' : `<button type="button" data-address-default="${address.id}">Tornar principal</button>`}<button class="danger" type="button" data-address-delete="${address.id}">Excluir</button></footer></article>`;
  }

  function renderAddresses(message = '', type = 'success') {
    if (!session) return renderLogin('Entre para gerenciar seus endereços.');
    authShell('Meus Endereços', `${accountBackButton()}${alertBox(message, type)}<button class="customer-primary" type="button" data-address-new>+ ADICIONAR ENDEREÇO</button><div class="customer-addresses">${addresses.map(addressMarkup).join('') || '<div class="customer-empty"><b>Nenhum endereço salvo.</b><p>Adicione um endereço para agilizar o checkout.</p></div>'}</div>`); bindBack();
    document.querySelector('[data-address-new]').onclick = () => renderAddressForm();
    document.querySelectorAll('[data-address-edit]').forEach(button => button.onclick = () => renderAddressForm(addresses.find(address => address.id === button.dataset.addressEdit)));
    document.querySelectorAll('[data-address-default]').forEach(button => button.onclick = () => setDefaultAddress(button.dataset.addressDefault));
    document.querySelectorAll('[data-address-delete]').forEach(button => button.onclick = () => deleteAddress(button.dataset.addressDelete));
  }

  function renderAddressForm(address = null, message = '') {
    const value = (key, fallback = '') => esc(address?.[key] ?? fallback);
    authShell(address ? 'Editar endereço' : 'Novo endereço', `${accountBackButton()}${alertBox(message)}<form id="customerAddressForm" class="customer-form customer-address-form"><input type="hidden" name="id" value="${value('id')}"><label>Nome do endereço<input name="label" maxlength="60" value="${value('label', 'Meu endereço')}" required></label><div class="customer-form-columns"><label>CEP<input name="postal_code" inputmode="numeric" maxlength="9" value="${value('postal_code')}" required></label><label>Estado<input name="state" maxlength="2" value="${value('state')}" required></label></div><label>Rua<input name="street" autocomplete="address-line1" value="${value('street')}" required></label><div class="customer-form-columns"><label>Número<input name="number" value="${value('number')}" required></label><label>Complemento<input name="complement" value="${value('complement')}"></label></div><label>Bairro<input name="neighborhood" value="${value('neighborhood')}" required></label><label>Cidade<input name="city" value="${value('city')}" required></label><label class="customer-check"><input name="is_default" type="checkbox" ${address?.is_default || !addresses.length ? 'checked' : ''}> Definir como endereço principal</label><button type="submit">SALVAR ENDEREÇO</button></form>`); bindBack(); document.querySelector('#customerAddressForm').onsubmit = saveAddress;
  }

  function addressFromForm(form) {
    const values = Object.fromEntries(new FormData(form));
    return { label: String(values.label).trim(), postal_code: digits(values.postal_code), street: String(values.street).trim(), number: String(values.number).trim(), complement: String(values.complement || '').trim() || null, neighborhood: String(values.neighborhood).trim(), city: String(values.city).trim(), state: String(values.state).trim().toUpperCase(), is_default: form.elements.is_default.checked };
  }

  async function saveAddress(event) {
    event.preventDefault(); const form = event.currentTarget; const id = form.elements.id.value; const value = addressFromForm(form);
    if (value.postal_code.length !== 8) return renderAddressForm(id ? addresses.find(address => address.id === id) : null, 'Informe um CEP válido com 8 números.');
    if (value.state.length !== 2) return renderAddressForm(id ? addresses.find(address => address.id === id) : null, 'Informe a sigla do estado com 2 letras.');
    setBusy(form, true, 'SALVANDO…');
    const query = id ? db.from('customer_addresses').update(value).eq('id', id) : db.from('customer_addresses').insert({ ...value, customer_id: session.user.id });
    const { error } = await query;
    if (error) return renderAddressForm(id ? { ...addresses.find(address => address.id === id), ...value } : value, explain(error));
    await loadPrivateData(); renderAddresses('Endereço salvo.', 'success');
  }

  async function setDefaultAddress(id) {
    const { error } = await db.from('customer_addresses').update({ is_default: true }).eq('id', id);
    if (error) return renderAddresses(explain(error), 'error');
    await loadPrivateData(); renderAddresses('Endereço principal atualizado.', 'success');
  }

  async function deleteAddress(id) {
    const removed = addresses.find(address => address.id === id);
    const { error } = await db.from('customer_addresses').delete().eq('id', id);
    if (error) return renderAddresses(explain(error), 'error');
    await loadPrivateData();
    if (removed?.is_default && addresses.length) await setDefaultAddress(addresses[0].id);
    else renderAddresses('Endereço excluído.', 'success');
  }

  function renderProfile(message = '', type = 'success') {
    authShell('Meus Dados', `${accountBackButton()}${alertBox(message, type)}<form id="customerProfileForm" class="customer-form"><label>Nome completo<input name="full_name" autocomplete="name" value="${esc(profile?.full_name || '')}" required></label><label>WhatsApp / telefone<input name="phone" autocomplete="tel" inputmode="tel" value="${esc(profile?.phone || '')}" required></label><label>E-mail<input value="${esc(session?.user?.email || '')}" disabled><small>O e-mail de acesso não é alterado nesta tela.</small></label><button type="submit">SALVAR MEUS DADOS</button></form>`); bindBack(); document.querySelector('#customerProfileForm').onsubmit = saveProfile;
  }

  async function saveProfile(event) {
    event.preventDefault(); const form = event.currentTarget; const fullName = form.elements.full_name.value.trim(); const phone = digits(form.elements.phone.value);
    if (fullName.length < 3 || phone.length < 10) return renderProfile('Revise seu nome e telefone.', 'error');
    setBusy(form, true, 'SALVANDO…');
    const { error } = await db.from('customer_profiles').upsert({ id: session.user.id, full_name: fullName, phone }, { onConflict: 'id' });
    if (error) return renderProfile(explain(error), 'error');
    await db.auth.updateUser({ data: { full_name: fullName, phone } });
    profile = { ...profile, full_name: fullName, phone }; updateHeader(); renderProfile('Dados atualizados.', 'success');
  }

  async function syncFavoritesAfterLogin() {
    if (!session || favoritesSyncing || !window.StorefrontNavigation?.getAssistantData) return;
    favoritesSyncing = true;
    try {
      const catalog = window.StorefrontNavigation.getAssistantData().products || [];
      const local = new Set((window.StorefrontNavigation.getFavorites?.() || []).map(Number));
      const { data, error } = await db.from('customer_favorites').select('product_id');
      if (error) throw error;
      const remote = new Set((data || []).map(item => String(item.product_id)));
      catalog.forEach(product => { if (remote.has(String(product.dbId))) local.add(Number(product.id)); });
      window.StorefrontNavigation.setFavorites?.([...local]);
      const rows = catalog.filter(product => local.has(Number(product.id)) && product.dbId).map(product => ({ customer_id: session.user.id, product_id: product.dbId }));
      if (rows.length) { const result = await db.from('customer_favorites').upsert(rows, { onConflict: 'customer_id,product_id' }); if (result.error) throw result.error; }
    } catch (error) { console.warn('Não foi possível sincronizar os favoritos.', error); }
    finally { favoritesSyncing = false; }
  }

  async function replaceRemoteFavorites() {
    if (!session || favoritesSyncing) return;
    favoritesSyncing = true;
    try {
      const catalog = window.StorefrontNavigation.getAssistantData().products || [];
      const local = new Set((window.StorefrontNavigation.getFavorites?.() || []).map(Number));
      const wanted = new Set(catalog.filter(product => local.has(Number(product.id)) && product.dbId).map(product => String(product.dbId)));
      const { data, error } = await db.from('customer_favorites').select('product_id'); if (error) throw error;
      for (const item of data || []) if (!wanted.has(String(item.product_id))) { const removed = await db.from('customer_favorites').delete().eq('product_id', item.product_id); if (removed.error) throw removed.error; }
      const rows = [...wanted].map(productId => ({ customer_id: session.user.id, product_id: productId }));
      if (rows.length) { const saved = await db.from('customer_favorites').upsert(rows, { onConflict: 'customer_id,product_id' }); if (saved.error) throw saved.error; }
    } catch (error) { console.warn('Não foi possível atualizar os favoritos da conta.', error); }
    finally { favoritesSyncing = false; }
  }

  function renderFavorites() {
    const catalog = window.StorefrontNavigation?.getAssistantData?.().products || [];
    const ids = new Set((window.StorefrontNavigation?.getFavorites?.() || []).map(Number));
    const items = catalog.filter(product => ids.has(Number(product.id)));
    authShell('Meus Favoritos', `${accountBackButton()}<div class="customer-favorites">${items.map(product => `<article><img src="${esc(product.image)}" alt="${esc(product.name)}"><div><small>${esc(product.subcategory || product.environment)}</small><b>${esc(product.name)}</b><strong>${product.price == null ? 'Consulte o preço' : brl(product.price)}</strong><button type="button" data-favorite-product="${product.id}">VER PRODUTO</button></div></article>`).join('') || '<div class="customer-empty"><b>Nenhum favorito salvo.</b><p>Use o coração nos produtos para encontrá-los aqui.</p></div>'}</div>`); bindBack();
    document.querySelectorAll('[data-favorite-product]').forEach(button => button.onclick = () => { window.closeDrawer(); window.StorefrontNavigation.openProduct(Number(button.dataset.favoriteProduct)); });
  }

  function openAccount() { window.MobileNav?.mark('conta'); if (session) renderDashboard(); else renderAuthHome(); }
  function openAuth(mode = 'login', options = {}) { returnToCheckout = Boolean(options.returnToCheckout); if (mode === 'signup') renderSignup(); else renderLogin(); }

  function checkoutIdentity() {
    if (!session) return null;
    return { name: profile?.full_name || session.user.user_metadata?.full_name || '', email: session.user.email || '', phone: profile?.phone || session.user.user_metadata?.phone || '', address: addresses.find(address => address.is_default) || addresses[0] || null };
  }

  async function saveAddressFromCheckout(data) {
    if (!session || !data?.save_address) return;
    const value = { customer_id: session.user.id, label: 'Endereço de entrega', postal_code: digits(data.postal_code), street: data.street, number: data.number, complement: data.complement || null, neighborhood: data.neighborhood, city: data.city, state: String(data.state || '').toUpperCase(), is_default: !addresses.length };
    const { error } = await db.from('customer_addresses').insert(value); if (error) throw error; await loadPrivateData();
  }

  async function createOrder(payload) {
    const { data, error } = await db.rpc('create_customer_order', {
      checkout_token: payload.checkoutToken,
      checkout_items: payload.items,
      customer_data: payload.customer,
      delivery_data: payload.delivery,
      requested_payment: payload.payment
    });
    if (error) throw new Error(explain(error));
    return data;
  }

  window.CustomerAccount = Object.freeze({
    openAccount, openAuth, checkoutIdentity, getAddresses: () => addresses.map(address => ({ ...address })),
    isAuthenticated: () => Boolean(session), saveAddressFromCheckout, createOrder,
    refresh: loadPrivateData, explain
  });
  window.openAccount = openAccount;
  document.querySelector('#accountBtn').onclick = openAccount;
  window.addEventListener('atacarejo:favorites-changed', replaceRemoteFavorites);
  db.auth.onAuthStateChange((event, nextSession) => {
    session = nextSession;
    if (event === 'SIGNED_OUT') { profile = null; addresses = []; authRevision++; updateHeader(); }
    if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) setTimeout(() => loadPrivateData().catch(error => console.warn(error)), 0);
  });
  restore();
})();
