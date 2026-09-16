// The "/about" route. Elaborate about page with mission, values, and how it works.

import { t } from '../lib/i18n.js';

export function renderAbout(root) {
  root.innerHTML = `
    <section class="about">
      <h1>${t('about_title')}</h1>

      <div class="about-lead">
        <p>${t('about_p1')}</p>
        <p>${t('about_p2')}</p>
        <p>${t('about_p3')}</p>
      </div>

      <div class="about-section">
        <div class="about-section-icon"><span class="material-symbols-outlined">flag</span></div>
        <h2>${t('about_mission_title')}</h2>
        <p>${t('about_mission_text')}</p>
      </div>

      <div class="about-section">
        <div class="about-section-icon"><span class="material-symbols-outlined">favorite</span></div>
        <h2>${t('about_values_title')}</h2>
        <div class="about-values-grid">
          <div class="about-value-card">
            <h3>${t('about_value1_title')}</h3>
            <p>${t('about_value1_text')}</p>
          </div>
          <div class="about-value-card">
            <h3>${t('about_value2_title')}</h3>
            <p>${t('about_value2_text')}</p>
          </div>
          <div class="about-value-card">
            <h3>${t('about_value3_title')}</h3>
            <p>${t('about_value3_text')}</p>
          </div>
        </div>
      </div>

      <div class="about-section">
        <div class="about-section-icon"><span class="material-symbols-outlined">route</span></div>
        <h2>${t('about_how_title')}</h2>
        <ol class="about-steps">
          <li>${t('about_how1')}</li>
          <li>${t('about_how2')}</li>
          <li>${t('about_how3')}</li>
          <li>${t('about_how4')}</li>
        </ol>
      </div>

      <div class="about-cta">
        <a href="/" data-link class="btn-primary">${t('hero_cta')}</a>
      </div>
    </section>
  `;
}
