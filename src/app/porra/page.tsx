import { AppShell } from "@/components/app-shell";
import { PorraDashboard } from "@/components/porra-dashboard";
import { createServerSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { getPublicDataset } from "@/lib/public-data";

type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  points: number;
  exact_scores: number;
  predictions_count: number;
};

type MatchStats = {
  match_id: string;
  total_predictions: number;
  home_win_count: number;
  draw_count: number;
  away_win_count: number;
  top_scores: {
    score: string;
    count: number;
  }[];
};

export default async function PredictionPage() {
  const { matches, teams, players, groups, stages } = await getPublicDataset();
  const supabase = hasSupabaseConfig() ? createServerSupabaseClient() : null;

  const [{ data: leaderboard }, { data: stats }] = supabase
    ? await Promise.all([
        supabase
          .from("porra_leaderboard")
          .select("*")
          .order("points", { ascending: false })
          .returns<LeaderboardRow[]>(),
        supabase.from("porra_match_stats").select("*").returns<MatchStats[]>(),
      ])
    : [{ data: [] as LeaderboardRow[] }, { data: [] as MatchStats[] }];

  return (
    <AppShell>
      <PorraDashboard
        matches={matches}
        teams={teams}
        players={players}
        groups={groups}
        stages={stages}
        leaderboard={leaderboard || []}
        stats={stats || []}
      />
    </AppShell>
  );
}
