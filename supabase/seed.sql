-- Initial seed data for local development or first Supabase setup.

insert into public.tournaments (name, slug, status)
values ('Torneo Trives', 'torneo-trives', 'draft')
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();

with tournament as (
  select id
  from public.tournaments
  where slug = 'torneo-trives'
)
insert into public.stages (tournament_id, name, type, order_index)
select tournament.id, stage.name, stage.type::public.stage_type, stage.order_index
from tournament
cross join (
  values
    ('Fase de grupos', 'groups', 1),
    ('Cuartos de final', 'knockout', 2),
    ('Semifinal', 'knockout', 3),
    ('Final', 'knockout', 4)
) as stage(name, type, order_index)
on conflict (tournament_id, name) do update
set
  type = excluded.type,
  order_index = excluded.order_index,
  updated_at = now();
