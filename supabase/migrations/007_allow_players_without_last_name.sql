alter table public.players
  drop constraint if exists players_last_name_not_empty;

notify pgrst, 'reload schema';
