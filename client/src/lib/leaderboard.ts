import { useQuery } from "@tanstack/react-query";
import type { PublicLeaderboard } from "@shared/leaderboard";

export function useLeaderboard(enabled = true) {
  return useQuery<PublicLeaderboard>({
    queryKey: ["leaderboard"],
    enabled,
    queryFn: async () => {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Leaderboard unavailable");
      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
