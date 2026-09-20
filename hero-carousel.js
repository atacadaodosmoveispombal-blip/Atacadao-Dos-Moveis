(() => {
  'use strict';

  const root = document.querySelector('.hero-carousel');
  if (!root) return;

  const slides = [...root.querySelectorAll('[data-hero-slide]')];
  const dots = [...root.querySelectorAll('.hero-dots button')];
  const previous = root.querySelector('.hero-prev');
  const next = root.querySelector('.hero-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  let active = 0;
  let timer = 0;
  let pointerStart = null;

  function preload(index) {
    const image = slides[index]?.querySelector('img');
    if (image && !image.complete) image.loading = 'eager';
  }

  function show(index, userInitiated = false) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const selected = slideIndex === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
    });
    dots.forEach((dot, dotIndex) => {
      const selected = dotIndex === active;
      dot.classList.toggle('is-active', selected);
      if (selected) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    preload((active + 1) % slides.length);
    if (userInitiated) restart();
  }

  function stop() {
    window.clearInterval(timer);
    timer = 0;
  }

  function start() {
    stop();
    if (reducedMotion.matches || document.hidden) return;
    timer = window.setInterval(() => show(active + 1), 6500);
  }

  function restart() {
    stop();
    start();
  }

  previous?.addEventListener('click', () => show(active - 1, true));
  next?.addEventListener('click', () => show(active + 1, true));
  dots.forEach((dot, index) => dot.addEventListener('click', () => show(index, true)));

  root.addEventListener('pointerdown', event => {
    if (!mobile.matches || event.pointerType === 'mouse') return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  root.addEventListener('pointerup', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) show(active + (deltaX < 0 ? 1 : -1), true);
  });
  root.addEventListener('pointercancel', () => { pointerStart = null; });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) start(); });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reducedMotion.addEventListener?.('change', start);

  window.atacarejoHero = {
    show,
    setPrimaryImage(desktopUrl, mobileUrl = desktopUrl) {
      const image = slides[0]?.querySelector('img');
      if (!image || !desktopUrl) return;
      image.src = mobile.matches ? mobileUrl : desktopUrl;
      image.dataset.desktopSrc = desktopUrl;
      image.dataset.mobileSrc = mobileUrl;
    }
  };
  mobile.addEventListener?.('change', event => {
    const image = slides[0]?.querySelector('img');
    if (image?.dataset.desktopSrc) image.src = event.matches ? image.dataset.mobileSrc : image.dataset.desktopSrc;
  });

  show(0);
  start();
})();
