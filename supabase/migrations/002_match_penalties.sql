alter table public.matches
  add column if not exists home_penalty_score integer,
  add column if not exists away_penalty_score integer,
  add column if not exists tiebreak_note text;

alter table public.matches
  add constraint matches_penalty_scores_non_negative check (
    (home_penalty_score is null or home_penalty_score >= 0) and
    (away_penalty_score is null or away_penalty_score >= 0)
  ) not valid;
