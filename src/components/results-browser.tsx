"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Filter, ListTree, RotateCcw, X } from "lucide-react";
import { formatMatchDate } from "@/lib/public-data";

type Team = {
  id: string;
  name: string;
  logo_url?: string | null;
};

type Group = {
  id: string;
  name: string;
};

type Stage = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  group_id: string | null;
  stage_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  scheduled_at: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  status: string;
  round_label: string | null;
};

type Event = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  event_type: "goal" | "yellow_card" | "red_card" | "own_goal";
  minute: number;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
};

type ResultsBrowserProps = {
  matches: Match[];
  teams: Team[];
  groups: Group[];
  stages: Stage[];
  events: Event[];
  players: Player[];
};

function teamName(teams: Team[], teamId: string | null) {
  return teams.find((team) => team.id === teamId)?.name || "Por definir";
}

function teamLogo(teams: Team[], teamId: string | null) {
  return teams.find((team) => team.id === teamId)?.logo_url || null;
}

function playerName(players: Player[], playerId: string | null) {
  const player = players.find((item) => item.id === playerId);
  return player ? `${player.first_name} ${player.last_name}`.trim() : "Sin jugador";
}

function matchStage(match: Match, stages: Stage[]) {
  return stages.find((stage) => stage.id === match.stage_id)?.name || "Fase";
}

function scoreLabel(match: Match) {
  if (
    match.status !== "finished" &&
    match.status !== "in_progress"
  ) {
    return "VS";
  }

  if (match.home_score == null || match.away_score == null) {
    return "0 - 0";
  }

  return `${match.home_score} - ${match.away_score}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Programado",
    in_progress: "En juego",
    finished: "Finalizado",
    cancelled: "Cancelado",
  };

  return labels[status] || status;
}

function statusClassName(status: string) {
  const styles: Record<string, string> = {
    scheduled: "border-line bg-fog text-ink/70",
    in_progress: "border-gold-400 bg-gold-50 text-ink",
    finished: "border-emerald-200 bg-emerald-50 text-emerald-800",
    cancelled: "border-red-200 bg-red-50 text-red-700",
  };

  return styles[status] || styles.scheduled;
}

function eventLabel(event: Event) {
  const labels = {
    goal: "Gol",
    own_goal: "Gol propia",
    yellow_card: "Amarilla",
    red_card: "Roja",
  };

  return labels[event.event_type];
}

function winnerTeamId(match: Match) {
  if (match.status !== "finished" && match.status !== "in_progress") return null;
  if (match.home_score == null || match.away_score == null) return null;

  if (match.home_score > match.away_score) return match.home_team_id;
  if (match.away_score > match.home_score) return match.away_team_id;

  if (
    match.home_penalty_score != null &&
    match.away_penalty_score != null &&
    match.home_penalty_score !== match.away_penalty_score
  ) {
    return match.home_penalty_score > match.away_penalty_score
      ? match.home_team_id
      : match.away_team_id;
  }

  return null;
}

function penaltyLabel(match: Match) {
  if (match.home_penalty_score == null || match.away_penalty_score == null) {
    return "Penaltis pendientes";
  }

  return `Penaltis ${match.home_penalty_score}-${match.away_penalty_score}`;
}

export function ResultsBrowser({ matches, teams, groups, stages, events, players }: ResultsBrowserProps) {
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const phases = useMemo(
    () => stages.map((stage) => stage.name),
    [stages]
  );

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const matchDate = match.scheduled_at ? match.scheduled_at.slice(0, 10) : "";
      const matchesDate = !date || matchDate === date;
      const matchesPhase = phase === "all" || matchStage(match, stages) === phase;
      const matchesTeam =
        teamId === "all" || match.home_team_id === teamId || match.away_team_id === teamId;

      return matchesDate && matchesPhase && matchesTeam;
    });
  }, [date, phase, teamId, matches, stages]);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || null;
  const selectedEvents = events
    .filter((event) => event.match_id === selectedMatchId)
    .sort((a, b) => a.minute - b.minute);
  const hasFilters = Boolean(date) || phase !== "all" || teamId !== "all";

  function clearFilters() {
    setDate("");
    setPhase("all");
    setTeamId("all");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded border border-line bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-ink/55">
            <CalendarDays size={14} /> Fecha
          </span>
          <input
            className="w-full rounded border border-line px-3 py-3 text-sm outline-none focus:border-gold-500"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-ink/55">
            <Filter size={14} /> Fase
          </span>
          <select
            className="w-full rounded border border-line px-3 py-3 text-sm outline-none focus:border-gold-500"
            value={phase}
            onChange={(event) => setPhase(event.target.value)}
          >
            <option value="all">Todas</option>
            {phases.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-ink/55">
            <Filter size={14} /> Equipo
          </span>
          <select
            className="w-full rounded border border-line px-3 py-3 text-sm outline-none focus:border-gold-500"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="all">Todos</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line px-3 py-2 text-xs font-black uppercase text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasFilters}
          onClick={clearFilters}
          type="button"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Limpiar
        </button>
      </div>

      <div className="grid gap-4">
        {filteredMatches.map((match) => {
          const winnerId = winnerTeamId(match);

          return (
          <article
            key={match.id}
            className="group overflow-hidden rounded border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 truncate text-xs font-black uppercase text-gold-700">
                {match.round_label || groups.find((group) => group.id === match.group_id)?.name || matchStage(match, stages)}
              </p>
              <p className="shrink-0 text-xs font-bold text-ink/50">{formatMatchDate(match.scheduled_at)}</p>
            </div>

            <div className="px-4 pb-4">
              <div className="relative overflow-hidden rounded bg-fog">
                <div className="absolute inset-x-0 top-0 h-1 bg-gold-400" />
                <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-5 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] sm:gap-5 sm:px-6 sm:py-7">
                  <div className="flex min-w-0 flex-col items-center">
                    <div
                      className={`grid size-20 place-items-center rounded bg-white shadow-sm ring-1 ring-line transition group-hover:scale-105 sm:size-28 ${
                        winnerId === match.home_team_id ? "ring-2 ring-gold-400" : ""
                      }`}
                    >
                      {teamLogo(teams, match.home_team_id) ? (
                        <img
                          alt=""
                          className="size-16 object-contain drop-shadow-sm sm:size-24"
                          src={teamLogo(teams, match.home_team_id) || ""}
                        />
                      ) : null}
                    </div>
                    <p
                      className={`mt-3 min-w-0 max-w-full break-words text-center text-sm font-black leading-tight sm:text-lg ${
                        winnerId === match.home_team_id ? "text-ink" : "text-ink/70"
                      }`}
                    >
                      {teamName(teams, match.home_team_id)}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <p className="min-w-16 rounded bg-ink px-2 py-3 text-center text-lg font-black text-gold-400 shadow-sm sm:min-w-20 sm:text-2xl">
                      {scoreLabel(match)}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col items-center">
                    <div
                      className={`grid size-20 place-items-center rounded bg-white shadow-sm ring-1 ring-line transition group-hover:scale-105 sm:size-28 ${
                        winnerId === match.away_team_id ? "ring-2 ring-gold-400" : ""
                      }`}
                    >
                      {teamLogo(teams, match.away_team_id) ? (
                        <img
                          alt=""
                          className="size-16 object-contain drop-shadow-sm sm:size-24"
                          src={teamLogo(teams, match.away_team_id) || ""}
                        />
                      ) : null}
                    </div>
                    <p
                      className={`mt-3 min-w-0 max-w-full break-words text-center text-sm font-black leading-tight sm:text-lg ${
                        winnerId === match.away_team_id ? "text-ink" : "text-ink/70"
                      }`}
                    >
                      {teamName(teams, match.away_team_id)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded border px-2.5 py-1 font-black uppercase tracking-normal ${statusClassName(
                      match.status
                    )}`}
                  >
                    {statusLabel(match.status)}
                  </span>
                  <span className="rounded bg-fog px-2 py-1 font-bold text-ink/60">
                    {penaltyLabel(match)}
                  </span>
                </div>
                <button
                  className="inline-flex w-fit shrink-0 items-center gap-2 rounded bg-gold-400 px-3 py-2 text-xs font-black uppercase text-ink transition hover:bg-gold-300"
                  onClick={() => setSelectedMatchId(match.id)}
                  type="button"
                >
                  <ListTree size={15} aria-hidden="true" />
                  Eventos
                </button>
              </div>
            </div>
          </article>
        )})}
      </div>

      {selectedMatch ? (
        <div
          className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMatchId(null)}
        >
          <div
            className="w-full max-w-lg animate-modal-in overflow-hidden rounded border border-line bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <div>
                <h2 className="font-black uppercase">Eventos del partido</h2>
                <p className="text-xs text-ink/55">
                  {teamName(teams, selectedMatch.home_team_id)} vs {teamName(teams, selectedMatch.away_team_id)}
                </p>
              </div>
              <button
                aria-label="Cerrar"
                className="rounded p-2 hover:bg-fog"
                onClick={() => setSelectedMatchId(null)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[20rem] overflow-y-auto p-5 sm:max-h-[22rem]">
              {selectedEvents.length ? (
                <ol className="relative space-y-4 border-l-2 border-gold-400 pl-5">
                  {selectedEvents.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[1.65rem] top-1 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] font-black text-gold-400">
                        {event.minute}
                      </span>
                      <p className="font-black">{eventLabel(event)}</p>
                      <p className="text-sm text-ink/65">
                        {playerName(players, event.player_id)} · {teamName(teams, event.team_id)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink/60">Todavia no hay eventos registrados.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
