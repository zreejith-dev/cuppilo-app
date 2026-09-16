// App state, kept deliberately dumb: one object, one way to change it
// (setState), one way to react to changes (subscribe). No framework, no
// magic — read top to bottom and you understand all of it.
//
// `step` drives what the hero page shows WITHOUT a route change:
//   'hero' -> 'questions' -> 'reveal'
// This is what makes the question flow feel like one continuous page
// instead of a series of navigations (see PRD §5).

const state = {
  step: 'hero',        // 'hero' | 'questions' | 'reveal'
  name: null,           // captured inline in the hero, before questions start
  currentQuestion: 1,   // 1-6
  branch: null,         // set after Q1: 1, 2, or 3 (unused by the shared Q3-Q6 in seed.sql)
  answers: [],          // [{ questionId, optionId }], only written to DB on completion
  founder: null,        // filled in after the DB insert on flow completion
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn); // call the return value to unsubscribe
}

// Progress is persisted so a refresh mid-flow doesn't lose the visitor's
// answers. This is the ONLY place sessionStorage is touched.
const STORAGE_KEY = 'cuppilo_progress';

export function saveProgress() {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      step: state.step,
      name: state.name,
      currentQuestion: state.currentQuestion,
      branch: state.branch,
      answers: state.answers,
    })
  );
}

export function restoreProgress() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    Object.assign(state, JSON.parse(raw));
  } catch {
    // Corrupt or stale data — ignore it and start fresh rather than crash.
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function clearProgress() {
  sessionStorage.removeItem(STORAGE_KEY);
}
