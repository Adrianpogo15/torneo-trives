-- Final initial data for Torneo Trives 2026.
-- Teams, groups, phases and crest URLs. Players and matches are added later from admin.

begin;

alter table public.teams
  add column if not exists logo_url text;

delete from public.matches
where tournament_id in (
  select id from public.tournaments where slug = 'torneo-trives-2026'
);

delete from public.players
where team_id between '20260000-0000-4000-8000-000000000101' and '20260000-0000-4000-8000-000000000112';

delete from public.tournaments
where slug = 'torneo-trives-2026';

insert into public.tournaments (id, name, slug, status)
values (
  '20260000-0000-4000-8000-000000000001',
  'Torneo Trives 2026',
  'torneo-trives-2026',
  'active'
);

insert into public.stages (id, tournament_id, name, type, order_index)
values
  ('20260000-0000-4000-8000-000000000011', '20260000-0000-4000-8000-000000000001', 'Fase de grupos', 'groups', 1),
  ('20260000-0000-4000-8000-000000000012', '20260000-0000-4000-8000-000000000001', 'Cuartos de final', 'knockout', 2),
  ('20260000-0000-4000-8000-000000000013', '20260000-0000-4000-8000-000000000001', 'Semifinales', 'knockout', 3),
  ('20260000-0000-4000-8000-000000000014', '20260000-0000-4000-8000-000000000001', 'Final', 'knockout', 4);

insert into public.groups (id, stage_id, name, order_index)
values
  ('20260000-0000-4000-8000-000000000021', '20260000-0000-4000-8000-000000000011', 'Grupo A', 1),
  ('20260000-0000-4000-8000-000000000022', '20260000-0000-4000-8000-000000000011', 'Grupo B', 2),
  ('20260000-0000-4000-8000-000000000023', '20260000-0000-4000-8000-000000000011', 'Grupo C', 3);

insert into public.teams (id, name, logo_url)
values
  ('20260000-0000-4000-8000-000000000101', 'Adegas Sotillo', '/team-crests/adegas-sotillo.png'),
  ('20260000-0000-4000-8000-000000000102', 'Coquetos FS', '/team-crests/coquetos-fs.png'),
  ('20260000-0000-4000-8000-000000000103', 'Inter de Mamis', '/team-crests/inter-de-mamis.png'),
  ('20260000-0000-4000-8000-000000000104', 'Viejas Glorias', '/team-crests/viejas-glorias.png'),
  ('20260000-0000-4000-8000-000000000105', 'Val do Sil', '/team-crests/val-do-sil.png'),
  ('20260000-0000-4000-8000-000000000106', 'Aston Birra', '/team-crests/aston-birra.png'),
  ('20260000-0000-4000-8000-000000000107', 'Aldente', '/team-crests/aldente.png'),
  ('20260000-0000-4000-8000-000000000108', 'Real Suciedad', '/team-crests/real-suciedad.png'),
  ('20260000-0000-4000-8000-000000000109', 'Rubesol', '/team-crests/rubesol.png'),
  ('20260000-0000-4000-8000-000000000110', 'Rio Mola', '/team-crests/rio-mola.png'),
  ('20260000-0000-4000-8000-000000000111', 'Fueraforma', '/team-crests/fueraforma.png'),
  ('20260000-0000-4000-8000-000000000112', 'Rayo de Valdeorras', '/team-crests/rayo-de-valdeorras.png')
on conflict (id) do update
set name = excluded.name, logo_url = excluded.logo_url, updated_at = now();

insert into public.tournament_teams (tournament_id, team_id)
select '20260000-0000-4000-8000-000000000001', id
from public.teams
where id between '20260000-0000-4000-8000-000000000101' and '20260000-0000-4000-8000-000000000112'
on conflict (tournament_id, team_id) do nothing;

insert into public.group_teams (group_id, team_id)
values
  ('20260000-0000-4000-8000-000000000021', '20260000-0000-4000-8000-000000000101'),
  ('20260000-0000-4000-8000-000000000021', '20260000-0000-4000-8000-000000000102'),
  ('20260000-0000-4000-8000-000000000021', '20260000-0000-4000-8000-000000000103'),
  ('20260000-0000-4000-8000-000000000021', '20260000-0000-4000-8000-000000000104'),
  ('20260000-0000-4000-8000-000000000022', '20260000-0000-4000-8000-000000000105'),
  ('20260000-0000-4000-8000-000000000022', '20260000-0000-4000-8000-000000000106'),
  ('20260000-0000-4000-8000-000000000022', '20260000-0000-4000-8000-000000000107'),
  ('20260000-0000-4000-8000-000000000022', '20260000-0000-4000-8000-000000000108'),
  ('20260000-0000-4000-8000-000000000023', '20260000-0000-4000-8000-000000000109'),
  ('20260000-0000-4000-8000-000000000023', '20260000-0000-4000-8000-000000000110'),
  ('20260000-0000-4000-8000-000000000023', '20260000-0000-4000-8000-000000000111'),
  ('20260000-0000-4000-8000-000000000023', '20260000-0000-4000-8000-000000000112')
on conflict (group_id, team_id) do nothing;

commit;
