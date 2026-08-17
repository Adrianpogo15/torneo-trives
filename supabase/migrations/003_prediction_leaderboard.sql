create or replace view public.prediction_leaderboard
with (security_invoker = false)
as
select
  p.user_id,
  pr.display_name,
  coalesce(sum(p.points), 0)::integer as points,
  count(*) filter (where p.points = 15)::integer as exact_scores,
  count(*)::integer as predictions_count
from public.predictions p
join public.profiles pr on pr.id = p.user_id
group by p.user_id, pr.display_name;

grant select on public.prediction_leaderboard to anon, authenticated;
