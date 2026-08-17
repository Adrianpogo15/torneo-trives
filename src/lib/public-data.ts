import {
  createServerSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/server";

export type Team = {
  id: string;
  name: string;
  logo_url?: string | null;
};

export type Player = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
};

export type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type Group = {
  id: string;
  name: string;
  order_index: number;
};

export type Stage = {
  id: string;
  name: string;
  type: "groups" | "knockout";
  order_index: number;
};

export type Match = {
  id: string;
  stage_id: string;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  scheduled_at: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  tiebreak_note?: string | null;
  status: string;
  round_label: string | null;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  event_type: "goal" | "yellow_card" | "red_card" | "own_goal";
  minute: number;
};

export type StandingRow = {
  group_id: string;
  team_id: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  card_points: number;
};

export type TeamWithPlayers = Team & {
  players: Player[];
  groupName: string;
};

export function formatPlayerName(player: Player) {
  return `${player.first_name} ${player.last_name}`.trim();
}

export function formatMatchDate(value: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function assertConfig() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createServerSupabaseClient();
}

export async function getTournament() {
  const supabase = assertConfig();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("tournaments")
    .select("id,name,slug,status")
    .eq("slug", "torneo-trives-2026")
    .maybeSingle<Tournament>();

  if (data) {
    return data;
  }

  const { data: fallback } = await supabase
    .from("tournaments")
    .select("id,name,slug,status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Tournament>();

  return fallback;
}

export async function getPublicDataset() {
  const supabase = assertConfig();
  const tournament = await getTournament();

  if (!supabase || !tournament) {
    return {
      tournament,
      teams: [] as Team[],
      players: [] as Player[],
      stages: [] as Stage[],
      groups: [] as Group[],
      matches: [] as Match[],
      events: [] as MatchEvent[],
      standings: [] as StandingRow[],
      groupTeams: [] as { group_id: string; team_id: string }[],
    };
  }

  const [
    tournamentTeamsResult,
    stagesResult,
    matchesResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("tournament_teams")
      .select("team_id")
      .eq("tournament_id", tournament.id),
    supabase
      .from("stages")
      .select("id,name,type,order_index")
      .eq("tournament_id", tournament.id)
      .order("order_index")
      .returns<Stage[]>(),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("scheduled_at", { ascending: true })
      .returns<Match[]>(),
    supabase
      .from("match_events")
      .select("*")
      .order("minute", { ascending: true })
      .returns<MatchEvent[]>(),
  ]);

  const teamIds = (tournamentTeamsResult.data || []).map((item) => item.team_id);
  const stages = stagesResult.data || [];
  const groupStageId = stages.find((stage) => stage.type === "groups")?.id;

  const [teamsResult, playersResult, groupsResult, groupTeamsResult, standingsResult] =
    await Promise.all([
      teamIds.length
        ? supabase.from("teams").select("*").in("id", teamIds).order("name").returns<Team[]>()
        : Promise.resolve({ data: [] as Team[] }),
      teamIds.length
        ? supabase
            .from("players")
            .select("*")
            .in("team_id", teamIds)
            .order("last_name")
            .returns<Player[]>()
        : Promise.resolve({ data: [] as Player[] }),
      groupStageId
        ? supabase
            .from("groups")
            .select("*")
            .eq("stage_id", groupStageId)
            .order("order_index")
            .returns<Group[]>()
        : Promise.resolve({ data: [] as Group[] }),
      groupStageId
        ? supabase
            .from("group_teams")
            .select("group_id,team_id")
            .returns<{ group_id: string; team_id: string }[]>()
        : Promise.resolve({ data: [] as { group_id: string; team_id: string }[] }),
      supabase.from("group_standings").select("*").returns<StandingRow[]>(),
    ]);

  const matches = matchesResult.data || [];
  const events = (eventsResult.data || []).filter((event) =>
    matches.some((match) => match.id === event.match_id)
  );
  const cardPoints = events.reduce<Record<string, number>>((acc, event) => {
    if (event.event_type === "yellow_card") {
      acc[event.team_id] = (acc[event.team_id] || 0) + 1;
    }

    if (event.event_type === "red_card") {
      acc[event.team_id] = (acc[event.team_id] || 0) + 2;
    }

    return acc;
  }, {});

  return {
    tournament,
    teams: teamsResult.data || [],
    players: playersResult.data || [],
    stages,
    groups: groupsResult.data || [],
    matches,
    events,
    groupTeams: groupTeamsResult.data || [],
    standings: (standingsResult.data || [])
      .filter((row) => (groupsResult.data || []).some((group) => group.id === row.group_id))
      .map((row) => ({
        ...row,
        card_points: cardPoints[row.team_id] || 0,
      })),
  };
}

export function getTeamName(teams: Team[], teamId: string | null) {
  if (!teamId) {
    return "Por definir";
  }

  return teams.find((team) => team.id === teamId)?.name || "Equipo";
}

export function getGroupedTeams(
  teams: Team[],
  players: Player[],
  groups: Group[],
  groupTeams: { group_id: string; team_id: string }[]
) {
  return teams.map<TeamWithPlayers>((team) => {
    const group = groups.find((item) =>
      groupTeams.some((row) => row.group_id === item.id && row.team_id === team.id)
    );

    return {
      ...team,
      groupName: group?.name || "Sin grupo",
      players: players.filter((player) => player.team_id === team.id),
    };
  });
}

function directMatchComparison(a: StandingRow, b: StandingRow, matches: Match[]) {
  const directMatch = matches.find((match) => {
    const sameGroup = match.group_id === a.group_id;
    const sameTeams =
      (match.home_team_id === a.team_id && match.away_team_id === b.team_id) ||
      (match.home_team_id === b.team_id && match.away_team_id === a.team_id);

    return sameGroup && sameTeams && match.status === "finished";
  });

  if (
    !directMatch ||
    directMatch.home_team_id == null ||
    directMatch.away_team_id == null ||
    directMatch.home_score == null ||
    directMatch.away_score == null
  ) {
    return 0;
  }

  const aIsHome = directMatch.home_team_id === a.team_id;
  const aScore = aIsHome ? directMatch.home_score : directMatch.away_score;
  const bScore = aIsHome ? directMatch.away_score : directMatch.home_score;

  if (aScore !== bScore) {
    return bScore - aScore;
  }

  if (
    directMatch.home_penalty_score != null &&
    directMatch.away_penalty_score != null &&
    directMatch.home_penalty_score !== directMatch.away_penalty_score
  ) {
    const aPenaltyScore = aIsHome
      ? directMatch.home_penalty_score
      : directMatch.away_penalty_score;
    const bPenaltyScore = aIsHome
      ? directMatch.away_penalty_score
      : directMatch.home_penalty_score;

    return bPenaltyScore - aPenaltyScore;
  }

  return 0;
}

export function sortStandings(rows: StandingRow[], matches: Match[] = []) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const directComparison = directMatchComparison(a, b, matches);
    if (directComparison !== 0) return directComparison;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (a.card_points !== b.card_points) return a.card_points - b.card_points;
    return 0;
  });
}

export function sortBestThirds(rows: StandingRow[]) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (a.card_points !== b.card_points) return a.card_points - b.card_points;
    return 0;
  });
}
