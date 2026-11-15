export type ResultFixture = { playerAId: number; playerBId: number; goalsA: number | null; goalsB: number | null; status: string };
export type Standing = { playerId: number; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };

export function calculateStandings(playerIds: number[], matches: ResultFixture[]): Standing[] {
  const rows = new Map<number, Standing>();
  for (const id of playerIds) rows.set(id, { playerId: id, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 });
  for (const m of matches) {
    if (m.status !== "completed" || m.goalsA === null || m.goalsB === null) continue;
    const a = rows.get(m.playerAId), b = rows.get(m.playerBId);
    if (!a || !b) continue;
    a.played++; b.played++;
    a.goalsFor += m.goalsA; a.goalsAgainst += m.goalsB;
    b.goalsFor += m.goalsB; b.goalsAgainst += m.goalsA;
    if (m.goalsA > m.goalsB) { a.wins++; a.points += 3; b.losses++; }
    else if (m.goalsB > m.goalsA) { b.wins++; b.points += 3; a.losses++; }
    else { a.draws++; b.draws++; a.points++; b.points++; }
  }
  return [...rows.values()].map(r => ({ ...r, goalDifference: r.goalsFor - r.goalsAgainst }))
    .sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor || a.playerId-b.playerId);
}
