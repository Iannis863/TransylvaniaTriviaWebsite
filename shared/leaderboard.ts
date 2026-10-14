// Scores are stored as hundredths to preserve exact decimal totals and ties.
export interface LeaderboardIdentity {
  id: string;
  name: string;
  nameKey: string;
  teamId: string | null;
}
export interface LeaderboardEdition {
  number: number;
  eventDate: string;
  scores: Record<string, number>;
}
export interface LeaderboardSeasonData {
  editions: LeaderboardEdition[];
}
export interface LeaderboardSeason {
  id: string;
  startYear: number;
  number: number;
  updatedAt: Date;
  data: LeaderboardSeasonData;
}
export interface PublicLeaderboard {
  seasons: { id: string; startYear: number; number: number; updatedAt: string; editions: { number: number; eventDate: string }[] }[];
  rows: { id: string; name: string; teamId: string | null; scores: Record<string, number>; total: number }[];
}
export function leaderboardNameKey(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ro-RO");
}
export function leaderboardScoreKey(seasonId: string, edition: number) { return `${seasonId}:e${edition}`; }
