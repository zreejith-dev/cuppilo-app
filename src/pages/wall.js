// The "/wall" route. Reads from the `founding_wall` VIEW only — never the
// raw `founders` table — so phone_number can never leak here even if RLS is
// ever misconfigured on the base table.
//
// Subscribes to realtime inserts while this page is visible, unsubscribes on
// route change (see main.js) to avoid leaking open sockets on pages that
// don't need them.

import { supabase } from '../lib/supabaseClient.js';
import { t } from '../lib/i18n.js';

let activeChannel = null;

export async function renderWall(root) {
  root.innerHTML = `
    <section class="wall">
      <h1>${t('wall_title')}</h1>
      <table class="wall-table">
        <thead><tr><th>#</th><th>Name</th><th>Cuppilo ID</th></tr></thead>
        <tbody id="wall-body"><tr><td colspan="3">Loading…</td></tr></tbody>
      </table>
    </section>
  `;

  const tbody = root.querySelector('#wall-body');

  const { data, error } = await supabase
    .from('founding_wall')
    .select('founder_number, name, cuppilo_id')
    .order('founder_number', { ascending: true })
    .limit(200);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3">Couldn't load the wall. Please refresh.</td></tr>`;
    console.error('Wall load failed:', error);
    return;
  }

  renderRows(tbody, data);
  subscribeToNewFounders(tbody);
}

function renderRows(tbody, rows) {
  tbody.innerHTML = rows
    .map((r) => `<tr><td>#${r.founder_number}</td><td>${escapeHtml(r.name)}</td><td>${r.cuppilo_id}</td></tr>`)
    .join('');
}

function subscribeToNewFounders(tbody) {
  unsubscribeFromWall(); // guard against a double-subscribe if renderWall runs twice
  activeChannel = supabase
    .channel('founders-wall')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'founders' }, (payload) => {
      const row = payload.new;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>#${row.founder_number}</td><td>${escapeHtml(row.name)}</td><td>${row.cuppilo_id}</td>`;
      tbody.appendChild(tr);
    })
    .subscribe();
}

// Called by the router when navigating away from /wall.
export function unsubscribeFromWall() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
