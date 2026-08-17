"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Edit3,
  Layers3,
  ListTree,
  Play,
  Plus,
  RefreshCcw,
  SquareCheckBig,
  Trophy,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Tab = "teams" | "players" | "matches" | "events" | "structure";
type MatchStatus = "scheduled" | "in_progress" | "finished" | "cancelled";
type EventType = "goal" | "yellow_card" | "red_card" | "own_goal";

type Tournament = {
  id: string;
  name: string;
  slug: string;
};

type Team = {
  id: string;
  name: string;
  logo_url: string | null;
};

type Player = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
};

type Stage = {
  id: string;
  name: string;
  type: "groups" | "knockout";
  order_index: number;
};

type Group = {
  id: string;
  stage_id: string;
  name: string;
  order_index: number;
};

type GroupTeam = {
  id: string;
  group_id: string;
  team_id: string;
};

type Match = {
  id: string;
  tournament_id: string;
  stage_id: string;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  scheduled_at: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
  tiebreak_note: string | null;
  status: MatchStatus;
  round_label: string | null;
};

type MatchEvent = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  event_type: EventType;
  minute: number;
};

type TeamForm = {
  id: string | null;
  name: string;
  group_id: string;
  logo_url: string;
};

type PlayerForm = {
  id: string | null;
  team_id: string;
  first_name: string;
  last_name: string;
};

type MatchForm = {
  id: string | null;
  stage_id: string;
  group_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  home_score: string;
  away_score: string;
  status: MatchStatus;
  round_label: string;
};

type PenaltyForm = {
  match_id: string;
  home_penalty_score: string;
  away_penalty_score: string;
};

type StageForm = {
  id: string | null;
  name: string;
  type: Stage["type"];
  order_index: string;
};

type GroupForm = {
  id: string | null;
  stage_id: string;
  name: string;
  order_index: string;
};

type EventForm = {
  id: string | null;
  match_id: string;
  team_id: string;
  player_id: string;
  event_type: EventType;
  minute: string;
};

const emptyTeamForm: TeamForm = { id: null, name: "", group_id: "", logo_url: "" };
const emptyPlayerForm: PlayerForm = {
  id: null,
  team_id: "",
  first_name: "",
  last_name: "",
};
const emptyMatchForm: MatchForm = {
  id: null,
  stage_id: "",
  group_id: "",
  home_team_id: "",
  away_team_id: "",
  scheduled_at: "",
  home_score: "",
  away_score: "",
  status: "scheduled",
  round_label: "",
};
const emptyPenaltyForm: PenaltyForm = {
  match_id: "",
  home_penalty_score: "",
  away_penalty_score: "",
};
const emptyEventForm: EventForm = {
  id: null,
  match_id: "",
  team_id: "",
  player_id: "",
  event_type: "goal",
  minute: "",
};
const emptyStageForm: StageForm = {
  id: null,
  name: "",
  type: "groups",
  order_index: "",
};
const emptyGroupForm: GroupForm = {
  id: null,
  stage_id: "",
  name: "",
  order_index: "",
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function formatTeamName(teams: Team[], teamId: string | null) {
  return teams.find((team) => team.id === teamId)?.name || "Por definir";
}

function formatPlayerName(players: Player[], playerId: string | null) {
  const player = players.find((item) => item.id === playerId);
  return player ? `${player.first_name} ${player.last_name}` : "Sin jugador";
}

function formatMatchName(matches: Match[], teams: Team[], matchId: string) {
  const match = matches.find((item) => item.id === matchId);
  if (!match) return "Partido";
  return `${match.round_label || "Partido"} - ${formatTeamName(
    teams,
    match.home_team_id
  )} vs ${formatTeamName(teams, match.away_team_id)}`;
}

function scoreText(match: Match) {
  if (match.home_score == null || match.away_score == null) return "Sin resultado";
  return `${match.home_score} - ${match.away_score}`;
}

function matchStatusLabel(status: MatchStatus) {
  const labels: Record<MatchStatus, string> = {
    scheduled: "Programado",
    in_progress: "En juego",
    finished: "Finalizado",
    cancelled: "Cancelado",
  };

  return labels[status];
}

function eventTypeLabel(type: EventType) {
  const labels: Record<EventType, string> = {
    goal: "Gol",
    own_goal: "Gol propia",
    yellow_card: "Tarjeta amarilla",
    red_card: "Tarjeta roja",
  };

  return labels[type];
}

function Modal({
  title,
  subtitle,
  message,
  error,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  message?: string | null;
  error?: string | null;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl animate-modal-in overflow-hidden rounded border border-line bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-black uppercase">{title}</h2>
            {subtitle ? <p className="text-xs text-ink/55">{subtitle}</p> : null}
          </div>
          <button
            aria-label="Cerrar"
            className="rounded p-2 hover:bg-fog"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">
          {message ? (
            <div className="mb-4 rounded border border-gold-400 bg-gold-50 px-4 py-3 text-sm text-ink">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

type ConfirmAction = {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
};

function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase text-ink/55">
        {label}
      </span>
      <input
        className="w-full rounded border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-gold-500"
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AdminSelect({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase text-ink/55">
        {label}
      </span>
      <select
        className="w-full rounded border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gold-500"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function SubmitButton({
  editing,
  loading,
}: {
  editing: boolean;
  loading: boolean;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2.5 text-sm font-black uppercase text-gold-400 transition hover:bg-asphalt disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      <Plus size={16} aria-hidden="true" />
      {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
    </button>
  );
}

export function AdminDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activeTab, setActiveTab] = useState<Tab>("teams");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTeams, setGroupTeams] = useState<GroupTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(emptyPlayerForm);
  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatchForm);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm);
  const [penaltyForm, setPenaltyForm] = useState<PenaltyForm>(emptyPenaltyForm);
  const [stageForm, setStageForm] = useState<StageForm>(emptyStageForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [playerModalTeamId, setPlayerModalTeamId] = useState<string | null>(null);
  const [playerListTeamId, setPlayerListTeamId] = useState<string | null>(null);
  const [eventModalMatchId, setEventModalMatchId] = useState<string | null>(null);
  const [eventListMatchId, setEventListMatchId] = useState<string | null>(null);
  const [penaltyModalMatchId, setPenaltyModalMatchId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const groupStage = stages.find((stage) => stage.type === "groups");
  const filteredGroups = matchForm.stage_id
    ? groups.filter((group) => group.stage_id === matchForm.stage_id)
    : groups;
  const matchTeamOptions = matchForm.group_id
    ? teams.filter((team) =>
        groupTeams.some(
          (groupTeam) =>
            groupTeam.group_id === matchForm.group_id && groupTeam.team_id === team.id
        )
      )
    : teams;
  const selectedMatch = matches.find((match) => match.id === eventForm.match_id);
  const eventTeams = selectedMatch
    ? teams.filter(
        (team) =>
          team.id === selectedMatch.home_team_id || team.id === selectedMatch.away_team_id
      )
    : teams;
  const eventPlayers = eventForm.team_id
    ? players.filter((player) => player.team_id === eventForm.team_id)
    : players;
  const playerModalTeam = teams.find((team) => team.id === playerModalTeamId);
  const playerListTeam = teams.find((team) => team.id === playerListTeamId);
  const eventModalMatch = matches.find((match) => match.id === eventModalMatchId);
  const eventListMatch = matches.find((match) => match.id === eventListMatchId);
  const penaltyModalMatch = matches.find((match) => match.id === penaltyModalMatchId);

  async function loadData() {
    setLoading(true);
    setError(null);

    const { data: tournaments, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id,name,slug")
      .order("created_at", { ascending: false })
      .returns<Tournament[]>();

    if (tournamentError) {
      setError(tournamentError.message);
      setLoading(false);
      return;
    }

    const currentTournament =
      tournaments?.find((item) => item.slug === "torneo-trives-2026") ||
      tournaments?.[0] ||
      null;

    setTournament(currentTournament);

    if (!currentTournament) {
      setLoading(false);
      return;
    }

    const [
      stagesResult,
      tournamentTeamsResult,
      groupsResult,
      playersResult,
      matchesResult,
      eventsResult,
      groupTeamsResult,
    ] = await Promise.all([
      supabase
        .from("stages")
        .select("*")
        .eq("tournament_id", currentTournament.id)
        .order("order_index")
        .returns<Stage[]>(),
      supabase
        .from("tournament_teams")
        .select("team_id")
        .eq("tournament_id", currentTournament.id),
      supabase.from("groups").select("*").order("order_index").returns<Group[]>(),
      supabase
        .from("players")
        .select("*")
        .order("last_name")
        .returns<Player[]>(),
      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", currentTournament.id)
        .order("scheduled_at", { ascending: true })
        .returns<Match[]>(),
      supabase
        .from("match_events")
        .select("*")
        .order("minute")
        .returns<MatchEvent[]>(),
      supabase
        .from("group_teams")
        .select("*")
        .returns<GroupTeam[]>(),
    ]);

    const teamIds = (tournamentTeamsResult.data || []).map((item) => item.team_id);
    const teamsResult = teamIds.length
      ? await supabase
          .from("teams")
          .select("*")
          .in("id", teamIds)
          .order("name")
          .returns<Team[]>()
      : { data: [] as Team[], error: null };

    const firstError =
      stagesResult.error ||
      tournamentTeamsResult.error ||
      groupsResult.error ||
      playersResult.error ||
      matchesResult.error ||
      eventsResult.error ||
      groupTeamsResult.error ||
      teamsResult.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      setStages(stagesResult.data || []);
      setGroups((groupsResult.data || []).filter((group) =>
        (stagesResult.data || []).some((stage) => stage.id === group.stage_id)
      ));
      setTeams(teamsResult.data || []);
      setPlayers((playersResult.data || []).filter((player) =>
        teamIds.includes(player.team_id)
      ));
      setMatches(matchesResult.data || []);
      setEvents((eventsResult.data || []).filter((event) =>
        (matchesResult.data || []).some((match) => match.id === event.match_id)
      ));
      setGroupTeams(groupTeamsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showSaved(text: string) {
    setMessage(text);
    setError(null);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function requestConfirm(action: ConfirmAction) {
    setConfirmAction(action);
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;
    setSaving(true);
    setError(null);

    const teamPayload = {
      name: teamForm.name.trim(),
      logo_url: teamForm.logo_url.trim() || null,
    };

    if (teamForm.id) {
      const { error: updateError } = await supabase
        .from("teams")
        .update(teamPayload)
        .eq("id", teamForm.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      await supabase.from("group_teams").delete().eq("team_id", teamForm.id);

      if (teamForm.group_id) {
        const { error: groupError } = await supabase
          .from("group_teams")
          .insert({ group_id: teamForm.group_id, team_id: teamForm.id });
        if (groupError) setError(groupError.message);
      }
    } else {
      const { data: newTeam, error: insertError } = await supabase
        .from("teams")
        .insert(teamPayload)
        .select("id,name,logo_url")
        .single<Team>();

      if (insertError || !newTeam) {
        setError(insertError?.message || "No se pudo crear el equipo.");
        setSaving(false);
        return;
      }

      const { error: tournamentTeamError } = await supabase
        .from("tournament_teams")
        .insert({ tournament_id: tournament.id, team_id: newTeam.id });

      if (tournamentTeamError) {
        setError(tournamentTeamError.message);
        setSaving(false);
        return;
      }

      if (teamForm.group_id) {
        const { error: groupError } = await supabase
          .from("group_teams")
          .insert({ group_id: teamForm.group_id, team_id: newTeam.id });
        if (groupError) setError(groupError.message);
      }
    }

    setTeamForm(emptyTeamForm);
    setSaving(false);
    await loadData();
    showSaved("Equipo guardado.");
  }

  async function deleteTeam(team: Team) {
    const { error: deleteError } = await supabase.from("teams").delete().eq("id", team.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadData();
    showSaved("Equipo eliminado.");
  }

  async function savePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const returnToTeamId = playerForm.team_id;

    const payload = {
      team_id: playerForm.team_id,
      first_name: playerForm.first_name.trim(),
      last_name: playerForm.last_name.trim(),
    };

    const result = playerForm.id
      ? await supabase.from("players").update(payload).eq("id", playerForm.id)
      : await supabase.from("players").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPlayerForm(emptyPlayerForm);
    setPlayerModalTeamId(null);
    await loadData();
    setPlayerListTeamId(returnToTeamId);
    showSaved("Jugador guardado.");
  }

  async function deletePlayer(player: Player) {
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", player.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadData();
    showSaved("Jugador eliminado.");
  }

  async function saveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;
    setSaving(true);
    setError(null);

    const payload = {
      tournament_id: tournament.id,
      name: stageForm.name.trim(),
      type: stageForm.type,
      order_index: Number(stageForm.order_index || 0),
    };

    const result = stageForm.id
      ? await supabase.from("stages").update(payload).eq("id", stageForm.id)
      : await supabase.from("stages").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setStageForm(emptyStageForm);
    await loadData();
    showSaved("Fase guardada.");
  }

  async function deleteStage(stage: Stage) {
    const { error: deleteError } = await supabase
      .from("stages")
      .delete()
      .eq("id", stage.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadData();
    showSaved("Fase eliminada.");
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      stage_id: groupForm.stage_id,
      name: groupForm.name.trim(),
      order_index: Number(groupForm.order_index || 0),
    };

    const result = groupForm.id
      ? await supabase.from("groups").update(payload).eq("id", groupForm.id)
      : await supabase.from("groups").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setGroupForm(emptyGroupForm);
    await loadData();
    showSaved("Grupo guardado.");
  }

  async function deleteGroup(group: Group) {
    const { error: deleteError } = await supabase
      .from("groups")
      .delete()
      .eq("id", group.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadData();
    showSaved("Grupo eliminado.");
  }

  async function saveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;
    setSaving(true);
    setError(null);

    const payload = {
      tournament_id: tournament.id,
      stage_id: matchForm.stage_id,
      group_id: matchForm.group_id || null,
      home_team_id: matchForm.home_team_id || null,
      away_team_id: matchForm.away_team_id || null,
      scheduled_at: matchForm.scheduled_at
        ? new Date(matchForm.scheduled_at).toISOString()
        : null,
      home_score: toNullableNumber(matchForm.home_score),
      away_score: toNullableNumber(matchForm.away_score),
      status: matchForm.status,
      round_label: matchForm.round_label.trim() || null,
    };

    const result = matchForm.id
      ? await supabase.from("matches").update(payload).eq("id", matchForm.id)
      : await supabase.from("matches").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setMatchForm(emptyMatchForm);
    await loadData();
    showSaved("Partido guardado.");
  }

  async function recalculateMatchScore(matchId: string) {
    const match = matches.find((item) => item.id === matchId);

    if (!match || !match.home_team_id || !match.away_team_id) {
      return;
    }

    const { data: matchEvents, error: eventsError } = await supabase
      .from("match_events")
      .select("team_id,event_type")
      .eq("match_id", matchId)
      .returns<Pick<MatchEvent, "team_id" | "event_type">[]>();

    if (eventsError) {
      setError(eventsError.message);
      return;
    }

    const initialScore = { home: 0, away: 0 };
    const calculatedScore = (matchEvents || []).reduce((score, item) => {
      if (item.event_type === "goal") {
        if (item.team_id === match.home_team_id) score.home += 1;
        if (item.team_id === match.away_team_id) score.away += 1;
      }

      if (item.event_type === "own_goal") {
        if (item.team_id === match.home_team_id) score.away += 1;
        if (item.team_id === match.away_team_id) score.home += 1;
      }

      return score;
    }, initialScore);

    const { error: scoreError } = await supabase
      .from("matches")
      .update({
        home_score: calculatedScore.home,
        away_score: calculatedScore.away,
      })
      .eq("id", matchId);

    if (scoreError) {
      setError(scoreError.message);
    }
  }

  async function deleteMatch(match: Match) {
    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", match.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadData();
    showSaved("Partido eliminado.");
  }

  async function updateMatchStatus(match: Match, status: MatchStatus) {
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status,
        home_score: status === "in_progress" && match.home_score == null ? 0 : match.home_score,
        away_score: status === "in_progress" && match.away_score == null ? 0 : match.away_score,
      })
      .eq("id", match.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
    showSaved(
      status === "in_progress"
        ? "Partido iniciado."
        : status === "finished"
          ? "Partido finalizado."
          : "Partido actualizado."
    );
  }

  async function savePenalties(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        home_penalty_score: toNullableNumber(penaltyForm.home_penalty_score),
        away_penalty_score: toNullableNumber(penaltyForm.away_penalty_score),
      })
      .eq("id", penaltyForm.match_id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPenaltyForm(emptyPenaltyForm);
    setPenaltyModalMatchId(null);
    await loadData();
    showSaved("Penaltis guardados.");
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const returnToMatchId = eventForm.match_id;
    const previousEvent = eventForm.id
      ? events.find((item) => item.id === eventForm.id)
      : null;

    const payload = {
      match_id: eventForm.match_id,
      team_id: eventForm.team_id,
      player_id: eventForm.player_id || null,
      event_type: eventForm.event_type,
      minute: Number(eventForm.minute),
    };

    const result = eventForm.id
      ? await supabase.from("match_events").update(payload).eq("id", eventForm.id)
      : await supabase.from("match_events").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (
      eventForm.event_type === "goal" ||
      eventForm.event_type === "own_goal" ||
      previousEvent?.event_type === "goal" ||
      previousEvent?.event_type === "own_goal"
    ) {
      if (previousEvent && previousEvent.match_id !== eventForm.match_id) {
        await recalculateMatchScore(previousEvent.match_id);
      }
      await recalculateMatchScore(eventForm.match_id);
    }

    setEventForm(emptyEventForm);
    setEventModalMatchId(null);
    await loadData();
    setEventListMatchId(returnToMatchId);
    showSaved("Evento guardado.");
  }

  async function deleteEvent(matchEvent: MatchEvent) {
    const { error: deleteError } = await supabase
      .from("match_events")
      .delete()
      .eq("id", matchEvent.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (matchEvent.event_type === "goal" || matchEvent.event_type === "own_goal") {
      await recalculateMatchScore(matchEvent.match_id);
    }
    await loadData();
    showSaved("Evento eliminado.");
  }

  const tabs = [
    { id: "teams" as const, label: "Equipos", icon: UsersRound },
    { id: "matches" as const, label: "Partidos", icon: CalendarDays },
    { id: "structure" as const, label: "Fases y grupos", icon: Layers3 },
  ];

  if (loading) {
    return (
      <div className="rounded border border-line bg-white p-5 text-sm text-ink/60">
        Cargando gestion...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white p-4">
        <div>
          <p className="text-xs font-black uppercase text-gold-700">Torneo activo</p>
          <p className="font-black">{tournament?.name || "Sin torneo"}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm font-bold hover:border-ink"
          onClick={() => void loadData()}
          type="button"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Recargar
        </button>
      </div>

      {message ? (
        <div className="rounded border border-gold-400 bg-gold-50 px-4 py-3 text-sm text-ink">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`inline-flex items-center justify-center gap-2 rounded px-3 py-3 text-sm font-black uppercase transition ${
                selected
                  ? "bg-ink text-gold-400"
                  : "border border-line bg-white text-ink/70 hover:border-ink"
              }`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon size={17} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "teams" ? (
        <section className="grid gap-5 lg:grid-cols-[24rem_1fr]">
          <form className="rounded border border-line bg-white p-5" onSubmit={saveTeam}>
            <h2 className="mb-4 text-lg font-black uppercase">
              {teamForm.id ? "Editar equipo" : "Crear equipo"}
            </h2>
            <div className="space-y-4">
              <AdminInput
                label="Nombre"
                required
                value={teamForm.name}
                onChange={(name) => setTeamForm((current) => ({ ...current, name }))}
              />
              <AdminInput
                label="Escudo"
                placeholder="/team-crests/adegas-sotillo.png"
                value={teamForm.logo_url}
                onChange={(logo_url) =>
                  setTeamForm((current) => ({ ...current, logo_url }))
                }
              />
              <AdminSelect
                label="Grupo"
                value={teamForm.group_id}
                onChange={(group_id) => setTeamForm((current) => ({ ...current, group_id }))}
              >
                <option value="">Sin grupo</option>
                {groups
                  .filter((group) => !groupStage || group.stage_id === groupStage.id)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </AdminSelect>
              <div className="flex gap-2">
                <SubmitButton editing={Boolean(teamForm.id)} loading={saving} />
                {teamForm.id ? (
                  <button
                    className="rounded border border-line px-3 py-2 text-sm font-bold"
                    onClick={() => setTeamForm(emptyTeamForm)}
                    type="button"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="rounded border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-black uppercase">Equipos</h2>
            <div className="space-y-2">
              {teams.map((team) => {
                const groupTeam = groupTeams.find((item) => item.team_id === team.id);
                const group = groups.find((item) => item.id === groupTeam?.group_id);

                return (
                  <div
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded bg-fog">
                        {team.logo_url ? (
                          <img
                            alt=""
                            className="h-9 w-9 object-contain"
                            src={team.logo_url}
                          />
                        ) : (
                          <UsersRound size={20} aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{team.name}</p>
                      <p className="text-xs text-ink/50">
                        {group?.name || "Sin grupo"} -{" "}
                        {players.filter((player) => player.team_id === team.id).length} jugadores
                      </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded bg-gold-400 px-2.5 py-2 text-xs font-black uppercase text-ink hover:bg-gold-300"
                        onClick={() => {
                          setPlayerForm({
                            ...emptyPlayerForm,
                            team_id: team.id,
                          });
                          setPlayerModalTeamId(team.id);
                        }}
                        type="button"
                      >
                        <Plus size={14} aria-hidden="true" />
                        Jugador
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded bg-fog px-2.5 py-2 text-xs font-black uppercase hover:bg-gold-50"
                        onClick={() => setPlayerListTeamId(team.id)}
                        type="button"
                      >
                        <UsersRound size={14} aria-hidden="true" />
                        Plantilla
                      </button>
                      <button
                        className="rounded bg-fog p-2 hover:bg-gold-50"
                        onClick={() =>
                          setTeamForm({
                            id: team.id,
                            name: team.name,
                            group_id: groupTeam?.group_id || "",
                            logo_url: team.logo_url || "",
                          })
                        }
                        type="button"
                      >
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        onClick={() =>
                          requestConfirm({
                            title: "Eliminar equipo",
                            body: `¿Seguro que quieres eliminar ${team.name}? Tambien se eliminaran sus jugadores.`,
                            confirmLabel: "Eliminar equipo",
                            onConfirm: () => deleteTeam(team),
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "players" ? (
        <section className="grid gap-5 lg:grid-cols-[24rem_1fr]">
          <form className="rounded border border-line bg-white p-5" onSubmit={savePlayer}>
            <h2 className="mb-4 text-lg font-black uppercase">
              {playerForm.id ? "Editar jugador" : "Crear jugador"}
            </h2>
            <div className="space-y-4">
              <AdminSelect
                label="Equipo"
                required
                value={playerForm.team_id}
                onChange={(team_id) => setPlayerForm((current) => ({ ...current, team_id }))}
              >
                <option value="">Selecciona equipo</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminInput
                label="Nombre"
                required
                value={playerForm.first_name}
                onChange={(first_name) =>
                  setPlayerForm((current) => ({ ...current, first_name }))
                }
              />
              <AdminInput
                label="Apellidos"
                required
                value={playerForm.last_name}
                onChange={(last_name) =>
                  setPlayerForm((current) => ({ ...current, last_name }))
                }
              />
              <div className="flex gap-2">
                <SubmitButton editing={Boolean(playerForm.id)} loading={saving} />
                {playerForm.id ? (
                  <button
                    className="rounded border border-line px-3 py-2 text-sm font-bold"
                    onClick={() => setPlayerForm(emptyPlayerForm)}
                    type="button"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="rounded border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-black uppercase">Jugadores</h2>
            <div className="max-h-[40rem] space-y-2 overflow-y-auto pr-1">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                >
                  <div>
                    <p className="font-bold">
                      {player.first_name} {player.last_name}
                    </p>
                    <p className="text-xs text-ink/50">
                      {formatTeamName(teams, player.team_id)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-fog p-2 hover:bg-gold-50"
                      onClick={() =>
                        setPlayerForm({
                          id: player.id,
                          team_id: player.team_id,
                          first_name: player.first_name,
                          last_name: player.last_name,
                        })
                      }
                      type="button"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      onClick={() =>
                        requestConfirm({
                          title: "Eliminar jugador",
                          body: `¿Seguro que quieres eliminar ${player.first_name} ${player.last_name}?`,
                          confirmLabel: "Eliminar jugador",
                          onConfirm: () => deletePlayer(player),
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "matches" ? (
        <section className="grid gap-5 xl:grid-cols-[26rem_1fr]">
          <form className="rounded border border-line bg-white p-5" onSubmit={saveMatch}>
            <h2 className="mb-4 text-lg font-black uppercase">
              {matchForm.id ? "Editar partido" : "Crear partido"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <AdminSelect
                label="Fase"
                required
                value={matchForm.stage_id}
                onChange={(stage_id) =>
                  setMatchForm((current) => ({
                    ...current,
                    stage_id,
                    group_id: "",
                    home_team_id: "",
                    away_team_id: "",
                  }))
                }
              >
                <option value="">Selecciona fase</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label="Grupo"
                value={matchForm.group_id}
                onChange={(group_id) =>
                  setMatchForm((current) => ({
                    ...current,
                    group_id,
                    home_team_id: "",
                    away_team_id: "",
                  }))
                }
              >
                <option value="">Sin grupo</option>
                {filteredGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label="Equipo local"
                value={matchForm.home_team_id}
                onChange={(home_team_id) =>
                  setMatchForm((current) => ({ ...current, home_team_id }))
                }
              >
                <option value="">Por definir</option>
                {matchTeamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label="Equipo visitante"
                value={matchForm.away_team_id}
                onChange={(away_team_id) =>
                  setMatchForm((current) => ({ ...current, away_team_id }))
                }
              >
                <option value="">Por definir</option>
                {matchTeamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminInput
                label="Fecha y hora"
                type="datetime-local"
                value={matchForm.scheduled_at}
                onChange={(scheduled_at) =>
                  setMatchForm((current) => ({ ...current, scheduled_at }))
                }
              />
              <AdminSelect
                label="Estado"
                value={matchForm.status}
                onChange={(status) =>
                  setMatchForm((current) => ({ ...current, status: status as MatchStatus }))
                }
              >
                <option value="scheduled">Programado</option>
                <option value="in_progress">En juego</option>
                <option value="finished">Finalizado</option>
                <option value="cancelled">Cancelado</option>
              </AdminSelect>
              <AdminInput
                label="Goles local"
                type="number"
                value={matchForm.home_score}
                onChange={(home_score) =>
                  setMatchForm((current) => ({ ...current, home_score }))
                }
              />
              <AdminInput
                label="Goles visitante"
                type="number"
                value={matchForm.away_score}
                onChange={(away_score) =>
                  setMatchForm((current) => ({ ...current, away_score }))
                }
              />
              <AdminInput
                label="Etiqueta"
                placeholder="Grupo A - Jornada 1"
                value={matchForm.round_label}
                onChange={(round_label) =>
                  setMatchForm((current) => ({ ...current, round_label }))
                }
              />
              <div className="flex gap-2">
                <SubmitButton editing={Boolean(matchForm.id)} loading={saving} />
                {matchForm.id ? (
                  <button
                    className="rounded border border-line px-3 py-2 text-sm font-bold"
                    onClick={() => setMatchForm(emptyMatchForm)}
                    type="button"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="rounded border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-black uppercase">Partidos</h2>
            <div className="max-h-[45rem] space-y-2 overflow-y-auto pr-1">
              {matches.map((match) => (
                <div key={match.id} className="rounded border border-line px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-gold-700">
                        {match.round_label || "Partido"}
                      </p>
                      <p className="font-bold">
                        {formatTeamName(teams, match.home_team_id)} vs{" "}
                        {formatTeamName(teams, match.away_team_id)}
                      </p>
                      <p className="text-xs text-ink/50">
                        {scoreText(match)} - {matchStatusLabel(match.status)}
                      </p>
                      {match.home_penalty_score != null && match.away_penalty_score != null ? (
                        <p className="text-xs font-bold text-ink/45">
                          Penaltis {match.home_penalty_score}-{match.away_penalty_score}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-ink/35">
                          Penaltis pendientes
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {match.status === "scheduled" ? (
                        <button
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-2 text-xs font-black uppercase text-white hover:bg-emerald-700"
                          onClick={() => updateMatchStatus(match, "in_progress")}
                          type="button"
                        >
                          <Play size={14} aria-hidden="true" />
                          Iniciar
                        </button>
                      ) : null}
                      {match.status === "in_progress" ? (
                        <button
                          className="inline-flex items-center gap-1 rounded bg-ink px-2.5 py-2 text-xs font-black uppercase text-gold-400 hover:bg-asphalt"
                          onClick={() => updateMatchStatus(match, "finished")}
                          type="button"
                        >
                          <SquareCheckBig size={14} aria-hidden="true" />
                          Finalizar
                        </button>
                      ) : null}
                      <button
                        className="inline-flex items-center gap-1 rounded bg-fog px-2.5 py-2 text-xs font-black uppercase hover:bg-gold-50"
                        onClick={() => {
                          setPenaltyForm({
                            match_id: match.id,
                            home_penalty_score:
                              match.home_penalty_score == null
                                ? ""
                                : String(match.home_penalty_score),
                            away_penalty_score:
                              match.away_penalty_score == null
                                ? ""
                                : String(match.away_penalty_score),
                          });
                          setPenaltyModalMatchId(match.id);
                        }}
                        type="button"
                      >
                        <Trophy size={14} aria-hidden="true" />
                        Penaltis
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded bg-gold-400 px-2.5 py-2 text-xs font-black uppercase text-ink hover:bg-gold-300"
                        onClick={() => {
                          setEventForm({
                            ...emptyEventForm,
                            match_id: match.id,
                          });
                          setEventModalMatchId(match.id);
                        }}
                        type="button"
                      >
                        <Plus size={14} aria-hidden="true" />
                        Evento
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded bg-fog px-2.5 py-2 text-xs font-black uppercase hover:bg-gold-50"
                        onClick={() => setEventListMatchId(match.id)}
                        type="button"
                      >
                        <ListTree size={14} aria-hidden="true" />
                        Eventos
                      </button>
                      <button
                        className="rounded bg-fog p-2 hover:bg-gold-50"
                        onClick={() =>
                          setMatchForm({
                            id: match.id,
                            stage_id: match.stage_id,
                            group_id: match.group_id || "",
                            home_team_id: match.home_team_id || "",
                            away_team_id: match.away_team_id || "",
                            scheduled_at: toDateTimeLocal(match.scheduled_at),
                            home_score:
                              match.home_score == null ? "" : String(match.home_score),
                            away_score:
                              match.away_score == null ? "" : String(match.away_score),
                            status: match.status,
                            round_label: match.round_label || "",
                          })
                        }
                        type="button"
                      >
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        onClick={() =>
                          requestConfirm({
                            title: "Eliminar partido",
                            body: "¿Seguro que quieres eliminar este partido? Tambien se eliminaran sus eventos.",
                            confirmLabel: "Eliminar partido",
                            onConfirm: () => deleteMatch(match),
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "structure" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <form className="rounded border border-line bg-white p-5" onSubmit={saveStage}>
              <h2 className="mb-4 text-lg font-black uppercase">
                {stageForm.id ? "Editar fase" : "Crear fase"}
              </h2>
              <div className="space-y-4">
                <AdminInput
                  label="Nombre"
                  required
                  value={stageForm.name}
                  onChange={(name) => setStageForm((current) => ({ ...current, name }))}
                />
                <AdminSelect
                  label="Tipo"
                  value={stageForm.type}
                  onChange={(type) =>
                    setStageForm((current) => ({ ...current, type: type as Stage["type"] }))
                  }
                >
                  <option value="groups">Fase de grupos</option>
                  <option value="knockout">Eliminatoria</option>
                </AdminSelect>
                <AdminInput
                  label="Orden"
                  required
                  type="number"
                  value={stageForm.order_index}
                  onChange={(order_index) =>
                    setStageForm((current) => ({ ...current, order_index }))
                  }
                />
                <div className="flex gap-2">
                  <SubmitButton editing={Boolean(stageForm.id)} loading={saving} />
                  {stageForm.id ? (
                    <button
                      className="rounded border border-line px-3 py-2 text-sm font-bold"
                      onClick={() => setStageForm(emptyStageForm)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            <div className="rounded border border-line bg-white p-5">
              <h2 className="mb-4 text-lg font-black uppercase">Fases</h2>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                  >
                    <div>
                      <p className="font-bold">{stage.name}</p>
                      <p className="text-xs text-ink/50">
                        {stage.type === "groups" ? "Fase de grupos" : "Eliminatoria"} - orden {stage.order_index}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-fog p-2 hover:bg-gold-50"
                        onClick={() =>
                          setStageForm({
                            id: stage.id,
                            name: stage.name,
                            type: stage.type,
                            order_index: String(stage.order_index),
                          })
                        }
                        type="button"
                      >
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        onClick={() =>
                          requestConfirm({
                            title: "Eliminar fase",
                            body: `Seguro que quieres eliminar ${stage.name}? Si tiene grupos o partidos asociados, Supabase puede bloquearlo para proteger los datos.`,
                            confirmLabel: "Eliminar fase",
                            onConfirm: () => deleteStage(stage),
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <form className="rounded border border-line bg-white p-5" onSubmit={saveGroup}>
              <h2 className="mb-4 text-lg font-black uppercase">
                {groupForm.id ? "Editar grupo" : "Crear grupo"}
              </h2>
              <div className="space-y-4">
                <AdminSelect
                  label="Fase"
                  required
                  value={groupForm.stage_id}
                  onChange={(stage_id) =>
                    setGroupForm((current) => ({ ...current, stage_id }))
                  }
                >
                  <option value="">Selecciona fase</option>
                  {stages
                    .filter((stage) => stage.type === "groups")
                    .map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </AdminSelect>
                <AdminInput
                  label="Nombre"
                  required
                  placeholder="Grupo A"
                  value={groupForm.name}
                  onChange={(name) => setGroupForm((current) => ({ ...current, name }))}
                />
                <AdminInput
                  label="Orden"
                  required
                  type="number"
                  value={groupForm.order_index}
                  onChange={(order_index) =>
                    setGroupForm((current) => ({ ...current, order_index }))
                  }
                />
                <div className="flex gap-2">
                  <SubmitButton editing={Boolean(groupForm.id)} loading={saving} />
                  {groupForm.id ? (
                    <button
                      className="rounded border border-line px-3 py-2 text-sm font-bold"
                      onClick={() => setGroupForm(emptyGroupForm)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            <div className="rounded border border-line bg-white p-5">
              <h2 className="mb-4 text-lg font-black uppercase">Grupos</h2>
              <div className="space-y-2">
                {groups.map((group) => {
                  const stage = stages.find((item) => item.id === group.stage_id);
                  const teamCount = groupTeams.filter(
                    (item) => item.group_id === group.id
                  ).length;

                  return (
                    <div
                      key={group.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                    >
                      <div>
                        <p className="font-bold">{group.name}</p>
                        <p className="text-xs text-ink/50">
                          {stage?.name || "Sin fase"} - orden {group.order_index} - {teamCount} equipos
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded bg-fog p-2 hover:bg-gold-50"
                          onClick={() =>
                            setGroupForm({
                              id: group.id,
                              stage_id: group.stage_id,
                              name: group.name,
                              order_index: String(group.order_index),
                            })
                          }
                          type="button"
                        >
                          <Edit3 size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                          onClick={() =>
                            requestConfirm({
                              title: "Eliminar grupo",
                              body: `Seguro que quieres eliminar ${group.name}? Se quitaran tambien las relaciones de equipos con este grupo.`,
                              confirmLabel: "Eliminar grupo",
                              onConfirm: () => deleteGroup(group),
                            })
                          }
                          type="button"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "events" ? (
        <section className="grid gap-5 xl:grid-cols-[26rem_1fr]">
          <form className="rounded border border-line bg-white p-5" onSubmit={saveEvent}>
            <h2 className="mb-4 text-lg font-black uppercase">
              {eventForm.id ? "Editar evento" : "Crear evento"}
            </h2>
            <div className="space-y-4">
              <AdminSelect
                label="Partido"
                required
                value={eventForm.match_id}
                onChange={(match_id) =>
                  setEventForm((current) => ({
                    ...current,
                    match_id,
                    team_id: "",
                    player_id: "",
                  }))
                }
              >
                <option value="">Selecciona partido</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {formatMatchName(matches, teams, match.id)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label="Equipo"
                required
                value={eventForm.team_id}
                onChange={(team_id) =>
                  setEventForm((current) => ({ ...current, team_id, player_id: "" }))
                }
              >
                <option value="">Selecciona equipo</option>
                {eventTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label="Jugador"
                value={eventForm.player_id}
                onChange={(player_id) =>
                  setEventForm((current) => ({ ...current, player_id }))
                }
              >
                <option value="">Sin jugador</option>
                {eventPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                label="Tipo"
                value={eventForm.event_type}
                onChange={(event_type) =>
                  setEventForm((current) => ({
                    ...current,
                    event_type: event_type as EventType,
                  }))
                }
              >
                <option value="goal">Gol</option>
                <option value="own_goal">Gol propia</option>
                <option value="yellow_card">Tarjeta amarilla</option>
                <option value="red_card">Tarjeta roja</option>
              </AdminSelect>
              <AdminInput
                label="Minuto"
                required
                type="number"
                value={eventForm.minute}
                onChange={(minute) => setEventForm((current) => ({ ...current, minute }))}
              />
              <div className="flex gap-2">
                <SubmitButton editing={Boolean(eventForm.id)} loading={saving} />
                {eventForm.id ? (
                  <button
                    className="rounded border border-line px-3 py-2 text-sm font-bold"
                    onClick={() => setEventForm(emptyEventForm)}
                    type="button"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="rounded border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-black uppercase">Eventos</h2>
            <div className="max-h-[45rem] space-y-2 overflow-y-auto pr-1">
              {events.map((matchEvent) => (
                <div
                  key={matchEvent.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                >
                  <div>
                    <p className="font-bold">
                      Min {matchEvent.minute} - {eventTypeLabel(matchEvent.event_type)}
                    </p>
                    <p className="text-xs text-ink/50">
                      {formatPlayerName(players, matchEvent.player_id)} -{" "}
                      {formatTeamName(teams, matchEvent.team_id)}
                    </p>
                    <p className="text-xs text-ink/40">
                      {formatMatchName(matches, teams, matchEvent.match_id)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-fog p-2 hover:bg-gold-50"
                      onClick={() =>
                        setEventForm({
                          id: matchEvent.id,
                          match_id: matchEvent.match_id,
                          team_id: matchEvent.team_id,
                          player_id: matchEvent.player_id || "",
                          event_type: matchEvent.event_type,
                          minute: String(matchEvent.minute),
                        })
                      }
                      type="button"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      onClick={() =>
                        requestConfirm({
                          title: "Eliminar evento",
                          body: "¿Seguro que quieres eliminar este evento?",
                          confirmLabel: "Eliminar evento",
                          onConfirm: () => deleteEvent(matchEvent),
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {playerModalTeam ? (
        <Modal
          title={playerForm.id ? "Editar jugador" : "Añadir jugador"}
          subtitle={playerModalTeam.name}
          onClose={() => {
            setPlayerModalTeamId(null);
            setPlayerForm(emptyPlayerForm);
          }}
        >
          <form className="space-y-4" onSubmit={savePlayer}>
            <AdminInput
              label="Nombre"
              required
              value={playerForm.first_name}
              onChange={(first_name) =>
                setPlayerForm((current) => ({ ...current, first_name }))
              }
            />
            <AdminInput
              label="Apellidos"
              required
              value={playerForm.last_name}
              onChange={(last_name) =>
                setPlayerForm((current) => ({ ...current, last_name }))
              }
            />
            <input type="hidden" value={playerForm.team_id} />
            <SubmitButton editing={Boolean(playerForm.id)} loading={saving} />
          </form>
        </Modal>
      ) : null}

      {playerListTeam ? (
        <Modal
          title="Plantilla"
          subtitle={playerListTeam.name}
          message={message}
          error={error}
          onClose={() => setPlayerListTeamId(null)}
        >
          <div className="space-y-2">
            {players
              .filter((player) => player.team_id === playerListTeam.id)
              .map((player) => (
                <div
                  key={player.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                >
                  <p className="font-bold">
                    {player.first_name} {player.last_name}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-fog p-2 hover:bg-gold-50"
                      onClick={() => {
                        setPlayerListTeamId(null);
                        setPlayerForm({
                          id: player.id,
                          team_id: player.team_id,
                          first_name: player.first_name,
                          last_name: player.last_name,
                        });
                        setPlayerModalTeamId(player.team_id);
                      }}
                      type="button"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      onClick={() =>
                        requestConfirm({
                          title: "Eliminar jugador",
                          body: `¿Seguro que quieres eliminar ${player.first_name} ${player.last_name}?`,
                          confirmLabel: "Eliminar jugador",
                          onConfirm: () => deletePlayer(player),
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            {players.filter((player) => player.team_id === playerListTeam.id).length === 0 ? (
              <p className="text-sm text-ink/55">Este equipo todavía no tiene jugadores.</p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {penaltyModalMatch ? (
        <Modal
          title="Penaltis"
          subtitle={`${formatTeamName(teams, penaltyModalMatch.home_team_id)} vs ${formatTeamName(
            teams,
            penaltyModalMatch.away_team_id
          )}`}
          onClose={() => {
            setPenaltyModalMatchId(null);
            setPenaltyForm(emptyPenaltyForm);
          }}
        >
          <form className="space-y-4" onSubmit={savePenalties}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput
                label={formatTeamName(teams, penaltyModalMatch.home_team_id)}
                required
                type="number"
                value={penaltyForm.home_penalty_score}
                onChange={(home_penalty_score) =>
                  setPenaltyForm((current) => ({ ...current, home_penalty_score }))
                }
              />
              <AdminInput
                label={formatTeamName(teams, penaltyModalMatch.away_team_id)}
                required
                type="number"
                value={penaltyForm.away_penalty_score}
                onChange={(away_penalty_score) =>
                  setPenaltyForm((current) => ({ ...current, away_penalty_score }))
                }
              />
            </div>
            <SubmitButton editing loading={saving} />
          </form>
        </Modal>
      ) : null}

      {eventModalMatch ? (
        <Modal
          title={eventForm.id ? "Editar evento" : "Añadir evento"}
          subtitle={`${formatTeamName(teams, eventModalMatch.home_team_id)} vs ${formatTeamName(
            teams,
            eventModalMatch.away_team_id
          )}`}
          onClose={() => {
            setEventModalMatchId(null);
            setEventForm(emptyEventForm);
          }}
        >
          <form className="space-y-4" onSubmit={saveEvent}>
            <AdminSelect
              label="Equipo"
              required
              value={eventForm.team_id}
              onChange={(team_id) =>
                setEventForm((current) => ({ ...current, team_id, player_id: "" }))
              }
            >
              <option value="">Selecciona equipo</option>
              {eventTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              label="Jugador"
              value={eventForm.player_id}
              onChange={(player_id) =>
                setEventForm((current) => ({ ...current, player_id }))
              }
            >
              <option value="">Sin jugador</option>
              {eventPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              label="Tipo"
              value={eventForm.event_type}
              onChange={(event_type) =>
                setEventForm((current) => ({
                  ...current,
                  event_type: event_type as EventType,
                }))
              }
            >
              <option value="goal">Gol</option>
              <option value="own_goal">Gol propia</option>
              <option value="yellow_card">Tarjeta amarilla</option>
              <option value="red_card">Tarjeta roja</option>
            </AdminSelect>
            <AdminInput
              label="Minuto"
              required
              type="number"
              value={eventForm.minute}
              onChange={(minute) => setEventForm((current) => ({ ...current, minute }))}
            />
            <SubmitButton editing={Boolean(eventForm.id)} loading={saving} />
          </form>
        </Modal>
      ) : null}

      {eventListMatch ? (
        <Modal
          title="Eventos del partido"
          subtitle={`${formatTeamName(teams, eventListMatch.home_team_id)} vs ${formatTeamName(
            teams,
            eventListMatch.away_team_id
          )}`}
          message={message}
          error={error}
          onClose={() => setEventListMatchId(null)}
        >
          <div className="space-y-2">
            {events
              .filter((item) => item.match_id === eventListMatch.id)
              .map((matchEvent) => (
                <div
                  key={matchEvent.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-3"
                >
                  <div>
                    <p className="font-bold">
                      Min {matchEvent.minute} - {eventTypeLabel(matchEvent.event_type)}
                    </p>
                    <p className="text-xs text-ink/50">
                      {formatPlayerName(players, matchEvent.player_id)} -{" "}
                      {formatTeamName(teams, matchEvent.team_id)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-fog p-2 hover:bg-gold-50"
                      onClick={() => {
                        setEventListMatchId(null);
                        setEventForm({
                          id: matchEvent.id,
                          match_id: matchEvent.match_id,
                          team_id: matchEvent.team_id,
                          player_id: matchEvent.player_id || "",
                          event_type: matchEvent.event_type,
                          minute: String(matchEvent.minute),
                        });
                        setEventModalMatchId(matchEvent.match_id);
                      }}
                      type="button"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded bg-red-50 p-2 text-red-700 hover:bg-red-100"
                      onClick={() =>
                        requestConfirm({
                          title: "Eliminar evento",
                          body: "¿Seguro que quieres eliminar este evento?",
                          confirmLabel: "Eliminar evento",
                          onConfirm: () => deleteEvent(matchEvent),
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            {events.filter((item) => item.match_id === eventListMatch.id).length === 0 ? (
              <p className="text-sm text-ink/55">Este partido todavía no tiene eventos.</p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {confirmAction ? (
        <Modal
          title={confirmAction.title}
          subtitle="Confirmacion requerida"
          onClose={() => setConfirmAction(null)}
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-ink/70">{confirmAction.body}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="rounded border border-line px-4 py-2.5 text-sm font-bold hover:border-ink"
                onClick={() => setConfirmAction(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded bg-red-600 px-4 py-2.5 text-sm font-black uppercase text-white hover:bg-red-700"
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  await action.onConfirm();
                }}
                type="button"
              >
                {confirmAction.confirmLabel || "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
