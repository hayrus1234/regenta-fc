export type GeneratedFixture = { playerAId: number; playerBId: number; matchDay: number };

/** Circle-method round robin. Supports any participant count >= 2. */
export function generateRoundRobin(playerIds: number[]): GeneratedFixture[] {
  if (new Set(playerIds).size !== playerIds.length) throw new Error("Duplicate player IDs are not allowed");
  if (playerIds.length < 2) return [];
  const rotation: number[] = [...playerIds];
  if (rotation.length % 2) rotation.push(-1); // bye
  const rounds = rotation.length - 1;
  const result: GeneratedFixture[] = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < rotation.length / 2; i++) {
      const a = rotation[i]!;
      const b = rotation[rotation.length - 1 - i]!;
      if (a !== -1 && b !== -1) result.push({ playerAId: a, playerBId: b, matchDay: r + 1 });
    }
    const last = rotation.pop()!;
    rotation.splice(1, 0, last);
  }
  return result;
}
