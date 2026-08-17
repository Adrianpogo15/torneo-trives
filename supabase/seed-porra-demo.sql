-- Demo data for the DNI-based porra.
-- Run after supabase/migrations/005_final_tournament_and_porra.sql.
-- If the tournament has no matches yet, this only creates sample users.

begin;

insert into public.porra_users (id, dni, display_name, password_hash)
values
  ('20260000-0000-4000-9000-000000000001'::uuid, '11111111A', 'Alba', extensions.crypt('torneo26demo', extensions.gen_salt('bf'))),
  ('20260000-0000-4000-9000-000000000002'::uuid, '22222222B', 'David', extensions.crypt('torneo26demo', extensions.gen_salt('bf'))),
  ('20260000-0000-4000-9000-000000000003'::uuid, '33333333C', 'Noa', extensions.crypt('torneo26demo', extensions.gen_salt('bf'))),
  ('20260000-0000-4000-9000-000000000004'::uuid, '44444444D', 'Martin', extensions.crypt('torneo26demo', extensions.gen_salt('bf'))),
  ('20260000-0000-4000-9000-000000000005'::uuid, '55555555E', 'Lara', extensions.crypt('torneo26demo', extensions.gen_salt('bf'))),
  ('20260000-0000-4000-9000-000000000006'::uuid, '66666666F', 'Roi', extensions.crypt('torneo26demo', extensions.gen_salt('bf')))
on conflict (dni) do update
set
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  updated_at = now();

with demo_users as (
  select id, row_number() over (order by display_name) as user_order
  from public.porra_users
  where dni in ('11111111A', '22222222B', '33333333C', '44444444D', '55555555E', '66666666F')
),
demo_matches as (
  select id, row_number() over (order by scheduled_at nulls last, id) as match_order
  from public.matches
  where tournament_id = '20260000-0000-4000-8000-000000000001'::uuid
    and status = 'scheduled'
  order by scheduled_at nulls last, id
  limit 8
),
demo_predictions as (
  select
    m.id as match_id,
    u.id as porra_user_id,
    ((m.match_order + u.user_order) % 5) as home_score,
    ((m.match_order + u.user_order + 2) % 4) as away_score
  from demo_matches m
  cross join demo_users u
)
insert into public.porra_predictions (
  match_id,
  porra_user_id,
  home_score,
  away_score,
  first_scorer_player_id,
  locked_at
)
select
  match_id,
  porra_user_id,
  home_score,
  away_score,
  null,
  null
from demo_predictions
on conflict (match_id, porra_user_id) do update
set
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  first_scorer_player_id = excluded.first_scorer_player_id,
  updated_at = now();

commit;
