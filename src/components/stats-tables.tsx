"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type StatRow = {
  playerId: string;
  playerName: string;
  teamName: string;
  goals: number;
  yellowCards: number;
  redCards: number;
};

type StatsTablesProps = {
  scorerRows: StatRow[];
  cardRows: StatRow[];
};

function FilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45"
        size={16}
        aria-hidden="true"
      />
      <input
        className="w-full rounded border border-line py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold-500"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function StatsTables({ scorerRows, cardRows }: StatsTablesProps) {
  const [scorerQuery, setScorerQuery] = useState("");
  const [cardQuery, setCardQuery] = useState("");

  const filteredScorers = useMemo(() => {
    const query = scorerQuery.trim().toLowerCase();
    return scorerRows.filter((row) => row.playerName.toLowerCase().includes(query));
  }, [scorerQuery, scorerRows]);

  const filteredCards = useMemo(() => {
    const query = cardQuery.trim().toLowerCase();
    return cardRows.filter((row) => row.playerName.toLowerCase().includes(query));
  }, [cardQuery, cardRows]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="rounded border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 space-y-3">
          <h2 className="text-xl font-black uppercase">Maximos goleadores</h2>
          <FilterInput
            value={scorerQuery}
            onChange={setScorerQuery}
            placeholder="Filtrar por jugador"
          />
        </div>
        <div className="max-h-[42rem] overflow-y-auto pr-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-fog text-xs uppercase text-ink/55">
              <tr>
                <th className="px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Jugador</th>
                <th className="px-3 py-3 text-right">Goles</th>
              </tr>
            </thead>
            <tbody>
              {filteredScorers.map((row, index) => (
                <tr key={row.playerId} className="border-t border-line">
                  <td className="px-3 py-3 font-black text-gold-700">{index + 1}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold">{row.playerName}</p>
                    <p className="text-xs text-ink/55">{row.teamName}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-black">{row.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 space-y-3">
          <h2 className="text-xl font-black uppercase">Tarjetas</h2>
          <FilterInput
            value={cardQuery}
            onChange={setCardQuery}
            placeholder="Filtrar por jugador"
          />
        </div>
        <div className="max-h-[42rem] overflow-y-auto pr-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-fog text-xs uppercase text-ink/55">
              <tr>
                <th className="px-3 py-3 text-left">Jugador</th>
                <th className="px-3 py-3 text-center">Amarillas</th>
                <th className="px-3 py-3 text-center">Rojas</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((row) => (
                <tr key={row.playerId} className="border-t border-line">
                  <td className="px-3 py-3">
                    <p className="font-bold">{row.playerName}</p>
                    <p className="text-xs text-ink/55">{row.teamName}</p>
                  </td>
                  <td className="px-3 py-3 text-center font-black">{row.yellowCards}</td>
                  <td className="px-3 py-3 text-center font-black">{row.redCards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
