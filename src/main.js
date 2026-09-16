// Entry point. This is the file to read first if you're new to the codebase:
// it shows every route the app has and where each one's code lives.
//
// Flow map:
//   /         -> src/pages/home.js     (hero -> questions -> reveal, all one page)
//   /about    -> src/pages/about.js    (static)
//   /wall     -> src/pages/wall.js     (live founding wall)
//   /support  -> src/pages/support.js  (buy-me-a-coffee)
//
// Nothing here talks to Supabase directly — that's each page module's job.
// This file only wires routing + the two header toggles (theme, language).

import { registerRoute, startRouter, renderCurrentRoute } from './lib/router.js';
import { renderHome } from './pages/home.js';
import { renderAbout } from './pages/about.js';
import { renderWall, unsubscribeFromWall } from './pages/wall.js';
import { renderSupport } from './pages/support.js';
import { setLang, getLang } from './lib/i18n.js';
import { getState, restoreProgress } from './lib/state.js';

function updateLogo() {
  const lang = getLang();
  const theme = document.documentElement.dataset.theme || 'light';
  const src = `/assets/logo-${lang}-${theme}.png`;
  const navImg = document.getElementById('nav-logo-img');
  const footerImg = document.getElementById('footer-logo-img');
  if (navImg) navImg.src = src;
  if (footerImg) footerImg.src = src;
}

async function loadPartial(path, targetEl) {
  const res = await fetch(path);
  targetEl.innerHTML = await res.text();
}

function wireHeaderControls() {
  const themeToggle = document.getElementById('theme-toggle');
  const langToggle = document.getElementById('lang-toggle');
  const menuToggle = document.getElementById('menu-toggle');
  const menuPanel = document.getElementById('menu-panel');

  const savedTheme = localStorage.getItem('cuppilo_theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('cuppilo_theme', next);
    updateLogo();
  });

  langToggle.addEventListener('click', () => {
    setLang(getLang() === 'en' ? 'ml' : 'en');
    updateLogo();
    renderCurrentRoute(); // re-render the current route with the new language's strings
  });

  menuToggle.addEventListener('click', () => {
    menuPanel.classList.toggle('hidden');
  });
}

async function bootstrap() {
  const headerEl = document.getElementById('header-slot');
  const footerEl = document.getElementById('footer-slot');
  const pageRoot = document.getElementById('page-root');

  await Promise.all([loadPartial('/src/partials/header.html', headerEl), loadPartial('/src/partials/footer.html', footerEl)]);
  wireHeaderControls();

  // Wall's realtime subscription must close when leaving /wall — wrap each
  // route so leaving the wall route always cleans up first.
  let previousRoute = null;
  function wrapRoute(path, renderFn) {
    registerRoute(path, async () => {
      if (previousRoute === '/wall' && path !== '/wall') unsubscribeFromWall();
      previousRoute = path;
      await renderFn(pageRoot);
    });
  }

  wrapRoute('/', renderHome);
  wrapRoute('/about', renderAbout);
  wrapRoute('/wall', renderWall);
  wrapRoute('/support', renderSupport);

  startRouter();
  updateLogo();

  // Restore profile icon from session state
  restoreProgress();
  const state = getState();
  if (state.name) {
    const profileIcon = document.getElementById('profile-icon');
    if (profileIcon) {
      profileIcon.style.display = 'flex';
      profileIcon.querySelector('.profile-avatar').textContent = state.name.charAt(0).toUpperCase();
      profileIcon.querySelector('.profile-name').textContent = state.name;
    }
  }
}

bootstrap();
