export type TournamentStatus = "draft" | "active" | "finished";

export type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: TournamentStatus;
  created_at: string;
  updated_at: string;
};

export type Stage = {
  id: string;
  tournament_id: string;
  name: string;
  type: "groups" | "knockout";
  order_index: number;
  created_at: string;
  updated_at: string;
};
