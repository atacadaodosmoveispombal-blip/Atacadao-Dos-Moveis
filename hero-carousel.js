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
  const imageDuration = 6500;
  const defaultSlides = [...root.querySelectorAll('[data-hero-slide]')].map(slide => slide.cloneNode(true));
  let slides = [];
  let slideItems = [];
  let dots = [];
  let active = 0;
  let timer = 0;
  let pointerStart = null;
  let pausedByInteraction = false;

  function refreshCollections() {
    slides = [...root.querySelectorAll('[data-hero-slide]')];
    dots = [...root.querySelectorAll('.hero-dots button')];
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
    const source = responsiveUrl(image);
    if (source && image.src !== new URL(source, location.href).href) image.src = source;
  }

  function syncVideo(video, forceLoad = false) {
    if (!video?.dataset.desktopSrc) return;
    const source = responsiveUrl(video);
    if (!source || (!forceLoad && !video.src)) return;
    const absolute = new URL(source, location.href).href;
    if (video.src !== absolute) {
      video.src = source;
      video.load();
    }
  }

  function preload(index) {
    const slide = slides[index];
    const image = slide?.querySelector('.hero-slide-image');
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
    if (slides.length < 2 || reducedMotion.matches || document.hidden || pausedByInteraction) return;
    timer = window.setTimeout(() => show(active + 1), imageDuration);
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
      slide.classList.add('is-media-error');
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
      video.addEventListener('ended', () => { if (slides[active] === slide) show(active + 1); });
      video.addEventListener('error', () => {
        slide.classList.add('is-media-error');
        if (slides[active] === slide) scheduleImageAdvance();
      });
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
    active = 0;
    refreshCollections();
    show(0);
  }

  function setSlides(items) {
    const valid = (items || []).filter(item => item?.desktopUrl);
    if (!valid.length) { restoreDefaults(); return; }
    stop();
    slideItems = valid;
    slideContainer.replaceChildren(...valid.map(buildSlide));
    rebuildDots(valid);
    root.dataset.cmsBanner = 'true';
    active = 0;
    refreshCollections();
    show(0);
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
    setCmsMode(enabled) { if (!enabled) restoreDefaults(); },
    setPrimaryImage(desktopUrl, mobileUrl = desktopUrl) {
      setSlides([{ type: 'image', desktopUrl, mobileUrl, internalTitle: 'Hero principal' }]);
    }
  };

  refreshCollections();
  slideItems = defaultSlides.map((slide, index) => ({ internalTitle: slide.querySelector('figcaption strong')?.textContent || `slide ${index + 1}` }));
  rebuildDots(slideItems);
  refreshCollections();
  show(0);
})();
