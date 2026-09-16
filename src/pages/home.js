// The "/" route. Renders one of three sections depending on state.step:
// hero -> questions -> reveal. They live in one file because they share one
// piece of state and one visual container — splitting them into separate
// routes would mean a page reload between each step, which is exactly the
// friction the PRD's flow redesign removes (see PRD §5).

import { supabase } from '../lib/supabaseClient.js';
import { getState, setState, saveProgress, restoreProgress, clearProgress } from '../lib/state.js';
import { renderQrCode } from '../lib/qr.js';
import { t, getLang } from '../lib/i18n.js';
import { navigate } from '../lib/router.js';

let questionCache = null;

const q1Icons = {
  1: 'local_cafe',
  2: 'emoji_food_beverage',
  3: 'auto_awesome',
};
const q1Desc = {
  1: { en: 'Single-origin, pour-over, latte art', ml: 'സിംഗിൾ-ഓറിജിൻ പൗവർ-ഓവർ, ലാറ്റെ ആർട്ട്' },
  2: { en: 'Filter kaapi, chai, Malabar snacks', ml: 'ഫിൽട്ടർ കാപ്പി, ചായ, മലബാർ സ്നാക്കുകൾ' },
  3: { en: 'Karupatti latte, jackfruit cold brew', ml: 'കരുപ്പട്ടി ലാറ്റെ, ചക്ക കോൾഡ് ബ്രൂ' },
};

async function loadQuestions() {
  if (questionCache) return questionCache;
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, order_index, prompt, prompt_ml, multi_select')
    .order('order_index');
  const { data: options, error: oErr } = await supabase
    .from('question_options')
    .select('id, question_id, option_text, option_text_ml, order_index, branch_target')
    .order('order_index');

  if (qErr || oErr) {
    console.error('Failed to load questions:', qErr || oErr);
    questionCache = [];
    return questionCache;
  }

  questionCache = questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.question_id === q.id),
  }));
  return questionCache;
}

export async function renderHome(root) {
  restoreProgress();
  const state = getState();

  if (state.step === 'hero') return renderHero(root);
  if (state.step === 'questions') return renderQuestions(root);
  if (state.step === 'reveal') return renderReveal(root);
}

// ---------- Step 1: Hero + About blurb ----------
function renderHero(root) {
  const lang = getLang();
  root.innerHTML = `
    <section class="hero">
      <h1>${t('hero_title')}</h1>
      <p class="hero-copy">${t('hero_subtitle')}</p>
      <input
        id="name-input"
        class="name-input"
        type="text"
        placeholder="${t('name_placeholder')}"
        autocomplete="name"
      />
      <button id="start-btn" class="btn-primary" disabled>${t('hero_cta')}</button>
    </section>
    <section class="home-about-blurb">
      <div class="blurb-icon"><span class="material-symbols-outlined">info</span></div>
      <div class="blurb-text">
        <h3>${t('home_about_title')}</h3>
        <p>${t('home_about_text')}</p>
        <a href="/about" data-link class="btn-text">${t('home_about_link')}</a>
      </div>
    </section>
  `;

  const input = root.querySelector('#name-input');
  const startBtn = root.querySelector('#start-btn');

  input.addEventListener('input', () => {
    startBtn.disabled = input.value.trim().length === 0;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) startBtn.click();
  });

  startBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    setState({ step: 'questions', name, currentQuestion: 1, answers: [] });
    saveProgress();
    updateProfileIcon(name);
    renderHome(root);
  });

  // Restore profile icon if name exists
  const state = getState();
  if (state.name) updateProfileIcon(state.name);
}

// ---------- Name re-entry modal ----------
function showNameModal(root) {
  const state = getState();
  const existing = root.querySelector('#name-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'name-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" id="modal-close">&times;</button>
      <h2>${t('name_modal_title')}</h2>
      <p class="modal-sub">${t('name_modal_sub')}</p>
      <input
        id="modal-name-input"
        class="name-input"
        type="text"
        placeholder="${t('name_placeholder')}"
        autocomplete="name"
        value="${state.name || ''}"
      />
      <button id="modal-confirm" class="btn-primary">${t('name_modal_confirm')}</button>
    </div>
  `;
  root.appendChild(modal);

  const modalInput = modal.querySelector('#modal-name-input');
  const confirmBtn = modal.querySelector('#modal-confirm');
  const closeBtn = modal.querySelector('#modal-close');

  modalInput.select();

  confirmBtn.addEventListener('click', () => {
    const name = modalInput.value.trim();
    if (!name) return;
    setState({ name });
    saveProgress();
    updateProfileIcon(name);
    modal.remove();
  });

  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
  });

  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ---------- Profile icon in header ----------
function updateProfileIcon(name) {
  const existing = document.getElementById('profile-icon');
  if (!existing) return;
  if (name) {
    existing.style.display = 'flex';
    existing.querySelector('.profile-avatar').textContent = name.charAt(0).toUpperCase();
    existing.querySelector('.profile-name').textContent = name;
  } else {
    existing.style.display = 'none';
  }
}

// ---------- Step 2: Questions ----------
async function renderQuestions(root) {
  root.innerHTML = `<section class="questions"><p class="loading-text">${t('loading')}</p></section>`;
  const questions = await loadQuestions();
  const state = getState();
  const question = questions.find((q) => q.order_index === state.currentQuestion);
  const lang = getLang();

  if (!question) {
    return finalizeFlow(root, questions);
  }

  // Filter options by branch: Q2/Q3 use branch from Q1, Q4-Q6 show all
  let filteredOptions = question.options;
  if (state.branch && (question.order_index === 2 || question.order_index === 3)) {
    filteredOptions = question.options.filter((o) => o.branch_target === state.branch);
  }

  const prompt = lang === 'ml' && question.prompt_ml ? question.prompt_ml : question.prompt;
  const isMulti = question.multi_select;

  // Get existing selections for this question (supports multi)
  const existingAnswers = state.answers.filter((a) => a.questionId === question.id);
  const selectedIds = existingAnswers.map((a) => a.optionId);

  const container = root.querySelector('.questions');
  container.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${((state.currentQuestion - 1) / 6) * 100}%"></div>
    </div>
    <p class="question-count">${state.currentQuestion} / 6</p>
    <h2>${prompt}</h2>
    ${isMulti ? `<p class="multi-hint">${t('multi_hint')}</p>` : ''}
    <div class="option-list" id="option-list">
      ${filteredOptions
        .map((o) => {
          const text = lang === 'ml' && o.option_text_ml ? o.option_text_ml : o.option_text;
          const isQ1 = question.order_index === 1;
          const branchKey = o.branch_target;
          const icon = isQ1 && q1Icons[branchKey] ? `<span class="material-symbols-outlined opt-icon">${q1Icons[branchKey]}</span>` : '';
          const desc = isQ1 && q1Desc[branchKey] ? `<span class="opt-desc">${lang === 'ml' ? q1Desc[branchKey].ml : q1Desc[branchKey].en}</span>` : '';
          const isSelected = selectedIds.includes(o.id);
          return `<button class="option-card${isQ1 ? ' option-card--q1' : ''} ${isSelected ? 'option-selected' : ''}" data-option-id="${o.id}" data-branch="${o.branch_target ?? ''}">
            <div class="opt-content">
              ${isMulti ? `<span class="opt-check material-symbols-outlined">${isSelected ? 'check_box' : 'check_box_outline_blank'}</span>` : ''}
              ${icon}
              <div class="opt-text-group">
                <span class="opt-text">${text}</span>
                ${desc}
              </div>
            </div>
          </button>`;
        })
        .join('')}
    </div>
    ${question.order_index === 5 ? `
      <div class="vibe-section">
        <label class="vibe-label">${t('q5_vibe_label')}</label>
        <textarea id="vibe-input" class="vibe-input" placeholder="${t('q5_vibe_placeholder')}" rows="3">${state.vibeText || ''}</textarea>
      </div>
    ` : ''}
    <div class="question-nav">
      ${state.currentQuestion > 1 ? `<button class="btn-text" id="back-btn">${t('back')}</button>` : ''}
      ${isMulti ? `<button class="btn-primary" id="next-btn" ${selectedIds.length === 0 ? 'disabled' : ''}>${t('next')}</button>` : ''}
    </div>
  `;

  // --- Option click handling ---
  if (isMulti) {
    // Multi-select: toggle selections
    const selected = new Set(selectedIds);

    container.querySelectorAll('.option-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const optionId = Number(btn.dataset.optionId);
        if (selected.has(optionId)) {
          selected.delete(optionId);
          btn.classList.remove('option-selected');
          const check = btn.querySelector('.opt-check');
          if (check) check.textContent = 'check_box_outline_blank';
        } else {
          selected.add(optionId);
          btn.classList.add('option-selected');
          const check = btn.querySelector('.opt-check');
          if (check) check.textContent = 'check_box';
        }
        const nextBtn = container.querySelector('#next-btn');
        if (nextBtn) nextBtn.disabled = selected.size === 0;
      });
    });

    // Next button for multi-select
    const nextBtn = container.querySelector('#next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        // Remove old answers for this question, add new ones
        const answers = getState().answers.filter((a) => a.questionId !== question.id);
        selected.forEach((optId) => answers.push({ questionId: question.id, optionId: optId }));

        const patch = { answers, currentQuestion: state.currentQuestion + 1 };

        if (question.order_index === 5) {
          const vibeInput = root.querySelector('#vibe-input');
          if (vibeInput) patch.vibeText = vibeInput.value.trim();
        }
        if (question.order_index === 1 && selected.size > 0) {
          // Use the last selected option's branch (should be the same for Q1)
          const lastOpt = filteredOptions.find((o) => selected.has(o.id));
          if (lastOpt) patch.branch = lastOpt.branch_target;
        }

        setState(patch);
        saveProgress();
        renderQuestions(root);
      });
    }
  } else {
    // Single-select: immediate advance
    container.querySelectorAll('.option-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const optionId = Number(btn.dataset.optionId);
        const branch = btn.dataset.branch ? Number(btn.dataset.branch) : null;

        const answers = [...getState().answers.filter((a) => a.questionId !== question.id), { questionId: question.id, optionId }];
        const patch = { answers, currentQuestion: state.currentQuestion + 1 };

        if (question.order_index === 5) {
          const vibeInput = root.querySelector('#vibe-input');
          if (vibeInput) patch.vibeText = vibeInput.value.trim();
        }

        if (question.order_index === 1) patch.branch = branch;

        setState(patch);
        saveProgress();
        renderQuestions(root);
      });
    });
  }

  // --- Back button ---
  const backBtn = container.querySelector('#back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (state.currentQuestion === 1) {
        // Going back past Q1 — show name modal
        showNameModal(root);
        return;
      }
      setState({ currentQuestion: state.currentQuestion - 1 });
      saveProgress();
      renderQuestions(root);
    });
  }
}

// ---------- Flow completion: one batch write, then move to reveal ----------
async function finalizeFlow(root, questions) {
  const state = getState();

  const { data: founder, error: founderErr } = await supabase
    .from('founders')
    .insert({ name: state.name })
    .select()
    .single();

  if (founderErr) {
    console.error('Could not create founder:', founderErr);
    root.querySelector('.questions').innerHTML = `<p class="error">${t('error_retry')}</p>`;
    return;
  }

  // Batch-insert all answers — multi-select creates multiple rows per question
  const rows = state.answers.map((a) => ({
    founder_id: founder.id,
    question_id: a.questionId,
    option_id: a.optionId,
  }));
  const { error: answersErr } = await supabase.from('answers').insert(rows);
  if (answersErr) console.error('Could not save answers:', answersErr);

  setState({ step: 'reveal', founder });
  saveProgress();
  renderHome(root);
}

// ---------- Step 3: Reveal ----------
function renderReveal(root) {
  const { founder } = getState();
  root.innerHTML = `
    <section class="reveal">
      <div class="founder-card" id="founder-card">
        <p class="founder-label">${t('founder_label')}</p>
        <p class="founder-number">${t('founder_number')}${founder.founder_number}</p>
        <p class="founder-id">${founder.cuppilo_id}</p>
        <div id="qr-container" class="qr-container"></div>
      </div>
      <div class="reveal-actions">
        <button id="share-btn" class="btn-primary">${t('share_btn')}</button>
        <a href="/wall" data-link class="btn-text">${t('check_position')}</a>
      </div>
    </section>
  `;

  renderQrCode(root.querySelector('#qr-container'), founder.qr_payload);

  root.querySelector('#share-btn').addEventListener('click', async () => {
    const shareData = {
      title: 'Cuppilo',
      text: `I just became Cuppilo Founder ${founder.cuppilo_id}. Join the community:`,
      url: founder.qr_payload,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert(t('share_copied'));
    }
  });

  clearProgress();
}
