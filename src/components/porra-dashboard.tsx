"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  Filter,
  ListOrdered,
  LogOut,
  RotateCcw,
  Save,
  Trophy,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatMatchDate } from "@/lib/public-data";

type Team = {
  id: string;
  name: string;
  logo_url?: string | null;
};

type Player = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
};

type Match = {
  id: string;
  stage_id: string;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  scheduled_at: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  round_label: string | null;
};

type Group = {
  id: string;
  name: string;
};

type Stage = {
  id: string;
  name: string;
};

type PorraUser = {
  id: string;
  dni: string;
  display_name: string;
};

type Prediction = {
  id: string;
  match_id: string;
  porra_user_id: string;
  home_score: number;
  away_score: number;
  first_scorer_player_id: string | null;
  points: number;
  locked_at: string | null;
};

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

type PorraDashboardProps = {
  matches: Match[];
  teams: Team[];
  players: Player[];
  groups: Group[];
  stages: Stage[];
  leaderboard: LeaderboardRow[];
  stats: MatchStats[];
};

type PredictionDraft = {
  home_score: string;
  away_score: string;
  first_scorer_player_id: string;
};

const storageKey = "torneo-trives-porra-user";

function teamName(teams: Team[], teamId: string | null) {
  return teams.find((team) => team.id === teamId)?.name || "Por definir";
}

function teamLogo(teams: Team[], teamId: string | null) {
  return teams.find((team) => team.id === teamId)?.logo_url || null;
}

function playerName(players: Player[], playerId: string | null) {
  const player = players.find((item) => item.id === playerId);
  return player ? `${player.first_name} ${player.last_name}` : "";
}

function isPredictionOpen(match: Match) {
  if (match.status !== "scheduled") return false;
  if (!match.scheduled_at) return true;
  return new Date(match.scheduled_at).getTime() > Date.now();
}

function resultText(match: Match) {
  if (match.home_score == null || match.away_score == null) return "Pendiente";
  return `${match.home_score} - ${match.away_score}`;
}

function buildInitialDrafts(predictions: Prediction[]) {
  return predictions.reduce<Record<string, PredictionDraft>>((acc, prediction) => {
    acc[prediction.match_id] = {
      home_score: String(prediction.home_score),
      away_score: String(prediction.away_score),
      first_scorer_player_id: prediction.first_scorer_player_id || "",
    };
    return acc;
  }, {});
}

function cleanDni(value: string) {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function authErrorMessage(message: string | undefined, type: "login" | "register") {
  const normalized = (message || "").toLowerCase();

  if (
    normalized.includes("crypt") ||
    normalized.includes("not found") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache") ||
    normalized.includes("404")
  ) {
    return "La porra necesita actualizar la base de datos. Ejecuta primero el SQL de migración.";
  }

  if (type === "login") {
    return "DNI o contraseña incorrectos.";
  }

  return message || "No se pudo crear la cuenta.";
}

export function PorraDashboard({
  matches,
  teams,
  players,
  groups,
  stages,
  leaderboard,
  stats,
}: PorraDashboardProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<PorraUser | null>(null);
  const [activeTab, setActiveTab] = useState<"matches" | "ranking" | "account">(
    "matches"
  );
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [dni, setDni] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localPredictions, setLocalPredictions] = useState<Prediction[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({});
  const [groupFilter, setGroupFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [statsMatchId, setStatsMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as PorraUser;
      setUser(parsed);
      void loadPredictions(parsed.id);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predictionByMatch = useMemo(
    () =>
      localPredictions.reduce<Record<string, Prediction>>((acc, prediction) => {
        acc[prediction.match_id] = prediction;
        return acc;
      }, {}),
    [localPredictions]
  );

  const openMatches = matches.filter(isPredictionOpen).length;
  const totalPoints = localPredictions.reduce(
    (sum, prediction) => sum + prediction.points,
    0
  );
  const selectedStatsMatch = matches.find((match) => match.id === statsMatchId) || null;
  const selectedStats = stats.find((item) => item.match_id === statsMatchId) || null;
  const hasMatchFilters =
    groupFilter !== "all" || stageFilter !== "all" || teamFilter !== "all";
  const filteredMatches = matches.filter((match) => {
    const matchesGroup = groupFilter === "all" || match.group_id === groupFilter;
    const matchesStage = stageFilter === "all" || match.stage_id === stageFilter;
    const matchesTeam =
      teamFilter === "all" ||
      match.home_team_id === teamFilter ||
      match.away_team_id === teamFilter;

    return matchesGroup && matchesStage && matchesTeam;
  });
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores;
    return b.predictions_count - a.predictions_count;
  });

  async function loadPredictions(userId: string) {
    const { data, error: predictionsError } = await supabase
      .rpc("get_porra_predictions", { porra_user_id_input: userId })
      .returns<Prediction[]>();

    if (predictionsError) {
      setError(predictionsError.message);
      return;
    }

    const predictionRows = (data || []) as unknown as Prediction[];
    setLocalPredictions(predictionRows);
    setDrafts(buildInitialDrafts(predictionRows));
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedDni = cleanDni(dni);

    if (authTab === "register") {
      if (!displayName.trim()) {
        setError("Introduce un nombre de usuario.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }

      const { data, error: registerError } = await supabase
        .rpc("register_porra_user", {
          dni_input: normalizedDni,
          display_name_input: displayName.trim(),
          password_input: password,
        })
        .returns<PorraUser[]>();

      const users = (data || []) as unknown as PorraUser[];

      if (registerError || !users[0]) {
        setError(authErrorMessage(registerError?.message, "register"));
        return;
      }

      setUser(users[0]);
      window.localStorage.setItem(storageKey, JSON.stringify(users[0]));
      setMessage("Cuenta creada. Ya puedes guardar tus resultados.");
      return;
    }

    const { data, error: loginError } = await supabase
      .rpc("login_porra_user", {
        dni_input: normalizedDni,
        password_input: password,
      })
      .returns<PorraUser[]>();

    const users = (data || []) as unknown as PorraUser[];

    if (loginError || !users[0]) {
      setError(authErrorMessage(loginError?.message, "login"));
      return;
    }

    setUser(users[0]);
    window.localStorage.setItem(storageKey, JSON.stringify(users[0]));
    await loadPredictions(users[0].id);
  }

  function logout() {
    setUser(null);
    setLocalPredictions([]);
    setDrafts({});
    window.localStorage.removeItem(storageKey);
  }

  function updateDraft(matchId: string, field: keyof PredictionDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [matchId]: {
        home_score: current[matchId]?.home_score || "",
        away_score: current[matchId]?.away_score || "",
        first_scorer_player_id: current[matchId]?.first_scorer_player_id || "",
        [field]: value,
      },
    }));
  }

  async function savePrediction(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    if (!user) return;

    const draft = drafts[match.id];
    if (!draft?.home_score || !draft?.away_score) {
      setError("Introduce marcador local y visitante.");
      return;
    }

    setSavingMatchId(match.id);
    setError(null);
    setMessage(null);

    const { data, error: saveError } = await supabase
      .rpc("save_porra_prediction", {
        porra_user_id_input: user.id,
        match_id_input: match.id,
        home_score_input: Number(draft.home_score),
        away_score_input: Number(draft.away_score),
        first_scorer_player_id_input: draft.first_scorer_player_id || null,
      })
      .returns<Prediction>();

    setSavingMatchId(null);

    const savedPrediction = data as unknown as Prediction | null;

    if (saveError || !savedPrediction) {
      setError(saveError?.message || "No se pudo guardar el resultado.");
      return;
    }

    setLocalPredictions((current) => [
      ...current.filter((prediction) => prediction.match_id !== match.id),
      savedPrediction,
    ]);
    setMessage("Resultado guardado correctamente.");
    window.setTimeout(() => setMessage(null), 2200);
  }

  function matchPlayers(match: Match) {
    return players.filter(
      (player) =>
        player.team_id === match.home_team_id || player.team_id === match.away_team_id
    );
  }

  function statPercent(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  function clearMatchFilters() {
    setGroupFilter("all");
    setStageFilter("all");
    setTeamFilter("all");
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-xl overflow-hidden rounded border border-line bg-white shadow-sm">
        <div className="bg-ink p-5 text-white">
          <p className="text-sm font-black uppercase text-gold-400">La Porra</p>
          <h1 className="mt-1 text-3xl font-black uppercase">Cena en Hostal La Viuda</h1>
          <p className="mt-2 text-sm text-white/65">
            Registra tu DNI, nombre de usuario y contraseña para participar.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-line p-3">
          <button
            className={`rounded px-3 py-2 text-sm font-black uppercase ${
              authTab === "login" ? "bg-ink text-gold-400" : "bg-fog text-ink/65"
            }`}
            onClick={() => setAuthTab("login")}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`rounded px-3 py-2 text-sm font-black uppercase ${
              authTab === "register" ? "bg-ink text-gold-400" : "bg-fog text-ink/65"
            }`}
            onClick={() => setAuthTab("register")}
            type="button"
          >
            Registro
          </button>
        </div>
        <form className="space-y-4 p-5" onSubmit={handleAuth}>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">DNI</span>
            <input
              className="w-full rounded border border-line px-3 py-3 text-sm uppercase outline-none focus:border-gold-500"
              placeholder="12345678A"
              value={dni}
              onChange={(event) => setDni(event.target.value)}
              required
            />
          </label>
          {authTab === "register" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Nombre de usuario</span>
              <input
                className="w-full rounded border border-line px-3 py-3 text-sm outline-none focus:border-gold-500"
                placeholder="Tu nombre para el ranking"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Contraseña</span>
            <input
              className="w-full rounded border border-line px-3 py-3 text-sm outline-none focus:border-gold-500"
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {authTab === "register" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Repetir contraseña</span>
              <input
                className="w-full rounded border border-line px-3 py-3 text-sm outline-none focus:border-gold-500"
                minLength={6}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          ) : null}
          {error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            className="w-full rounded bg-gold-400 px-4 py-3 text-sm font-black uppercase text-ink transition hover:bg-gold-300"
            type="submit"
          >
            {authTab === "register" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
      </section>
    );
  }

  const tabs = [
    { id: "matches" as const, label: "Partidos", icon: CalendarDays },
    { id: "ranking" as const, label: "Clasificacion", icon: ListOrdered },
    { id: "account" as const, label: "Cuenta", icon: LogOut },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded border border-line bg-ink text-white shadow-sm">
        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-black uppercase text-gold-400">La Porra</p>
            <h1 className="mt-1 text-3xl font-black uppercase">Menu de juego</h1>
            <p className="mt-2 text-sm text-white/65">
              Premio: cena en el Hostal La Viuda.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-xl font-black text-gold-400">{openMatches}</p>
              <p className="text-[11px] uppercase text-white/55">Abiertos</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-xl font-black text-gold-400">{localPredictions.length}</p>
              <p className="text-[11px] uppercase text-white/55">Resultados</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-xl font-black text-gold-400">{totalPoints}</p>
              <p className="text-[11px] uppercase text-white/55">Puntos</p>
            </div>
          </div>
        </div>
        <nav className="grid grid-cols-3 border-t border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`flex min-h-14 items-center justify-center gap-2 px-2 text-xs font-black uppercase transition sm:text-sm ${
                  selected
                    ? "bg-gold-400 text-ink"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </section>

      {message ? (
        <p className="rounded border border-gold-400 bg-gold-50 px-4 py-3 text-sm text-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {activeTab === "matches" ? (
        <section className="grid gap-4">
          <div className="grid gap-3 rounded border border-line bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-ink/55">
                <Filter size={14} aria-hidden="true" />
                Grupo
              </span>
              <select
                className="w-full rounded border border-line px-3 py-2.5 text-sm outline-none focus:border-gold-500"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="all">Todos</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-ink/55">
                <Filter size={14} aria-hidden="true" />
                Fase
              </span>
              <select
                className="w-full rounded border border-line px-3 py-2.5 text-sm outline-none focus:border-gold-500"
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
              >
                <option value="all">Todas</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-ink/55">
                <Filter size={14} aria-hidden="true" />
                Equipo
              </span>
              <select
                className="w-full rounded border border-line px-3 py-2.5 text-sm outline-none focus:border-gold-500"
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
              >
                <option value="all">Todos</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line px-3 py-2 text-xs font-black uppercase text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasMatchFilters}
              onClick={clearMatchFilters}
              type="button"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Limpiar
            </button>
          </div>

          {filteredMatches.map((match) => {
            const prediction = predictionByMatch[match.id];
            const draft = drafts[match.id] || {
              home_score: "",
              away_score: "",
              first_scorer_player_id: "",
            };
            const open = isPredictionOpen(match);
            const availablePlayers = matchPlayers(match);

            return (
              <article
                key={match.id}
                className="overflow-hidden rounded border border-line bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-line bg-fog/70 px-4 py-3">
                  <p className="min-w-0 break-words text-xs font-black uppercase text-gold-700">
                    {match.round_label || "Partido"}
                  </p>
                  <span
                    className={`shrink-0 rounded border px-2 py-1 text-[11px] font-black uppercase ${
                      open
                        ? "border-gold-400 bg-gold-50 text-ink"
                        : "border-line bg-white text-ink/55"
                    }`}
                  >
                    {open ? "Abierto" : "Cerrado"}
                  </span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] grid-rows-[4.5rem_2.5rem] items-start gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] sm:grid-rows-[5rem_2.75rem]">
                    <div className="grid size-[4.5rem] place-self-center rounded border border-line bg-white sm:size-20">
                      {teamLogo(teams, match.home_team_id) ? (
                        <img
                          alt=""
                          className="size-14 place-self-center object-contain drop-shadow-sm sm:size-16"
                          src={teamLogo(teams, match.home_team_id) || ""}
                        />
                      ) : null}
                    </div>
                    <div className="flex h-full items-center justify-center">
                      <p className="min-w-14 rounded bg-ink px-2 py-3 text-center text-sm font-black text-gold-400">
                        VS
                      </p>
                    </div>
                    <div className="grid size-[4.5rem] place-self-center rounded border border-line bg-white sm:size-20">
                      {teamLogo(teams, match.away_team_id) ? (
                        <img
                          alt=""
                          className="size-14 place-self-center object-contain drop-shadow-sm sm:size-16"
                          src={teamLogo(teams, match.away_team_id) || ""}
                        />
                      ) : null}
                    </div>
                    <p className="flex min-w-0 max-w-full items-start justify-center break-words text-center text-sm font-black leading-tight">
                      {teamName(teams, match.home_team_id)}
                    </p>
                    <span aria-hidden="true" />
                    <p className="flex min-w-0 max-w-full items-start justify-center break-words text-center text-sm font-black leading-tight">
                      {teamName(teams, match.away_team_id)}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded border border-line bg-fog px-2 py-3">
                      <p className="text-[11px] font-black uppercase text-ink/45">Fecha</p>
                      <p className="mt-1 text-xs font-bold text-ink/70">
                        {formatMatchDate(match.scheduled_at)}
                      </p>
                    </div>
                    <div className="rounded border border-line bg-white px-2 py-3">
                      <p className="text-[11px] font-black uppercase text-ink/45">Real</p>
                      <p
                        className={`mt-1 font-black ${
                          resultText(match) === "Pendiente"
                            ? "text-sm text-ink/55"
                            : "text-lg text-ink"
                        }`}
                      >
                        {resultText(match)}
                      </p>
                    </div>
                    <div
                      className={`rounded border px-2 py-3 ${
                        prediction?.points
                          ? "border-gold-400 bg-gold-50"
                          : "border-line bg-fog"
                      }`}
                    >
                      <p className="text-[11px] font-black uppercase text-ink/45">
                        Puntos
                      </p>
                      <p className="mt-1 text-lg font-black text-ink">
                        {prediction ? prediction.points : "-"}
                      </p>
                    </div>
                  </div>

                  <form className="mt-4 space-y-3" onSubmit={(event) => savePrediction(event, match)}>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                      <label>
                        <span className="mb-1 block text-xs font-black uppercase text-ink/55">
                          Local
                        </span>
                        <input
                          className="w-full rounded border border-line px-3 py-2.5 text-center text-sm font-black outline-none focus:border-gold-500 disabled:bg-fog disabled:text-ink/45"
                          disabled={!open}
                          min={0}
                          type="number"
                          value={draft.home_score}
                          onChange={(event) =>
                            updateDraft(match.id, "home_score", event.target.value)
                          }
                        />
                      </label>
                      <span className="pb-3 text-center text-sm font-black text-ink/35">-</span>
                      <label>
                        <span className="mb-1 block text-xs font-black uppercase text-ink/55">
                          Visitante
                        </span>
                        <input
                          className="w-full rounded border border-line px-3 py-2.5 text-center text-sm font-black outline-none focus:border-gold-500 disabled:bg-fog disabled:text-ink/45"
                          disabled={!open}
                          min={0}
                          type="number"
                          value={draft.away_score}
                          onChange={(event) =>
                            updateDraft(match.id, "away_score", event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase text-ink/55">
                        Primer goleador
                      </span>
                      <select
                        className="w-full rounded border border-line px-3 py-2.5 text-sm outline-none focus:border-gold-500 disabled:bg-fog disabled:text-ink/45"
                        disabled={!open || availablePlayers.length === 0}
                        value={draft.first_scorer_player_id}
                        onChange={(event) =>
                          updateDraft(match.id, "first_scorer_player_id", event.target.value)
                        }
                      >
                        <option value="">Sin elegir</option>
                        {availablePlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.first_name} {player.last_name} -{" "}
                            {teamName(teams, player.team_id)}
                          </option>
                        ))}
                      </select>
                      {prediction?.first_scorer_player_id ? (
                        <span className="mt-1 block text-xs text-ink/45">
                          Elegido: {playerName(players, prediction.first_scorer_player_id)}
                        </span>
                      ) : null}
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-black uppercase text-ink transition hover:border-ink hover:bg-fog"
                        onClick={() => setStatsMatchId(match.id)}
                        type="button"
                      >
                        <ChartNoAxesColumnIncreasing size={15} aria-hidden="true" />
                        Estadisticas
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded bg-gold-400 px-3 py-2.5 text-xs font-black uppercase text-ink transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!open || savingMatchId === match.id}
                        type="submit"
                      >
                        <Save size={15} aria-hidden="true" />
                        {savingMatchId === match.id
                          ? "Guardando"
                          : prediction
                            ? "Actualizar"
                            : "Guardar"}
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}
          {filteredMatches.length === 0 ? (
            <p className="rounded border border-line bg-white px-4 py-5 text-center text-sm font-bold text-ink/55">
              No hay partidos con esos filtros.
            </p>
          ) : null}
        </section>
      ) : null}

      {activeTab === "ranking" ? (
        <section className="rounded border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-gold-700">Ranking</p>
              <h2 className="text-2xl font-black uppercase">Clasificacion</h2>
            </div>
            <Trophy className="text-gold-500" size={28} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            {sortedLeaderboard.map((row, index) => (
              <div
                key={row.user_id}
                className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded border px-3 py-3 ${
                  row.user_id === user.id
                    ? "border-gold-400 bg-gold-50"
                    : "border-line bg-white"
                }`}
              >
                <span className="font-black text-gold-700">#{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    {row.display_name || `Usuario ${index + 1}`}
                  </p>
                  <p className="text-xs text-ink/50">
                    {row.predictions_count} resultados - {row.exact_scores} exactos
                  </p>
                </div>
                <span className="rounded bg-ink px-3 py-2 text-sm font-black text-gold-400">
                  {row.points}
                </span>
              </div>
            ))}
            {sortedLeaderboard.length === 0 ? (
              <p className="text-sm text-ink/60">Todavia no hay clasificacion.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "account" ? (
        <section className="rounded border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded bg-ink text-gold-400">
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black uppercase">Cuenta activa</h2>
          <p className="mt-2 text-sm text-ink/60">
            Nombre: <span className="font-bold text-ink">{user.display_name}</span>
          </p>
          <p className="mt-1 text-sm text-ink/60">
            DNI: <span className="font-bold text-ink">{user.dni}</span>
          </p>
          <button
            className="mt-5 rounded bg-ink px-4 py-3 text-sm font-black uppercase text-gold-400"
            onClick={logout}
            type="button"
          >
            Cerrar sesion
          </button>
        </section>
      ) : null}

      {selectedStatsMatch ? (
        <div
          className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
          onClick={() => setStatsMatchId(null)}
        >
          <div
            className="w-full max-w-xl animate-modal-in overflow-hidden rounded border border-line bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-black uppercase">Estadisticas de resultados</h2>
                <p className="text-xs text-ink/55">
                  {teamName(teams, selectedStatsMatch.home_team_id)} vs{" "}
                  {teamName(teams, selectedStatsMatch.away_team_id)}
                </p>
              </div>
              <button
                aria-label="Cerrar"
                className="rounded p-2 hover:bg-fog"
                onClick={() => setStatsMatchId(null)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded border border-line bg-fog px-4 py-3 text-sm">
                <span className="font-black">{selectedStats?.total_predictions || 0}</span>{" "}
                resultados registrados en este partido.
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: teamName(teams, selectedStatsMatch.home_team_id),
                    value: selectedStats?.home_win_count || 0,
                  },
                  { label: "Empate", value: selectedStats?.draw_count || 0 },
                  {
                    label: teamName(teams, selectedStatsMatch.away_team_id),
                    value: selectedStats?.away_win_count || 0,
                  },
                ].map((item) => {
                  const percent = statPercent(
                    item.value,
                    selectedStats?.total_predictions || 0
                  );

                  return (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between gap-3 text-xs font-bold">
                        <span className="min-w-0 break-words">{item.label}</span>
                        <span>
                          {percent}% ({item.value})
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-fog">
                        <div
                          className="h-full rounded bg-gold-400"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h3 className="mb-3 font-black uppercase">Resultados mas puestos</h3>
                <div className="space-y-2">
                  {(selectedStats?.top_scores || []).map((item, index) => (
                    <div
                      key={item.score}
                      className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded border border-line px-3 py-2"
                    >
                      <span className="text-sm font-black text-gold-700">
                        #{index + 1}
                      </span>
                      <span className="font-black">{item.score}</span>
                      <span className="rounded bg-ink px-2 py-1 text-xs font-black text-gold-400">
                        {item.count}
                      </span>
                    </div>
                  ))}
                  {(selectedStats?.top_scores || []).length === 0 ? (
                    <p className="text-sm text-ink/60">
                      Todavia no hay resultados suficientes.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
