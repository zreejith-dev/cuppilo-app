// The "/support" route. BMC (Buy Me a Coffee) integration with flip card,
// QR code, and self-reported logging. Stats pulled from support_payments table.

import { supabase } from '../lib/supabaseClient.js';
import { t } from '../lib/i18n.js';

const BMC_URL = 'https://buymeacoffee.com/cuppilocafe';

export async function renderSupport(root) {
  root.innerHTML = `
    <section class="support">
      <div class="sup-hero">
        <h1>${t('support_title')}</h1>
        <p>If Cuppilo doesn't exist yet, help build it with a coffee.</p>
      </div>

      <div class="flip-container" id="flip-card">
        <div class="flip-inner">
          <div class="flip-front">
            <span class="material-symbols-outlined">local_cafe</span>
            <h2>CUPPILO</h2>
            <p>Tap to flip for QR code</p>
            <div class="flip-hint">
              <span class="material-symbols-outlined">touch_app</span> Tap to flip
            </div>
          </div>
          <div class="flip-back">
            <img src="/assets/bmc-qr.png" alt="BMC QR Code" />
            <div class="qr-label">Scan to support</div>
            <div class="qr-link">buymeacoffee.com/cuppilocafe</div>
          </div>
        </div>
      </div>

      <div style="text-align:center; padding:1.5rem 1rem">
        <a class="btn-bmc" href="${BMC_URL}" target="_blank" rel="noopener">
          <span class="material-symbols-outlined" style="font-size:20px">local_cafe</span>
          Buy me a Coffee
        </a>
      </div>

      <div class="support-stats" id="support-stats">
        <div class="report-card">
          <span class="material-symbols-outlined">local_cafe</span>
          <div class="value" id="stat-coffees">--</div>
          <div class="label">Coffees bought</div>
        </div>
        <div class="report-card">
          <span class="material-symbols-outlined">payments</span>
          <div class="value" id="stat-raised">--</div>
          <div class="label">Total raised</div>
        </div>
        <div class="report-card">
          <span class="material-symbols-outlined">group</span>
          <div class="value" id="stat-supporters">--</div>
          <div class="label">Supporters</div>
        </div>
      </div>

      <div class="sup-note">
        <p><strong>Fully anonymous</strong> bought Coffee status = <strong>lifetime 10% on anything in Cuppilo</strong></p>
      </div>
    </section>
  `;

  // Flip card toggle
  root.querySelector('#flip-card').addEventListener('click', () => {
    root.querySelector('#flip-card').classList.toggle('flipped');
  });

  loadStats(root);
}

async function loadStats(root) {
  const coffeesEl = root.querySelector('#stat-coffees');
  const raisedEl = root.querySelector('#stat-raised');
  const supportersEl = root.querySelector('#stat-supporters');

  const { data, error } = await supabase.from('support_stats').select('total_coffees, total_raised').single();

  if (error) {
    console.error('Support stats load failed:', error);
    coffeesEl.textContent = '0';
    raisedEl.textContent = '\u20B90';
    supportersEl.textContent = '0';
    return;
  }

  coffeesEl.textContent = data.total_coffees || 0;
  raisedEl.textContent = '\u20B9' + (data.total_raised || 0).toLocaleString();
  supportersEl.textContent = data.total_coffees || 0;
}
