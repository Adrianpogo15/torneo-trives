alter table public.porra_predictions
  add column if not exists penalty_winner_team_id uuid references public.teams(id) on delete set null;

drop function if exists public.get_porra_predictions(uuid);
drop function if exists public.save_porra_prediction(uuid, uuid, integer, integer, uuid);

create or replace function public.prediction_winner_team_id(
  home_team_id_input uuid,
  away_team_id_input uuid,
  home_score_input integer,
  away_score_input integer,
  penalty_winner_team_id_input uuid
)
returns uuid
language plpgsql
immutable
as $$
begin
  if home_score_input > away_score_input then
    return home_team_id_input;
  end if;

  if away_score_input > home_score_input then
    return away_team_id_input;
  end if;

  return penalty_winner_team_id_input;
end;
$$;

create or replace function public.match_winner_team_id(
  home_team_id_input uuid,
  away_team_id_input uuid,
  home_score_input integer,
  away_score_input integer,
  home_penalty_score_input integer,
  away_penalty_score_input integer
)
returns uuid
language plpgsql
immutable
as $$
begin
  if home_score_input is null or away_score_input is null then
    return null;
  end if;

  if home_score_input > away_score_input then
    return home_team_id_input;
  end if;

  if away_score_input > home_score_input then
    return away_team_id_input;
  end if;

  if home_penalty_score_input is null or away_penalty_score_input is null then
    return null;
  end if;

  if home_penalty_score_input > away_penalty_score_input then
    return home_team_id_input;
  end if;

  if away_penalty_score_input > home_penalty_score_input then
    return away_team_id_input;
  end if;

  return null;
end;
$$;

create or replace function public.calculate_prediction_points(
  predicted_home integer,
  predicted_away integer,
  predicted_winner_team_id uuid,
  actual_home integer,
  actual_away integer,
  actual_winner_team_id uuid
)
returns integer
language plpgsql
immutable
as $$
declare
  points integer := 0;
  predicted_difference integer := predicted_home - predicted_away;
  actual_difference integer := actual_home - actual_away;
begin
  if predicted_winner_team_id is not null and actual_winner_team_id is not null then
    if predicted_winner_team_id = actual_winner_team_id then
      points := points + 5;
    end if;
  elsif predicted_winner_team_id is null and actual_winner_team_id is null then
    if sign(predicted_difference) = sign(actual_difference) then
      points := points + 5;
    end if;
  end if;

  if predicted_difference = actual_difference then
    points := points + 5;
  end if;

  if predicted_home = actual_home and predicted_away = actual_away then
    points := points + 7;
  end if;

  return points;
end;
$$;

create or replace function public.calculate_porra_prediction_points(
  predicted_home integer,
  predicted_away integer,
  predicted_winner_team_id uuid,
  predicted_first_scorer uuid,
  actual_home integer,
  actual_away integer,
  actual_winner_team_id uuid,
  actual_first_scorer uuid
)
returns integer
language plpgsql
immutable
as $$
declare
  points integer := 0;
begin
  points := public.calculate_prediction_points(
    predicted_home,
    predicted_away,
    predicted_winner_team_id,
    actual_home,
    actual_away,
    actual_winner_team_id
  );

  if predicted_first_scorer is not null
    and actual_first_scorer is not null
    and predicted_first_scorer = actual_first_scorer then
    points := points + 3;
  end if;

  return points;
end;
$$;

create or replace function public.save_porra_prediction(
  porra_user_id_input uuid,
  match_id_input uuid,
  home_score_input integer,
  away_score_input integer,
  first_scorer_player_id_input uuid,
  penalty_winner_team_id_input uuid
)
returns public.porra_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record public.matches%rowtype;
  stage_type public.stage_type;
  prediction_record public.porra_predictions%rowtype;
  clean_penalty_winner_team_id uuid := penalty_winner_team_id_input;
begin
  select * into match_record
  from public.matches
  where id = match_id_input;

  if match_record.id is null then
    raise exception 'Partido no encontrado.';
  end if;

  select s.type into stage_type
  from public.stages s
  where s.id = match_record.stage_id;

  if match_record.status <> 'scheduled' then
    raise exception 'Este partido ya esta cerrado para resultados.';
  end if;

  if match_record.scheduled_at is not null and match_record.scheduled_at <= now() then
    raise exception 'Este partido ya esta cerrado para resultados.';
  end if;

  if first_scorer_player_id_input is not null and not exists (
    select 1
    from public.players p
    where p.id = first_scorer_player_id_input
      and (
        p.team_id = match_record.home_team_id
        or p.team_id = match_record.away_team_id
      )
  ) then
    raise exception 'El primer goleador debe pertenecer a uno de los dos equipos.';
  end if;

  if stage_type = 'knockout' and home_score_input = away_score_input then
    if clean_penalty_winner_team_id is null or clean_penalty_winner_team_id not in (
      match_record.home_team_id,
      match_record.away_team_id
    ) then
      raise exception 'Elige ganador en penaltis para este partido.';
    end if;
  else
    clean_penalty_winner_team_id := null;
  end if;

  insert into public.porra_predictions (
    match_id,
    porra_user_id,
    home_score,
    away_score,
    first_scorer_player_id,
    penalty_winner_team_id,
    locked_at
  )
  values (
    match_id_input,
    porra_user_id_input,
    home_score_input,
    away_score_input,
    first_scorer_player_id_input,
    clean_penalty_winner_team_id,
    match_record.scheduled_at
  )
  on conflict (match_id, porra_user_id) do update
  set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    first_scorer_player_id = excluded.first_scorer_player_id,
    penalty_winner_team_id = excluded.penalty_winner_team_id,
    locked_at = excluded.locked_at,
    updated_at = now()
  returning * into prediction_record;

  return prediction_record;
end;
$$;

create or replace function public.get_porra_predictions(porra_user_id_input uuid)
returns table(
  id uuid,
  match_id uuid,
  porra_user_id uuid,
  home_score integer,
  away_score integer,
  first_scorer_player_id uuid,
  penalty_winner_team_id uuid,
  points integer,
  locked_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.match_id,
    p.porra_user_id,
    p.home_score,
    p.away_score,
    p.first_scorer_player_id,
    p.penalty_winner_team_id,
    p.points,
    p.locked_at
  from public.porra_predictions p
  where p.porra_user_id = porra_user_id_input;
$$;

create or replace function public.recalculate_porra_match_predictions(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record public.matches%rowtype;
  actual_first_scorer uuid;
  actual_winner_team_id uuid;
begin
  select * into match_record
  from public.matches
  where id = target_match_id;

  if match_record.id is null or match_record.status <> 'finished' then
    return;
  end if;

  actual_first_scorer := public.first_scorer_for_match(target_match_id);
  actual_winner_team_id := public.match_winner_team_id(
    match_record.home_team_id,
    match_record.away_team_id,
    match_record.home_score,
    match_record.away_score,
    match_record.home_penalty_score,
    match_record.away_penalty_score
  );

  update public.porra_predictions p
  set
    points = public.calculate_porra_prediction_points(
      p.home_score,
      p.away_score,
      public.prediction_winner_team_id(
        match_record.home_team_id,
        match_record.away_team_id,
        p.home_score,
        p.away_score,
        p.penalty_winner_team_id
      ),
      p.first_scorer_player_id,
      match_record.home_score,
      match_record.away_score,
      actual_winner_team_id,
      actual_first_scorer
    ),
    locked_at = coalesce(p.locked_at, now()),
    updated_at = now()
  where p.match_id = target_match_id;
end;
$$;

create or replace view public.porra_match_stats
with (security_invoker = false)
as
with base as (
  select
    p.match_id,
    p.home_score,
    p.away_score,
    p.first_scorer_player_id,
    public.prediction_winner_team_id(
      m.home_team_id,
      m.away_team_id,
      p.home_score,
      p.away_score,
      p.penalty_winner_team_id
    ) as predicted_winner_team_id,
    m.home_team_id,
    m.away_team_id,
    (p.home_score::text || '-' || p.away_score::text) as score_label
  from public.porra_predictions p
  join public.matches m on m.id = p.match_id
),
score_counts as (
  select match_id, score_label, count(*)::integer as prediction_count
  from base
  group by match_id, score_label
),
ranked_scores as (
  select
    match_id,
    score_label,
    prediction_count,
    row_number() over (
      partition by match_id
      order by prediction_count desc, score_label asc
    ) as position
  from score_counts
)
select
  b.match_id,
  count(*)::integer as total_predictions,
  count(*) filter (where b.predicted_winner_team_id = b.home_team_id)::integer as home_win_count,
  count(*) filter (where b.predicted_winner_team_id is null)::integer as draw_count,
  count(*) filter (where b.predicted_winner_team_id = b.away_team_id)::integer as away_win_count,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('score', rs.score_label, 'count', rs.prediction_count)
        order by rs.prediction_count desc, rs.score_label asc
      )
      from ranked_scores rs
      where rs.match_id = b.match_id
        and rs.position <= 5
    ),
    '[]'::jsonb
  ) as top_scores
from base b
group by b.match_id;

grant execute on function public.prediction_winner_team_id(uuid, uuid, integer, integer, uuid) to anon, authenticated;
grant execute on function public.match_winner_team_id(uuid, uuid, integer, integer, integer, integer) to anon, authenticated;
grant execute on function public.calculate_prediction_points(integer, integer, uuid, integer, integer, uuid) to anon, authenticated;
grant execute on function public.calculate_porra_prediction_points(integer, integer, uuid, uuid, integer, integer, uuid, uuid) to anon, authenticated;
grant execute on function public.save_porra_prediction(uuid, uuid, integer, integer, uuid, uuid) to anon, authenticated;
grant execute on function public.get_porra_predictions(uuid) to anon, authenticated;
grant select on public.porra_match_stats to anon, authenticated;

notify pgrst, 'reload schema';
