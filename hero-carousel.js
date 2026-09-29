(() => {
  'use strict';

  const root = document.querySelector('.hero-carousel');
  if (!root) return;

  const slideContainer = root.querySelector('.hero-slides');
  const previous = root.querySelector('.hero-prev');
  const next = root.querySelector('.hero-next');
  const dotGroup = root.querySelector('.hero-dots');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  const imageDuration = Math.max(50, Number(root.dataset.autoplayMs) || 6500);
  const defaultSlides = [...root.querySelectorAll('[data-hero-slide]')].map(slide => slide.cloneNode(true));
  let slides = [];
  let slideItems = [];
  let dots = [];
  let active = 0;
  let timer = 0;
  let pointerStart = null;
  let pausedByInteraction = false;
  let cmsSignature = '';
  const boundMedia = new WeakSet();

  function mediaUrl(value) {
    const source = String(value || '').trim();
    if (!source) return '';
    try {
      const parsed = new URL(source, location.href);
      return ['http:', 'https:', 'data:', 'blob:', 'file:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function itemKey(item) {
    if (!item) return '';
    return [item.type || 'image', item.desktopUrl || '', item.mobileUrl || '', item.internalTitle || ''].join('|');
  }

  function itemSignature(item) {
    return JSON.stringify([
      itemKey(item), item.posterUrl || '', item.alt || '', item.title || '', item.subtitle || '',
      item.buttonText || '', item.buttonUrl || '', item.link || '', item.linkLabel || ''
    ]);
  }

  function normalizeItem(item) {
    const type = item?.type === 'video' ? 'video' : 'image';
    const desktopUrl = mediaUrl(item?.desktopUrl);
    if (!desktopUrl) return null;
    return {
      ...item,
      type,
      desktopUrl,
      mobileUrl: mediaUrl(item?.mobileUrl) || desktopUrl,
      posterUrl: mediaUrl(item?.posterUrl)
    };
  }

  function keepHeroVisible() {
    root.closest('.hero')?.removeAttribute('hidden');
  }

  function refreshCollections() {
    slides = [...root.querySelectorAll('[data-hero-slide]')];
    dots = [...root.querySelectorAll('.hero-dots button')];
    slides.forEach(bindSlideMedia);
    const singleSlide = slides.length < 2;
    if (previous) previous.hidden = singleSlide;
    if (next) next.hidden = singleSlide;
    if (dotGroup) dotGroup.hidden = singleSlide;
  }

  function responsiveUrl(element) {
    return mobile.matches ? element.dataset.mobileSrc || element.dataset.desktopSrc : element.dataset.desktopSrc;
  }

  function syncImage(image) {
    if (!image?.dataset.desktopSrc) return;
    const source = mediaUrl(responsiveUrl(image));
    if (source && image.src !== source) image.src = source;
  }

  function syncVideo(video, forceLoad = false) {
    if (!video?.dataset.desktopSrc) return;
    const source = mediaUrl(responsiveUrl(video));
    if (!source || (!forceLoad && !video.src)) return;
    if (video.src !== source) {
      video.src = source;
      video.load();
    }
  }

  function preload(index) {
    const slide = slides[index];
    const image = slide?.querySelector('.hero-slide-image, img:not(.hero-video-fallback)');
    if (image) {
      syncImage(image);
      image.loading = 'eager';
    }
    const video = slide?.querySelector('video');
    if (video && !video.src) video.preload = 'metadata';
  }

  function clearTimer() {
    window.clearTimeout(timer);
    timer = 0;
  }

  function pauseVideos(except = null) {
    slides.forEach(slide => {
      const video = slide.querySelector('video');
      if (video && video !== except) {
        video.pause();
        if (video.currentTime) video.currentTime = 0;
      }
    });
  }

  function scheduleImageAdvance() {
    clearTimer();
    if (slides.length < 2 || document.hidden || pausedByInteraction) return;
    timer = window.setTimeout(() => show(active + 1), imageDuration);
  }

  function discardBrokenSlide(slide) {
    const brokenIndex = slides.indexOf(slide);
    if (brokenIndex < 0) return;
    slide.classList.add('is-media-error');

    if (slides.length === 1) {
      if (root.dataset.cmsBanner === 'true' && defaultSlides.length) restoreDefaults();
      else {
        slide.classList.add('is-active');
        slide.setAttribute('aria-hidden', 'false');
      }
      return;
    }

    const wasActive = brokenIndex === active;
    slideItems.splice(brokenIndex, 1);
    slide.remove();
    rebuildDots(slideItems);
    refreshCollections();
    if (brokenIndex < active) active -= 1;
    else if (wasActive && active >= slides.length) active = 0;
    show(active);
  }

  function bindSlideMedia(slide) {
    const image = slide.querySelector('.hero-slide-image, img:not(.hero-video-fallback)');
    if (image && !boundMedia.has(image)) {
      boundMedia.add(image);
      image.addEventListener('error', () => discardBrokenSlide(slide), { once: true });
      if (image.complete && image.src && image.naturalWidth === 0) queueMicrotask(() => discardBrokenSlide(slide));
    }
    const video = slide.querySelector('video');
    if (video && !boundMedia.has(video)) {
      boundMedia.add(video);
      video.addEventListener('ended', () => { if (slides[active] === slide) show(active + 1); });
      video.addEventListener('error', () => discardBrokenSlide(slide), { once: true });
    }
  }

  async function playActiveVideo(slide) {
    const video = slide.querySelector('video');
    if (!video || reducedMotion.matches || pausedByInteraction || document.hidden) {
      scheduleImageAdvance();
      return;
    }
    syncVideo(video, true);
    pauseVideos(video);
    slide.classList.remove('is-media-error');
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      // Bloqueio de autoplay não significa mídia quebrada. Mantém o poster e
      // segue o mesmo tempo de exibição de uma imagem.
      scheduleImageAdvance();
    }
  }

  function startActiveMedia() {
    clearTimer();
    const slide = slides[active];
    if (!slide) return;
    const video = slide.querySelector('video');
    if (video && !slide.classList.contains('is-media-error')) playActiveVideo(slide);
    else scheduleImageAdvance();
  }

  function show(index) {
    if (!slides.length) return;
    keepHeroVisible();
    clearTimer();
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const selected = slideIndex === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
      if (!selected) slide.querySelector('video')?.pause();
    });
    dots.forEach((dot, dotIndex) => {
      const selected = dotIndex === active;
      dot.classList.toggle('is-active', selected);
      if (selected) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    preload((active + 1) % slides.length);
    root.dispatchEvent(new CustomEvent('atacarejo:hero-slide-change', { detail: slideItems[active] || null }));
    startActiveMedia();
  }

  function stop() {
    clearTimer();
    slides[active]?.querySelector('video')?.pause();
  }

  function restart() {
    stop();
    startActiveMedia();
  }

  function buildSlide(item, index) {
    const slide = document.createElement('figure');
    slide.className = 'hero-slide';
    slide.dataset.heroSlide = '';
    slide.dataset.mediaType = item.type === 'video' ? 'video' : 'image';
    slide.setAttribute('aria-hidden', 'true');
    if (item.type === 'video') {
      const fallback = document.createElement('img');
      fallback.className = 'hero-video-fallback';
      fallback.alt = item.alt || '';
      fallback.src = item.posterUrl || item.desktopUrl || '';
      fallback.loading = index === 0 ? 'eager' : 'lazy';
      const video = document.createElement('video');
      video.className = 'hero-slide-video';
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.controls = false;
      video.preload = index === 0 ? 'metadata' : 'none';
      video.poster = item.posterUrl || '';
      video.dataset.desktopSrc = item.desktopUrl || '';
      video.dataset.mobileSrc = item.mobileUrl || item.desktopUrl || '';
      slide.append(fallback, video);
    } else {
      const image = document.createElement('img');
      image.className = 'hero-slide-image';
      image.alt = item.alt || '';
      image.width = 1600;
      image.height = 1100;
      image.loading = index === 0 ? 'eager' : 'lazy';
      if (index === 0) image.fetchPriority = 'high';
      image.dataset.desktopSrc = item.desktopUrl || '';
      image.dataset.mobileSrc = item.mobileUrl || item.desktopUrl || '';
      image.src = mobile.matches ? image.dataset.mobileSrc : image.dataset.desktopSrc;
      slide.append(image);
    }
    if (item.link) {
      const link = document.createElement('a');
      link.className = 'hero-slide-link';
      link.href = item.link;
      link.setAttribute('aria-label', item.linkLabel || `Abrir slide ${index + 1}`);
      slide.append(link);
    }
    return slide;
  }

  function rebuildDots(items) {
    if (!dotGroup) return;
    dotGroup.replaceChildren(...items.map((item, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Mostrar ${item.internalTitle || `slide ${index + 1}`}`);
      dot.addEventListener('click', () => show(index));
      return dot;
    }));
  }

  function restoreDefaults() {
    stop();
    slideContainer.replaceChildren(...defaultSlides.map(slide => slide.cloneNode(true)));
    const items = defaultSlides.map((slide, index) => ({ internalTitle: slide.querySelector('figcaption strong')?.textContent || `slide ${index + 1}` }));
    slideItems = items;
    rebuildDots(items);
    root.dataset.cmsBanner = 'false';
    cmsSignature = '';
    active = 0;
    refreshCollections();
    show(0);
  }

  function setSlides(items) {
    const valid = (items || []).map(normalizeItem).filter(Boolean);
    if (!valid.length) {
      keepHeroVisible();
      return null;
    }
    const signature = valid.map(itemSignature).join('\n');
    if (root.dataset.cmsBanner === 'true' && signature === cmsSignature) {
      slideItems = valid;
      keepHeroVisible();
      return slideItems[active] || null;
    }
    const previousKey = itemKey(slideItems[active]);
    const preservedIndex = valid.findIndex(item => itemKey(item) === previousKey);
    const nextActive = preservedIndex >= 0 ? preservedIndex : Math.min(active, valid.length - 1);
    stop();
    slideItems = valid;
    slideContainer.replaceChildren(...valid.map(buildSlide));
    rebuildDots(valid);
    root.dataset.cmsBanner = 'true';
    cmsSignature = signature;
    active = nextActive;
    refreshCollections();
    show(active);
    return slideItems[active] || null;
  }

  previous?.addEventListener('click', () => show(active - 1));
  next?.addEventListener('click', () => show(active + 1));

  root.addEventListener('pointerdown', event => {
    if (!mobile.matches || event.pointerType === 'mouse') return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  root.addEventListener('pointerup', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) show(active + (deltaX < 0 ? 1 : -1));
  });
  root.addEventListener('pointercancel', () => { pointerStart = null; });
  root.addEventListener('mouseenter', () => { pausedByInteraction = true; stop(); });
  root.addEventListener('mouseleave', () => { pausedByInteraction = false; restart(); });
  root.addEventListener('focusin', () => { pausedByInteraction = true; stop(); });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) { pausedByInteraction = false; restart(); } });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : restart());
  reducedMotion.addEventListener?.('change', restart);
  mobile.addEventListener?.('change', () => {
    slides.forEach(slide => {
      syncImage(slide.querySelector('.hero-slide-image'));
      const video = slide.querySelector('video');
      if (video?.src) syncVideo(video, true);
    });
    restart();
  });

  window.atacarejoHero = {
    show,
    setSlides,
    // Uma resposta vazia do CMS pode ser transitória. Nunca substitui mídia
    // já renderizada; os slides padrão continuam sendo a reserva do boot.
    setCmsMode() { keepHeroVisible(); },
    setPrimaryImage(desktopUrl, mobileUrl = desktopUrl) {
      setSlides([{ type: 'image', desktopUrl, mobileUrl, internalTitle: 'Hero principal' }]);
    }
  };

  refreshCollections();
  slideItems = defaultSlides.map((slide, index) => ({ internalTitle: slide.querySelector('figcaption strong')?.textContent || `slide ${index + 1}` }));
  rebuildDots(slideItems);
  refreshCollections();
  keepHeroVisible();
  show(0);
})();
