create or replace view public.prediction_match_stats
with (security_invoker = false)
as
with base as (
  select
    p.match_id,
    p.home_score,
    p.away_score,
    (p.home_score::text || '-' || p.away_score::text) as score_label
  from public.predictions p
),
score_counts as (
  select
    match_id,
    score_label,
    count(*)::integer as prediction_count
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
        jsonb_build_object(
          'score', rs.score_label,
          'count', rs.prediction_count
        )
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

grant select on public.prediction_match_stats to anon, authenticated;
