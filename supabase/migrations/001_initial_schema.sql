-- Initial schema for Torneo Trives.
-- Run this file in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'user');
create type public.tournament_status as enum ('draft', 'active', 'finished');
create type public.stage_type as enum ('groups', 'knockout');
create type public.match_status as enum ('scheduled', 'in_progress', 'finished', 'cancelled');
create type public.match_event_type as enum ('goal', 'yellow_card', 'red_card', 'own_goal');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_empty check (length(trim(display_name)) > 0)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.tournament_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_name_not_empty check (length(trim(name)) > 0),
  constraint tournaments_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_not_empty check (length(trim(name)) > 0)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_first_name_not_empty check (length(trim(first_name)) > 0)
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  type public.stage_type not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stages_name_not_empty check (length(trim(name)) > 0),
  constraint stages_order_non_negative check (order_index >= 0),
  constraint stages_unique_order unique (tournament_id, order_index),
  constraint stages_unique_name unique (tournament_id, name)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_name_not_empty check (length(trim(name)) > 0),
  constraint groups_order_non_negative check (order_index >= 0),
  constraint groups_unique_order unique (stage_id, order_index),
  constraint groups_unique_name unique (stage_id, name)
);

create table public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint tournament_teams_unique unique (tournament_id, team_id)
);

create table public.group_teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint group_teams_unique unique (group_id, team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete restrict,
  group_id uuid references public.groups(id) on delete set null,
  home_team_id uuid references public.teams(id) on delete restrict,
  away_team_id uuid references public.teams(id) on delete restrict,
  scheduled_at timestamptz,
  home_score integer,
  away_score integer,
  status public.match_status not null default 'scheduled',
  round_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_different_teams check (
    home_team_id is null
    or away_team_id is null
    or home_team_id <> away_team_id
  ),
  constraint matches_scores_non_negative check (
    (home_score is null or home_score >= 0)
    and (away_score is null or away_score >= 0)
  ),
  constraint matches_finished_has_score check (
    status <> 'finished'
    or (home_score is not null and away_score is not null)
  )
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  player_id uuid references public.players(id) on delete set null,
  event_type public.match_event_type not null,
  minute integer not null,
  created_at timestamptz not null default now(),
  constraint match_events_minute_valid check (minute >= 0 and minute <= 130)
);

create table public.match_player_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint match_player_votes_one_per_user unique (match_id, user_id)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  points integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_one_per_user unique (match_id, user_id),
  constraint predictions_scores_non_negative check (home_score >= 0 and away_score >= 0),
  constraint predictions_points_non_negative check (points >= 0)
);

create index players_team_id_idx on public.players(team_id);
create index stages_tournament_id_idx on public.stages(tournament_id);
create index groups_stage_id_idx on public.groups(stage_id);
create index tournament_teams_tournament_id_idx on public.tournament_teams(tournament_id);
create index tournament_teams_team_id_idx on public.tournament_teams(team_id);
create index group_teams_group_id_idx on public.group_teams(group_id);
create index group_teams_team_id_idx on public.group_teams(team_id);
create index matches_tournament_id_idx on public.matches(tournament_id);
create index matches_stage_id_idx on public.matches(stage_id);
create index matches_group_id_idx on public.matches(group_id);
create index matches_scheduled_at_idx on public.matches(scheduled_at);
create index match_events_match_id_idx on public.match_events(match_id);
create index match_events_player_id_idx on public.match_events(player_id);
create index match_events_event_type_idx on public.match_events(event_type);
create index match_player_votes_match_id_idx on public.match_player_votes(match_id);
create index predictions_match_id_idx on public.predictions(match_id);
create index predictions_user_id_idx on public.predictions(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger stages_set_updated_at
before update on public.stages
for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Usuario'),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.match_has_player(target_match_id uuid, target_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.matches m
    join public.players p on p.id = target_player_id
    where m.id = target_match_id
      and p.team_id in (m.home_team_id, m.away_team_id)
  );
$$;

create or replace function public.validate_match_player_vote()
returns trigger
language plpgsql
as $$
begin
  if not public.match_has_player(new.match_id, new.player_id) then
    raise exception 'The voted player must belong to one of the teams in the match.';
  end if;

  return new;
end;
$$;

create trigger match_player_votes_validate_player
before insert or update on public.match_player_votes
for each row execute function public.validate_match_player_vote();

create or replace function public.validate_match_event()
returns trigger
language plpgsql
as $$
declare
  player_team_id uuid;
begin
  if not exists (
    select 1
    from public.matches m
    where m.id = new.match_id
      and new.team_id in (m.home_team_id, m.away_team_id)
  ) then
    raise exception 'The event team must be one of the teams in the match.';
  end if;

  if new.player_id is not null then
    select p.team_id into player_team_id
    from public.players p
    where p.id = new.player_id;

    if player_team_id is distinct from new.team_id then
      raise exception 'The event player must belong to the event team.';
    end if;
  end if;

  return new;
end;
$$;

create trigger match_events_validate
before insert or update on public.match_events
for each row execute function public.validate_match_event();

create or replace function public.validate_prediction_is_open()
returns trigger
language plpgsql
as $$
declare
  match_record public.matches%rowtype;
begin
  select * into match_record
  from public.matches
  where id = new.match_id;

  if match_record.status <> 'scheduled' then
    raise exception 'Predictions can only be edited while the match is scheduled.';
  end if;

  if match_record.scheduled_at is not null and match_record.scheduled_at <= now() then
    raise exception 'Predictions are closed for this match.';
  end if;

  if tg_op = 'INSERT' then
    new.points = 0;
  else
    new.points = old.points;
  end if;

  new.locked_at = case
    when match_record.scheduled_at is not null then match_record.scheduled_at
    else new.locked_at
  end;

  return new;
end;
$$;

create trigger predictions_validate_is_open
before insert or update of home_score, away_score on public.predictions
for each row execute function public.validate_prediction_is_open();

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
    points := points + 5;
  end if;

  return points;
end;
$$;

create or replace function public.recalculate_match_predictions(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record public.matches%rowtype;
begin
  select * into match_record
  from public.matches
  where id = target_match_id;

  if match_record.id is null then
    raise exception 'Match not found.';
  end if;

  if match_record.status <> 'finished' then
    raise exception 'Predictions can only be scored when the match is finished.';
  end if;

  update public.predictions p
  set
    points = public.calculate_prediction_points(
      p.home_score,
      p.away_score,
      match_record.home_score,
      match_record.away_score
    ),
    locked_at = coalesce(p.locked_at, now()),
    updated_at = now()
  where p.match_id = target_match_id;
end;
$$;

create or replace function public.recalculate_predictions_after_match_finished()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finished'
    and (
      old.status is distinct from new.status
      or old.home_score is distinct from new.home_score
      or old.away_score is distinct from new.away_score
    )
  then
    perform public.recalculate_match_predictions(new.id);
  end if;

  return new;
end;
$$;

create trigger matches_recalculate_predictions
after update of status, home_score, away_score on public.matches
for each row execute function public.recalculate_predictions_after_match_finished();

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.group_teams enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.match_player_votes enable row level security;
alter table public.predictions enable row level security;

create policy "Profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = 'user');

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read tournaments"
on public.tournaments for select
to anon, authenticated
using (true);

create policy "Public can read teams"
on public.teams for select
to anon, authenticated
using (true);

create policy "Public can read players"
on public.players for select
to anon, authenticated
using (true);

create policy "Public can read stages"
on public.stages for select
to anon, authenticated
using (true);

create policy "Public can read groups"
on public.groups for select
to anon, authenticated
using (true);

create policy "Public can read tournament teams"
on public.tournament_teams for select
to anon, authenticated
using (true);

create policy "Public can read group teams"
on public.group_teams for select
to anon, authenticated
using (true);

create policy "Public can read matches"
on public.matches for select
to anon, authenticated
using (true);

create policy "Public can read match events"
on public.match_events for select
to anon, authenticated
using (true);

create policy "Public can read player votes"
on public.match_player_votes for select
to anon, authenticated
using (true);

create policy "Users can vote once per match"
on public.match_player_votes for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own votes"
on public.match_player_votes for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own votes"
on public.match_player_votes for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read their own predictions"
on public.predictions for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Users can create their own predictions"
on public.predictions for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own predictions"
on public.predictions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own predictions"
on public.predictions for delete
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage tournaments"
on public.tournaments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage teams"
on public.teams for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage players"
on public.players for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage stages"
on public.stages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage groups"
on public.groups for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage tournament teams"
on public.tournament_teams for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage group teams"
on public.group_teams for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage matches"
on public.matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage match events"
on public.match_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage player votes"
on public.match_player_votes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage predictions"
on public.predictions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create view public.group_standings
with (security_invoker = true)
as
with played_matches as (
  select *
  from public.matches
  where status = 'finished'
    and group_id is not null
    and home_team_id is not null
    and away_team_id is not null
    and home_score is not null
    and away_score is not null
),
team_rows as (
  select
    group_id,
    home_team_id as team_id,
    home_score as goals_for,
    away_score as goals_against,
    case when home_score > away_score then 1 else 0 end as wins,
    case when home_score = away_score then 1 else 0 end as draws,
    case when home_score < away_score then 1 else 0 end as losses
  from played_matches
  union all
  select
    group_id,
    away_team_id as team_id,
    away_score as goals_for,
    home_score as goals_against,
    case when away_score > home_score then 1 else 0 end as wins,
    case when away_score = home_score then 1 else 0 end as draws,
    case when away_score < home_score then 1 else 0 end as losses
  from played_matches
)
select
  gt.group_id,
  gt.team_id,
  count(tr.team_id)::integer as played,
  coalesce(sum(tr.wins), 0)::integer as wins,
  coalesce(sum(tr.draws), 0)::integer as draws,
  coalesce(sum(tr.losses), 0)::integer as losses,
  coalesce(sum(tr.goals_for), 0)::integer as goals_for,
  coalesce(sum(tr.goals_against), 0)::integer as goals_against,
  coalesce(sum(tr.goals_for - tr.goals_against), 0)::integer as goal_difference,
  (coalesce(sum(tr.wins), 0) * 3 + coalesce(sum(tr.draws), 0))::integer as points
from public.group_teams gt
left join team_rows tr
  on tr.group_id = gt.group_id
 and tr.team_id = gt.team_id
group by gt.group_id, gt.team_id;

create view public.player_stats
with (security_invoker = true)
as
select
  p.id as player_id,
  p.team_id,
  count(me.id) filter (where me.event_type = 'goal')::integer as goals,
  count(me.id) filter (where me.event_type = 'yellow_card')::integer as yellow_cards,
  count(me.id) filter (where me.event_type = 'red_card')::integer as red_cards
from public.players p
left join public.match_events me on me.player_id = p.id
group by p.id, p.team_id;

create view public.prediction_standings
with (security_invoker = true)
as
select
  p.user_id,
  coalesce(sum(p.points), 0)::integer as points,
  count(*) filter (where p.points = 15)::integer as exact_scores,
  count(*)::integer as predictions_count
from public.predictions p
group by p.user_id;

grant usage on schema public to anon, authenticated;

grant select on
  public.tournaments,
  public.teams,
  public.players,
  public.stages,
  public.groups,
  public.tournament_teams,
  public.group_teams,
  public.matches,
  public.match_events,
  public.match_player_votes,
  public.group_standings,
  public.player_stats
to anon, authenticated;

grant select, insert, update, delete on
  public.match_player_votes,
  public.predictions
to authenticated;

grant select on
  public.profiles,
  public.prediction_standings
to authenticated;

grant insert, update, delete on
  public.tournaments,
  public.teams,
  public.players,
  public.stages,
  public.groups,
  public.tournament_teams,
  public.group_teams,
  public.matches,
  public.match_events,
  public.profiles
to authenticated;
