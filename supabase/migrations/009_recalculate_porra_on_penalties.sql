drop trigger if exists matches_recalculate_porra_predictions on public.matches;
create trigger matches_recalculate_porra_predictions
after update of status, home_score, away_score, home_penalty_score, away_penalty_score on public.matches
for each row execute function public.recalculate_porra_after_match_finished();

do $$
declare
  finished_match record;
begin
  for finished_match in
    select id
    from public.matches
    where status = 'finished'
  loop
    perform public.recalculate_porra_match_predictions(finished_match.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
