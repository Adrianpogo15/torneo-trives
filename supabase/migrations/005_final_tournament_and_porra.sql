create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

alter table public.teams
  add column if not exists logo_url text;

create table if not exists public.porra_users (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint porra_users_dni_not_empty check (length(trim(dni)) > 0),
  constraint porra_users_display_name_not_empty check (length(trim(display_name)) > 0)
);

create table if not exists public.porra_predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  porra_user_id uuid not null references public.porra_users(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  first_scorer_player_id uuid references public.players(id) on delete set null,
  points integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint porra_predictions_one_per_user unique (match_id, porra_user_id),
  constraint porra_predictions_scores_non_negative check (home_score >= 0 and away_score >= 0),
  constraint porra_predictions_points_non_negative check (points >= 0)
);

create index if not exists porra_predictions_match_id_idx
on public.porra_predictions(match_id);

create index if not exists porra_predictions_user_id_idx
on public.porra_predictions(porra_user_id);

drop trigger if exists porra_users_set_updated_at on public.porra_users;
create trigger porra_users_set_updated_at
before update on public.porra_users
for each row execute function public.set_updated_at();

drop trigger if exists porra_predictions_set_updated_at on public.porra_predictions;
create trigger porra_predictions_set_updated_at
before update on public.porra_predictions
for each row execute function public.set_updated_at();

create or replace function public.normalize_dni(value text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(value, ''), '[^0-9A-Z]', '', 'g'));
$$;

create or replace function public.is_valid_dni(value text)
returns boolean
language plpgsql
immutable
as $$
declare
  clean_value text := public.normalize_dni(value);
  dni_number integer;
  expected_letter text;
  letters constant text := 'TRWAGMYFPDXBNJZSQVHLCKE';
begin
  if clean_value !~ '^([0-9]{8}|[XYZ][0-9]{7})[A-Z]$' then
    return false;
  end if;

  dni_number := replace(
    replace(
      replace(left(clean_value, 8), 'X', '0'),
      'Y',
      '1'
    ),
    'Z',
    '2'
  )::integer;
  expected_letter := substr(letters, (dni_number % 23) + 1, 1);

  return right(clean_value, 1) = expected_letter;
end;
$$;

create or replace function public.register_porra_user(
  dni_input text,
  display_name_input text,
  password_input text
)
returns table(id uuid, dni text, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_dni text := public.normalize_dni(dni_input);
  clean_name text := trim(display_name_input);
begin
  if not public.is_valid_dni(clean_dni) then
    raise exception 'Introduce un DNI valido.';
  end if;

  if length(clean_name) < 2 then
    raise exception 'Introduce un nombre de usuario.';
  end if;

  if length(coalesce(password_input, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;

  insert into public.porra_users (dni, display_name, password_hash)
  values (clean_dni, clean_name, extensions.crypt(password_input, extensions.gen_salt('bf')))
  returning porra_users.id, porra_users.dni, porra_users.display_name
  into id, dni, display_name;

  return next;
exception
  when unique_violation then
    raise exception 'Ya existe una cuenta con ese DNI.';
end;
$$;

create or replace function public.login_porra_user(
  dni_input text,
  password_input text
)
returns table(id uuid, dni text, display_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select u.id, u.dni, u.display_name
  from public.porra_users u
  where u.dni = public.normalize_dni(dni_input)
    and u.password_hash = extensions.crypt(password_input, u.password_hash);

  if not found then
    raise exception 'DNI o contraseña incorrectos.';
  end if;
end;
$$;

create or replace function public.first_scorer_for_match(target_match_id uuid)
returns uuid
language sql
stable
as $$
  select me.player_id
  from public.match_events me
  where me.match_id = target_match_id
    and me.event_type = 'goal'
    and me.player_id is not null
  order by me.minute asc, me.created_at asc
  limit 1;
$$;

create or replace function public.calculate_prediction_points(
  predicted_home integer,
  predicted_away integer,
  actual_home integer,
  actual_away integer
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
  if sign(predicted_difference) = sign(actual_difference) then
    points := points + 5;
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
  predicted_first_scorer uuid,
  actual_home integer,
  actual_away integer,
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
    actual_home,
    actual_away
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
  first_scorer_player_id_input uuid
)
returns public.porra_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record public.matches%rowtype;
  prediction_record public.porra_predictions%rowtype;
begin
  select * into match_record
  from public.matches
  where id = match_id_input;

  if match_record.id is null then
    raise exception 'Partido no encontrado.';
  end if;

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

  insert into public.porra_predictions (
    match_id,
    porra_user_id,
    home_score,
    away_score,
    first_scorer_player_id,
    locked_at
  )
  values (
    match_id_input,
    porra_user_id_input,
    home_score_input,
    away_score_input,
    first_scorer_player_id_input,
    match_record.scheduled_at
  )
  on conflict (match_id, porra_user_id) do update
  set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    first_scorer_player_id = excluded.first_scorer_player_id,
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
begin
  select * into match_record
  from public.matches
  where id = target_match_id;

  if match_record.id is null or match_record.status <> 'finished' then
    return;
  end if;

  actual_first_scorer := public.first_scorer_for_match(target_match_id);

  update public.porra_predictions p
  set
    points = public.calculate_porra_prediction_points(
      p.home_score,
      p.away_score,
      p.first_scorer_player_id,
      match_record.home_score,
      match_record.away_score,
      actual_first_scorer
    ),
    locked_at = coalesce(p.locked_at, now()),
    updated_at = now()
  where p.match_id = target_match_id;
end;
$$;

create or replace function public.recalculate_porra_after_match_finished()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finished' then
    perform public.recalculate_porra_match_predictions(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists matches_recalculate_porra_predictions on public.matches;
create trigger matches_recalculate_porra_predictions
after update of status, home_score, away_score on public.matches
for each row execute function public.recalculate_porra_after_match_finished();

create or replace function public.recalculate_porra_after_event_change()
returns trigger
language plpgsql
as $$
declare
  changed_match_id uuid;
begin
  if tg_op = 'DELETE' then
    changed_match_id := old.match_id;
  else
    changed_match_id := new.match_id;
  end if;

  perform public.recalculate_porra_match_predictions(changed_match_id);
  return null;
end;
$$;

drop trigger if exists match_events_recalculate_porra_predictions on public.match_events;
create trigger match_events_recalculate_porra_predictions
after insert or update or delete on public.match_events
for each row execute function public.recalculate_porra_after_event_change();

create or replace view public.porra_leaderboard
with (security_invoker = false)
as
select
  u.id as user_id,
  u.display_name,
  coalesce(sum(p.points), 0)::integer as points,
  count(*) filter (
    where p.home_score = m.home_score
      and p.away_score = m.away_score
  )::integer as exact_scores,
  count(p.id)::integer as predictions_count
from public.porra_users u
left join public.porra_predictions p on p.porra_user_id = u.id
left join public.matches m on m.id = p.match_id
group by u.id, u.display_name;

create or replace view public.porra_match_stats
with (security_invoker = false)
as
with base as (
  select
    p.match_id,
    p.home_score,
    p.away_score,
    p.first_scorer_player_id,
    (p.home_score::text || '-' || p.away_score::text) as score_label
  from public.porra_predictions p
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
  count(*) filter (where b.home_score > b.away_score)::integer as home_win_count,
  count(*) filter (where b.home_score = b.away_score)::integer as draw_count,
  count(*) filter (where b.away_score > b.home_score)::integer as away_win_count,
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

grant execute on function public.register_porra_user(text, text, text) to anon, authenticated;
grant execute on function public.login_porra_user(text, text) to anon, authenticated;
grant execute on function public.save_porra_prediction(uuid, uuid, integer, integer, uuid) to anon, authenticated;
grant execute on function public.get_porra_predictions(uuid) to anon, authenticated;
grant select on public.porra_leaderboard to anon, authenticated;
grant select on public.porra_match_stats to anon, authenticated;

notify pgrst, 'reload schema';
