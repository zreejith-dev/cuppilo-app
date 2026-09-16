-- Seed content for the question flow. Edit the text here to change copy —
-- never hardcode question text in JS.
--
-- Q1 has 3 options, each with a branch_target (1, 2, or 3). Whichever branch
-- the visitor picks decides which variant of Q2 they see next. Q3-Q6 are
-- shared across all branches in this seed — add more rows with a matching
-- branch_target if a later question also needs to branch.

insert into questions (id, order_index, prompt, prompt_ml) values
  (1, 1, 'What kind of café do you dream of?', null),
  (2, 2, 'What''s your go-to drink?', null),
  (3, 3, 'What should we add to the menu?', null),
  (4, 4, 'What''s your daily budget for a café visit?', null),
  (5, 5, 'What are you usually doing when you visit a café?', null),
  (6, 6, 'What''s missing from cafés you know today?', null)
on conflict (id) do nothing;

insert into question_options (question_id, option_text, order_index, branch_target) values
  (1, 'A quiet space to work or read', 1, 1),
  (1, 'A cozy spot to hang out with friends and family', 2, 2),
  (1, 'A place with a genuinely different vibe and menu', 3, 3),

  (2, 'Filter coffee', 1, null),
  (2, 'Cold brew / iced coffee', 2, null),
  (2, 'Tea', 3, null),
  (2, 'Something non-caffeinated', 4, null),

  (3, 'More food options, not just drinks', 1, null),
  (3, 'Healthier / low-sugar options', 2, null),
  (3, 'Local, regional specialties', 3, null),

  (4, 'Under ₹100', 1, null),
  (4, '₹100 – ₹250', 2, null),
  (4, '₹250+', 3, null),

  (5, 'Working or studying', 1, null),
  (5, 'Catching up with people', 2, null),
  (5, 'Just passing time alone', 3, null),

  (6, 'Good wifi and seating for long stays', 1, null),
  (6, 'Honest pricing', 2, null),
  (6, 'A place that feels made for people like me', 3, null)
on conflict do nothing;
