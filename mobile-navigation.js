/* Mobile bottom navigation: URL state, touch feedback and drawer restoration. */
(() => {
  const paths = Object.freeze({
    inicio: '/',
    ofertas: '/ofertas',
    categorias: '/categorias',
    sacola: '/sacola',
    conta: '/conta'
  });
  const nav = document.querySelector('.mobile-nav');
  if (!nav) return;

  const buttons = [...nav.querySelectorAll('[data-mobile-route]')];
  let lastPath = location.pathname;

  function visible() {
    return getComputedStyle(nav).display !== 'none';
  }

  function fromLocation() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    return Object.keys(paths).find(section => paths[section] === path) || 'inicio';
  }

  function setActive(section = fromLocation()) {
    buttons.forEach(button => {
      const selected = button.dataset.mobileRoute === section;
      button.classList.toggle('is-active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function mark(section) {
    if (!paths[section]) return;
    if (visible() && location.pathname !== paths[section]) {
      const current = { ...(history.state || {}) };
      delete current.storeDrawer;
      history.pushState({
        ...current,
        mobileNavSection: section,
        mobileNavPrevious: location.pathname + location.search + location.hash
      }, '', paths[section]);
      lastPath = location.pathname;
    }
    setActive(section);
  }

  function controlsDrawer() {
    return visible() && ['sacola', 'conta'].includes(fromLocation());
  }

  function returnFromDrawer() {
    if (!controlsDrawer()) return;
    if (history.state?.mobileNavPrevious) {
      history.back();
      return;
    }
    history.replaceState({ mobileNavSection: 'inicio' }, '', paths.inicio);
    lastPath = location.pathname;
    setActive('inicio');
    window.scrollTo({ top: 0 });
  }

  function showRoute(section) {
    setActive(section);
    if (section === 'ofertas') window.showOffers();
    else if (section === 'categorias') {
      requestAnimationFrame(() => document.querySelector('#categorias')?.scrollIntoView({ behavior: 'auto' }));
    } else if (section === 'sacola') window.openCart();
    else if (section === 'conta') window.openAccount();
    else window.scrollTo({ top: 0 });
  }

  function handlePopState() {
    const section = fromLocation();
    const drawer = document.querySelector('#drawer');
    const changedPath = location.pathname !== lastPath;
    lastPath = location.pathname;
    if (changedPath && ['sacola', 'conta'].includes(section)) {
      showRoute(section);
      return;
    }
    if (drawer?.classList.contains('open')) window.closeDrawer(true);
    if (changedPath) showRoute(section);
    else setActive(section);
  }

  function animateTap(button) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    button.classList.remove('is-tapped');
    void button.offsetWidth;
    button.classList.add('is-tapped');
    button.addEventListener('animationend', () => button.classList.remove('is-tapped'), { once: true });
  }

  function cartAdded() {
    const button = nav.querySelector('[data-mobile-route="sacola"]');
    if (!button || !visible() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    button.classList.remove('cart-added');
    void button.offsetWidth;
    button.classList.add('cart-added');
    button.addEventListener('animationend', () => button.classList.remove('cart-added'), { once: true });
  }

  buttons.forEach(button => {
    button.addEventListener('pointerdown', () => button.classList.add('is-pressing'), { passive: true });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type =>
      button.addEventListener(type, () => button.classList.remove('is-pressing'))
    );
    button.addEventListener('click', () => {
      const section = button.dataset.mobileRoute;
      setActive(section);
      animateTap(button);
      if (!['sacola', 'conta'].includes(section) && document.querySelector('#drawer')?.classList.contains('mobile-route-drawer')) window.closeDrawer(true);
      if (section === 'inicio') window.scrollToTop();
      else if (section === 'ofertas') window.showOffers();
      else if (section === 'categorias') {
        mark('categorias');
        document.querySelector('#categorias')?.scrollIntoView({ behavior: 'smooth' });
      } else if (section === 'sacola') window.openCart();
      else if (section === 'conta') window.openAccount();
    });
  });

  window.MobileNav = Object.freeze({ mark, setActive, controlsDrawer, returnFromDrawer, handlePopState, cartAdded });
  setActive();
  if (location.pathname !== '/' && Object.values(paths).includes(location.pathname)) {
    requestAnimationFrame(() => showRoute(fromLocation()));
  }
})();
