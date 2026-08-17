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

  if match_record.id is null then
    return;
  end if;

  if match_record.status <> 'finished' then
    update public.porra_predictions p
    set
      points = 0,
      locked_at = match_record.scheduled_at,
      updated_at = now()
    where p.match_id = target_match_id;

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

create or replace function public.reset_porra_prediction(
  porra_user_id_input uuid,
  match_id_input uuid
)
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

  delete from public.porra_predictions
  where porra_user_id = porra_user_id_input
    and match_id = match_id_input;
end;
$$;

do $$
declare
  changed_match record;
begin
  for changed_match in
    select id
    from public.matches
    where status <> 'finished'
  loop
    perform public.recalculate_porra_match_predictions(changed_match.id);
  end loop;
end;
$$;

grant execute on function public.reset_porra_prediction(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
