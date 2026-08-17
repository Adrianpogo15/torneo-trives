"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search, Trophy, UsersRound, X } from "lucide-react";
import { formatMatchDate } from "@/lib/public-data";

type TeamCard = {
  id: string;
  name: string;
  logo_url?: string | null;
  groupName: string;
  players: {
    id: string;
    first_name: string;
    last_name: string;
    goals: number;
  }[];
};

type TeamsBrowserProps = {
  teams: TeamCard[];
  matches: {
    id: string;
    home_team_id: string | null;
    away_team_id: string | null;
    scheduled_at: string | null;
    home_score: number | null;
    away_score: number | null;
    home_penalty_score?: number | null;
    away_penalty_score?: number | null;
    status: string;
    round_label: string | null;
  }[];
};

function scoreText(match: TeamsBrowserProps["matches"][number]) {
  if (match.status !== "finished" && match.status !== "in_progress") return "VS";
  if (match.home_score == null || match.away_score == null) return "0 - 0";
  return `${match.home_score} - ${match.away_score}`;
}

function penaltyText(match: TeamsBrowserProps["matches"][number]) {
  if (match.home_penalty_score == null || match.away_penalty_score == null) {
    return "Penaltis pendientes";
  }

  return `Penaltis ${match.home_penalty_score}-${match.away_penalty_score}`;
}

export function TeamsBrowser({ teams, matches }: TeamsBrowserProps) {
  const [query, setQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return teams;
    }

    return teams.filter((team) => {
      const playerMatch = team.players.some((player) =>
        `${player.first_name} ${player.last_name}`.toLowerCase().includes(normalizedQuery)
      );

      return (
        team.name.toLowerCase().includes(normalizedQuery) ||
        team.groupName.toLowerCase().includes(normalizedQuery) ||
        playerMatch
      );
    });
  }, [query, teams]);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;
  const selectedTeamMatches = selectedTeam
    ? matches.filter(
        (match) =>
          match.home_team_id === selectedTeam.id || match.away_team_id === selectedTeam.id
      )
    : [];

  return (
    <div className="space-y-5">
      <label className="relative block max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45"
          size={18}
          aria-hidden="true"
        />
        <input
          className="w-full rounded border border-line bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-gold-500"
          placeholder="Buscar equipo o jugador"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeams.map((team) => (
          <article key={team.id} className="rounded border border-line bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-gold-700">{team.groupName}</p>
                <h2 className="text-xl font-black">{team.name}</h2>
              </div>
              <span className="flex size-16 shrink-0 items-center justify-center rounded bg-transparent text-gold-600">
                {team.logo_url ? (
                  <img
                    alt=""
                    className="max-h-16 max-w-16 object-contain drop-shadow-sm"
                    src={team.logo_url}
                  />
                ) : (
                  <UsersRound size={22} aria-hidden="true" />
                )}
              </span>
            </div>
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {team.players.map((player) => (
                <li
                  key={player.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded border border-line px-3 py-2 text-sm"
                >
                  <span>{player.first_name} {player.last_name}</span>
                  <span className="rounded bg-fog px-2 py-1 text-xs font-black">
                    {player.goals} goles
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-ink px-3 py-2.5 text-xs font-black uppercase text-gold-400 transition hover:bg-asphalt"
              onClick={() => setSelectedTeamId(team.id)}
              type="button"
            >
              <Trophy size={15} aria-hidden="true" />
              Ver detalle
            </button>
          </article>
        ))}
      </div>

      {selectedTeam ? (
        <div
          className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTeamId(null)}
        >
          <div
            className="w-full max-w-3xl animate-modal-in overflow-hidden rounded border border-line bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase text-gold-700">
                  {selectedTeam.groupName}
                </p>
                <h2 className="text-2xl font-black uppercase">{selectedTeam.name}</h2>
              </div>
              {selectedTeam.logo_url ? (
                <img
                  alt=""
                  className="size-20 shrink-0 object-contain drop-shadow-sm"
                  src={selectedTeam.logo_url}
                />
              ) : null}
              <button
                aria-label="Cerrar"
                className="rounded p-2 hover:bg-fog"
                onClick={() => setSelectedTeamId(null)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid max-h-[75vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_1.1fr]">
              <section>
                <h3 className="mb-3 font-black uppercase">Plantilla y goles</h3>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {selectedTeam.players.map((player) => (
                    <div
                      key={player.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded border border-line px-3 py-2 text-sm"
                    >
                      <span>{player.first_name} {player.last_name}</span>
                      <span className="rounded bg-gold-50 px-2 py-1 text-xs font-black">
                        {player.goals} goles
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-3 font-black uppercase">Partidos</h3>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {selectedTeamMatches.map((match) => (
                    <article key={match.id} className="rounded border border-line p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase text-gold-700">
                          {match.round_label || "Partido"}
                        </p>
                        <p className="inline-flex items-center gap-1 text-xs text-ink/55">
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatMatchDate(match.scheduled_at)}
                        </p>
                      </div>
                      <div className="grid grid-cols-[1fr_4.5rem_1fr] items-center gap-2">
                        <p className="text-right text-sm font-bold">
                          {teams.find((team) => team.id === match.home_team_id)?.name || "Por definir"}
                        </p>
                        <p className="rounded bg-ink px-2 py-2 text-center font-black text-gold-400">
                          {scoreText(match)}
                        </p>
                        <p className="text-sm font-bold">
                          {teams.find((team) => team.id === match.away_team_id)?.name || "Por definir"}
                        </p>
                      </div>
                      <p className="mt-2 text-center text-xs font-bold text-ink/55">
                        {penaltyText(match)}
                      </p>
                    </article>
                  ))}
                  {selectedTeamMatches.length === 0 ? (
                    <p className="text-sm text-ink/60">Todavia no hay partidos para este equipo.</p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
