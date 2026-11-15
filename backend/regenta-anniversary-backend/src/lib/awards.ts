import type { ResultFixture } from "./standings.js";

/** Awards include Super League and Playoffs only. Golden Glove ranks by fewest goals conceded; clean sheets break ties. */
export function calculateAwards(matches: (ResultFixture & { stage: string })[]) {
  const goals = new Map<number, number>();
  const goalsConceded = new Map<number, number>();
  const cleanSheets = new Map<number, number>();
  const appearances = new Set<number>();

  for (const m of matches) {
    if (m.status !== "completed" || m.goalsA === null || m.goalsB === null) continue;
    if (m.stage !== "super_league" && m.stage !== "playoffs") continue;

    appearances.add(m.playerAId);
    appearances.add(m.playerBId);
    goals.set(m.playerAId, (goals.get(m.playerAId) ?? 0) + m.goalsA);
    goals.set(m.playerBId, (goals.get(m.playerBId) ?? 0) + m.goalsB);
    goalsConceded.set(m.playerAId, (goalsConceded.get(m.playerAId) ?? 0) + m.goalsB);
    goalsConceded.set(m.playerBId, (goalsConceded.get(m.playerBId) ?? 0) + m.goalsA);
    if (m.goalsB === 0) cleanSheets.set(m.playerAId, (cleanSheets.get(m.playerAId) ?? 0) + 1);
    if (m.goalsA === 0) cleanSheets.set(m.playerBId, (cleanSheets.get(m.playerBId) ?? 0) + 1);
  }

  return {
    goldenBoot: [...goals].map(([playerId, goals]) => ({ playerId, goals }))
      .sort((a,b) => b.goals-a.goals || a.playerId-b.playerId),
    goldenGlove: [...appearances].map(playerId => ({
      playerId,
      goalsConceded: goalsConceded.get(playerId) ?? 0,
      cleanSheets: cleanSheets.get(playerId) ?? 0
    })).sort((a,b) => a.goalsConceded-b.goalsConceded || b.cleanSheets-a.cleanSheets || a.playerId-b.playerId)
  };
}
