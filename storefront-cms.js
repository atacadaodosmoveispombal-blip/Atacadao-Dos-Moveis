(() => {
  'use strict';

  const url = 'https://ejcmuygnfrmytdqlyhjr.supabase.co';
  const key = 'sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
  if (!window.supabase?.createClient) return;
  const cms = window.supabase.createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const imageFallback = 'assets/logo.png';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let deepLinkOpened = false;
  let bootTimer;

  function campaignMeta(banner, prefix) {
    const entry = (banner?.display_locations || []).find(item => String(item).startsWith(`${prefix}:`));
    if (entry) return entry.slice(prefix.length + 1);
    const parameter = ({ preset: 'campaign_template', layout: 'campaign_layout', style: 'campaign_style', theme: 'campaign_theme', image: 'campaign_image', rule: 'campaign_rule', duration: 'campaign_duration', end: 'campaign_end', countdown: 'campaign_countdown' })[prefix];
    if (!parameter || !banner?.button_url) return '';
    try { return new URL(banner.button_url, location.href).searchParams.get(parameter) || ''; }
    catch { return ''; }
  }
  function applyCampaignLook(element, banner) {
    if (!element || !banner) return;
    const preset = campaignMeta(banner, 'preset');
    const style = campaignMeta(banner, 'style');
    const theme = campaignMeta(banner, 'theme');
    const layout = campaignMeta(banner, 'layout');
    if (preset) element.dataset.campaignPreset = preset;
    if (style) element.dataset.campaignStyle = style;
    if (theme) element.dataset.campaignTheme = theme;
    if (layout) element.dataset.campaignLayout = layout;
    element.classList.toggle('campaign-countdown', campaignMeta(banner, 'countdown') === 'true');
  }

  function storefrontProductImage(product) {
    const images = [...(product?.product_images || [])].sort((a, b) => Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
    return images[0]?.image_url || '';
  }
  function campaignVisualProducts(banner, productRows, promotions) {
    const promotion = promotions.find(item => item.id === banner?.promotion_id);
    const linked = new Set((promotion?.promotion_products || []).map(item => String(item.product_id)));
    let rows = productRows.filter(item => linked.has(String(item.id)));
    if (!rows.length && banner?.category_id) rows = productRows.filter(item => String(item.category_id) === String(banner.category_id));
    if (!rows.length) rows = productRows;
    return rows.map(storefrontProductImage).filter(Boolean).filter((url, index, list) => list.indexOf(url) === index).slice(0, 3);
  }
  function renderCampaignDecor(container, banner, productRows, promotions) {
    container?.querySelectorAll(':scope > .cms-banner-catalog,:scope > .cms-campaign-badge').forEach(item => item.remove());
    if (!container || !banner) return;
    const preset = campaignMeta(banner, 'preset');
    const layout = campaignMeta(banner, 'layout');
    const badge = ({ month: 'OFERTAS DO MÊS', liquidation: 'ATÉ 50% OFF', flash: '⚡ ÚLTIMAS HORAS', weekend: 'SEX • SÁB • DOM', stock_clearance: 'ÚLTIMAS UNIDADES', black_friday: 'ATÉ 70% OFF' })[preset];
    if (badge) container.insertAdjacentHTML('beforeend', `<span class="cms-campaign-badge">${escapeHtml(badge)}</span>`);
    if (layout !== 'catalog-offer') return;
    const images = campaignVisualProducts(banner, productRows, promotions);
    if (images.length < 2) return;
    container.insertAdjacentHTML('beforeend', `<div class="cms-banner-catalog">${images.map((url, index) => `<span><img src="${escapeHtml(url)}" alt="" loading="lazy"><i>${index === 0 ? 'DESTAQUE' : index === 1 ? 'OFERTA' : 'IMPERDÍVEL'}</i></span>`).join('')}</div>`);
  }

  function sessionKey() {
    let value = sessionStorage.getItem('storefront-session');
    if (!value) { value = crypto.randomUUID(); sessionStorage.setItem('storefront-session', value); }
    return value;
  }
  function setMeta(name, value, property = false) {
    if (!value) return;
    let element = document.head.querySelector(`meta[${property ? 'property' : 'name'}="${name}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute(property ? 'property' : 'name', name); document.head.append(element); }
    element.content = value;
  }
  function applySettings(settings) {
    if (!settings) return;
    if (settings.default_meta_title) document.title = settings.default_meta_title;
    setMeta('description', settings.default_meta_description);
    setMeta('og:title', settings.default_meta_title, true);
    setMeta('og:description', settings.default_meta_description, true);
    setMeta('og:image', settings.default_og_image_url, true);
    if (settings.primary_color) document.documentElement.style.setProperty('--blue', settings.primary_color);
    if (settings.accent_color) document.documentElement.style.setProperty('--yellow', settings.accent_color);
    if (settings.logo_url) document.querySelectorAll('.brand img,.footer-brand img').forEach(img => { img.src = settings.logo_url; });
    if (settings.favicon_url) document.querySelector('link[rel="icon"]')?.setAttribute('href', settings.favicon_url);
    if (settings.instagram) {
      document.querySelectorAll('.instagram').forEach(link => { link.textContent = settings.instagram; });
      const footerInstagram = document.querySelector('[data-footer-instagram]');
      if (footerInstagram) footerInstagram.href = /^https?:\/\//i.test(settings.instagram) ? settings.instagram : `https://www.instagram.com/${String(settings.instagram).replace(/^@/, '')}`;
    }
    if (settings.facebook) {
      const facebook = document.querySelector('.social-facebook');
      if (facebook) facebook.href = settings.facebook;
    }
    if (settings.map_url) document.querySelectorAll('.maps-button').forEach(link => { link.href = settings.map_url; });
    const address = document.querySelector('.footer-store address');
    if (address && (settings.address || settings.city || settings.state || settings.postal_code)) {
      address.innerHTML = [settings.address, [settings.city, settings.state].filter(Boolean).join(' - '), settings.postal_code ? `CEP ${settings.postal_code}` : ''].filter(Boolean).map(escapeHtml).join('<br>');
    }
    if (settings.footer_text) {
      const footer = document.querySelector('.footer-copyright');
      if (footer) footer.textContent = settings.footer_text;
    }
    if (settings.whatsapp) {
      const number = String(settings.whatsapp).replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(settings.whatsapp_message || 'Olá! Gostaria de conhecer os produtos.')}`;
      window.openWhatsApp = () => window.open(whatsappUrl, '_blank', 'noopener');
      document.querySelectorAll('a[href*="wa.me"]').forEach(link => { link.href = whatsappUrl; });
      const phone = document.querySelector('.whatsapp-button strong');
      if (phone) phone.textContent = settings.phone || settings.whatsapp;
    }
  }
  function applyHero(banner, productRows = [], promotions = []) {
    if (!banner) return;
    const hero = document.querySelector('.hero');
    const title = hero?.querySelector('h1');
    const subtitle = hero?.querySelector('.hero-copy>p:not(.eyebrow)');
    const button = hero?.querySelector('.hero-copy .btn');
    const art = hero?.querySelector('.hero-art');
    applyCampaignLook(hero, banner);
    renderCampaignDecor(hero, banner, productRows, promotions);
    if (title && banner.title) title.textContent = banner.title;
    if (subtitle && banner.subtitle) subtitle.textContent = banner.subtitle;
    if (button && banner.button_text) button.firstChild.textContent = `${banner.button_text} `;
    if (button && banner.button_url) button.onclick = () => { location.href = banner.button_url; };
    if (art && banner.image_desktop_url) {
      const cleanHeroUrl = value => /editorial-room\.jpg/i.test(value) ? 'assets/editorial-room-clean.png' : value;
      const desktopUrl = cleanHeroUrl(banner.image_desktop_url);
      const mobileUrl = banner.image_mobile_url ? cleanHeroUrl(banner.image_mobile_url) : desktopUrl;
      if (window.atacarejoHero?.setPrimaryImage) {
        window.atacarejoHero.setPrimaryImage(desktopUrl, mobileUrl);
      } else {
        art.style.backgroundImage = `url("${desktopUrl.replace(/"/g, '%22')}")`;
      }
      if (banner.image_mobile_url) {
        art.style.setProperty('--mobile-hero', `url("${mobileUrl.replace(/"/g, '%22')}")`);
      }
    }
  }
  function applySecondaryBanners(banners, productRows = [], promotions = []) {
    const slots = [...document.querySelectorAll('.banner-strip .promo')];
    const secondary = banners.filter(item => item.position !== 'home_hero');
    slots.forEach((slot, index) => {
      const banner = secondary[index];
      if (!banner) return;
      applyCampaignLook(slot, banner);
      renderCampaignDecor(slot, banner, productRows, promotions);
      const title = slot.querySelector('strong');
      const subtitle = slot.querySelector('small');
      const button = slot.querySelector('button');
      if (title && banner.title) title.textContent = banner.title;
      if (subtitle && banner.subtitle) subtitle.textContent = banner.subtitle;
      if (banner.image_desktop_url) slot.style.backgroundImage = `url("${banner.image_desktop_url.replace(/"/g, '%22')}")`;
      if (button && banner.button_text) button.textContent = `${banner.button_text} →`;
      if (button && banner.button_url) button.onclick = () => { location.href = banner.button_url; };
    });
  }
  function campaignPromotionFor(row, promotions) {
    return promotions.filter(promotion => {
      const linked = (promotion.promotion_products || []).some(item => item.product_id === row.id);
      const automatic = promotion.auto_include_category && promotion.category_id && promotion.category_id === row.category_id;
      return linked || automatic;
    });
  }
  function campaignPrice(row, promotions) {
    const regular = Number(row.price || 0);
    const native = row.promotional_price == null ? regular : Number(row.promotional_price);
    const prices = promotions.map(promotion => {
      const value = Number(promotion.discount_value || 0);
      if (promotion.promotion_type === 'percentage') return Math.max(0, regular * (1 - value / 100));
      if (promotion.promotion_type === 'fixed') return Math.max(0, regular - value);
      return native;
    });
    return Math.min(native, ...prices.filter(Number.isFinite));
  }
  function renderCampaignSections(banners, productRows, promotions) {
    document.querySelectorAll('.cms-campaign-section').forEach(section => section.remove());
    const main = document.querySelector('main');
    if (!main) return;
    let insertionPoint = document.querySelector('.banner-strip') || document.querySelector('#catalogo') || main.lastElementChild;
    banners.filter(banner => ['banner_products', 'products'].includes(banner.content_mode)).forEach(banner => {
      const promotion = promotions.find(item => item.id === banner.promotion_id);
      let selected = productRows.filter(product => promotion && (promotion.promotion_products || []).some(item => item.product_id === product.id));
      if ((banner.auto_include_category || promotion?.auto_include_category) && banner.category_id) selected = productRows.filter(product => product.category_id === banner.category_id);
      if (!selected.length) return;
      const section = document.createElement('section');
      section.className = 'section cms-campaign-section';
      section.dataset.cmsOrder = Number(banner.sort_order || 45) + 0.1;
      section.innerHTML = `<div class="section-head"><div><p class="eyebrow">CAMPANHA ESPECIAL</p><h2>${escapeHtml(banner.title)}</h2><p>${escapeHtml(banner.subtitle || 'Confira os produtos selecionados para esta campanha.')}</p></div></div><div class="cms-campaign-products">${selected.slice(0, 8).map(product => { const mapped = mapProduct(product, 0, campaignPromotionFor(product, promotions)); return `<button type="button" onclick="openProduct(${mapped.id})"><img src="${escapeHtml(mapped.img)}" alt="${escapeHtml(mapped.n)}" loading="lazy"><span><small>${escapeHtml(mapped.cat)}</small><b>${escapeHtml(mapped.n)}</b><em>${mapped.old ? `<del>${mapped.old.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</del>` : ''}${mapped.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</em></span></button>`; }).join('')}</div>${banner.button_text ? `<a class="btn cms-campaign-link" href="${escapeHtml(banner.button_url || '#catalogo')}">${escapeHtml(banner.button_text)} →</a>` : ''}`;
      if (insertionPoint?.parentNode) insertionPoint.after(section); else main.append(section);
      insertionPoint = section;
    });
  }
  function renderInspirations(rows) {
    let section = document.querySelector('#inspiracoes');
    if (!rows.length) { section?.remove(); return; }
    if (!section) {
      section = document.createElement('section');
      section.id = 'inspiracoes';
      section.className = 'section inspirations-cms';
      document.querySelector('main')?.append(section);
    }
    section.innerHTML = `<div class="section-head"><div><p class="eyebrow">IDEIAS PARA A SUA CASA</p><h2>Inspire-se com nossos <em>ambientes</em></h2><p>Conteúdos publicados diretamente pelo painel administrativo.</p></div></div><div class="inspiration-grid">${rows.map(item => {
      const images = [...(item.inspiration_images || [])].sort((a, b) => a.sort_order - b.sort_order);
      const cover = item.cover_image || images[0]?.image_url || imageFallback;
      return `<article class="inspiration-card"><img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="lazy" width="800" height="560"><div><small>${escapeHtml(item.environments?.name || 'Inspiração')}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || '')}</p></div></article>`;
    }).join('')}</div>`;
  }
  function applySections(sections) {
    const map = {
      environments: document.querySelector('#categorias'), promotions: document.querySelector('#ofertas'),
      best_sellers: document.querySelector('#mais-vendidos'), featured_products: document.querySelector('#catalogo'),
      hero: document.querySelector('.hero'), office: document.querySelector('#escritorio'),
      inspirations: document.querySelector('#inspiracoes'), benefits: document.querySelector('.reference-benefits'),
      ambient: document.querySelector('.ambient-promo'), promo_banners: document.querySelector('.banner-strip')
    };
    const placeholderTitles = new Set(['Hero','Ambientes','Produtos em destaque','Promoções','Mais vendidos','Lançamentos','Inspirações','Institucional']);
    sections.forEach(section => {
      const element = map[section.section_key];
      if (!element) return;
      element.hidden = !section.active;
      const title = element.querySelector('h2');
      const subtitle = element.querySelector('.section-head>div>p:not(.eyebrow):last-child');
      if (title && section.title && !placeholderTitles.has(section.title)) title.textContent = section.title;
      if (subtitle && section.subtitle) subtitle.textContent = section.subtitle;
      element.dataset.cmsOrder = section.sort_order;
    });
    const main = document.querySelector('main');
    if (!main) return;
    const defaults = { hero: 10, environments: 20, office: 25, featured_products: 30, promotions: 40, promo_banners: 45, best_sellers: 50, benefits: 55, ambient: 60, inspirations: 70 };
    const configured = new Map(sections.map(section => [section.section_key, Number(section.sort_order)]));
    Object.entries(map).filter(([, element]) => element).sort(([a], [b]) => (configured.get(a) ?? defaults[a] ?? 999) - (configured.get(b) ?? defaults[b] ?? 999)).forEach(([, element]) => main.append(element));
  }
  function stableProductId(uuid) {
    let hash = 2166136261;
    for (const char of String(uuid)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return 100000 + (hash >>> 0);
  }
  function mapProduct(row, index, campaignPromotions = []) {
    const orderedImages = [...(row.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
    const sellingPrice = campaignPromotions.length ? campaignPrice(row, campaignPromotions) : Number(row.promotional_price ?? row.price);
    const regularPrice = Number(row.price);
    const discount = sellingPrice < regularPrice ? Math.round((1 - sellingPrice / regularPrice) * 100) : 0;
    return {
      id: stableProductId(row.id), dbId: row.id, n: row.name, cat: row.categories?.name || row.environments?.name || 'Móveis',
      price: sellingPrice, old: sellingPrice < regularPrice ? regularPrice : null, discount,
      img: orderedImages[0]?.image_url || row.og_image_url || imageFallback,
      images: orderedImages.slice(1).map(image => image.image_url), best: row.best_seller ? 1 : 0,
      badge: campaignPromotions.length && sellingPrice < regularPrice ? 'Campanha' : row.new_arrival ? 'Novidade' : row.on_sale ? 'Oferta' : row.featured ? 'Destaque' : '',
      description: row.short_description || row.description || '', installmentCount: row.installment_enabled ? row.max_installments : null,
      installmentValue: row.installment_enabled ? sellingPrice / row.max_installments : null, sku: row.sku,
      stock: row.stock_quantity
    };
  }
  async function loadStorefrontCategories() {
    const extended = await cms.from('categories').select('name,slug,image_url,sort_order,show_on_homepage,show_in_menu').eq('active', true).order('sort_order');
    if (!extended.error) return extended;
    if (extended.error.code !== '42703' && !/show_on_homepage|show_in_menu/i.test(extended.error.message || '')) return extended;
    const legacy = await cms.from('categories').select('name,slug,image_url,sort_order').eq('active', true).order('sort_order');
    if (legacy.data) legacy.data = legacy.data.map(item => ({ ...item, show_on_homepage: true, show_in_menu: true }));
    return legacy;
  }
  async function boot() {
    const now = new Date().toISOString();
    const [productResult, categoryResult, environmentResult, bannerResult, promotionResult, sectionResult, settingResult, inspirationResult] = await Promise.all([
      cms.from('products').select('*,categories(name),environments(name),product_images(image_url,is_cover,sort_order)').eq('active', true).is('deleted_at', null).order('sort_order').order('created_at', { ascending: false }),
      loadStorefrontCategories(),
      cms.from('environments').select('name,image_url,sort_order').eq('active', true).order('sort_order'),
      cms.from('banners').select('*').eq('active', true).or(`start_at.is.null,start_at.lte.${now}`).or(`end_at.is.null,end_at.gt.${now}`).order('sort_order'),
      cms.from('promotions').select('*,promotion_products(product_id)').eq('active', true).or(`start_at.is.null,start_at.lte.${now}`).or(`end_at.is.null,end_at.gt.${now}`),
      cms.from('site_sections').select('*').order('sort_order'),
      cms.from('store_settings').select('*').eq('id', true).maybeSingle(),
      cms.from('inspirations').select('*,environments(name),inspiration_images(image_url,sort_order)').eq('active', true).order('sort_order')
    ]);
    const failed = [productResult, categoryResult, environmentResult, bannerResult, promotionResult, sectionResult, settingResult, inspirationResult].find(result => result.error);
    if (failed) throw failed.error;
    applySettings(settingResult.data);
    applyHero((bannerResult.data || []).find(item => item.position === 'home_hero'), productResult.data || [], promotionResult.data || []);
    applySecondaryBanners(bannerResult.data || [], productResult.data || [], promotionResult.data || []);
    renderInspirations(inspirationResult.data || []);
    if (categoryResult.data?.length) {
      const categories = categoryResult.data;
      cats.splice(0, cats.length, ...categories.map(item => [item.name, item.image_url || imageFallback]));
      const homepageCategories = categories.filter(item => item.show_on_homepage !== false);
      environmentCats.splice(0, environmentCats.length, ...homepageCategories.map(item => ({ label: item.name, category: item.name, img: item.image_url || imageFallback })));
      if (typeof categoryMenuItems !== 'undefined' && typeof renderCategoryMenu === 'function') {
        categoryMenuItems.splice(0, categoryMenuItems.length, ...categories.filter(item => item.show_in_menu !== false).map(item => [item.name, item.name]));
        renderCategoryMenu();
      }
      renderCats();
    } else if (environmentResult.data?.length) {
      environmentCats.splice(0, environmentCats.length, ...environmentResult.data.map(item => ({ label: item.name, category: item.name, img: item.image_url || imageFallback })));
      renderCats();
    }
    const campaignPromotions = promotionResult.data || [];
    if (productResult.data?.length) {
      products.splice(0, products.length, ...productResult.data.map((row, index) => mapProduct(row, index, campaignPromotionFor(row, campaignPromotions))));
      cart = cart.filter(item => products.some(product => product.id === item.id));
      favs = favs.filter(id => products.some(product => product.id === id));
      save();
      render();
    }
    applySections(sectionResult.data || []);
    renderCampaignSections(bannerResult.data || [], productResult.data || [], campaignPromotions);
    const requestedParams = new URLSearchParams(location.search);
    const requestedCategory = requestedParams.get('category');
    if (requestedCategory) {
      const category = (categoryResult.data || []).find(item => item.slug === requestedCategory);
      if (category) {
        requestAnimationFrame(() => {
          const categoryButton = [...document.querySelectorAll('#filterPills .pill')]
            .find(button => button.textContent.trim() === category.name);
          categoryButton?.click();
        });
      }
    }
    const requestedProduct = requestedParams.get('product');
    if (requestedProduct && !deepLinkOpened) {
      const product = products.find(item => item.dbId === requestedProduct);
      if (product) { deepLinkOpened = true; requestAnimationFrame(() => openProduct(product.id)); }
    }
  }

  const originalOpenProduct = window.openProduct;
  window.openProduct = id => {
    const product = products.find(item => item.id === id);
    if (product?.dbId) cms.rpc('register_product_view', { target_product_id: product.dbId, visitor_session: sessionKey(), view_source: 'site' }).then(() => {});
    return originalOpenProduct(id);
  };
  function scheduleBoot() {
    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => boot().catch(error => console.warn('Não foi possível sincronizar o CMS.', error)), 180);
  }
  const sync = 'BroadcastChannel' in window ? new BroadcastChannel('atacarejo-cms') : null;
  sync?.addEventListener('message', scheduleBoot);
  window.addEventListener('storage', event => { if (event.key === 'atacarejo-cms-sync') scheduleBoot(); });
  const realtime = cms.channel('storefront-cms');
  ['products','product_images','categories','environments','banners','promotions','promotion_products','site_sections','store_settings','inspirations','inspiration_images'].forEach(table => {
    realtime.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleBoot);
  });
  realtime.subscribe();
  boot().catch(error => console.warn('CMS indisponível; exibindo conteúdo de reserva.', error));
})();
