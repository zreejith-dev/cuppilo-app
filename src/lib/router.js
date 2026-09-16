// Minimal client-side router. Only /, /about, /wall, /support are real
// routes (they reload conceptually different content). The hero -> questions
// -> reveal sequence is NOT routed — that's a `state.step` change within the
// "/" page (see state.js). Mixing the two would be the complicated version;
// keeping them separate is what makes this file readable in one pass.

const routeTable = {}; // path -> render function, filled in by main.js

export function registerRoute(path, renderFn) {
  routeTable[path] = renderFn;
}

export function navigate(path) {
  if (location.pathname !== path) {
    history.pushState({}, '', path);
  }
  renderCurrentRoute();
}

export function renderCurrentRoute() {
  const path = location.pathname in routeTable ? location.pathname : '/';
  routeTable[path]();
}

export function startRouter() {
  window.addEventListener('popstate', renderCurrentRoute);
  // Intercept same-origin link clicks so navigation never triggers a full
  // page reload.
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });
  renderCurrentRoute();
}
