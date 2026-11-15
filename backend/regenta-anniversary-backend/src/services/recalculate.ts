import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { fixtures } from "../db/schema/fixtures.js";
import { groupPlayers } from "../db/schema/groups.js";
import { calculateStandings } from "../lib/standings.js";

export async function recalculateStage(tournamentId:number,stage:string,groupId:number|null) {
  const where = groupId === null
    ? and(eq(fixtures.tournamentId,tournamentId),eq(fixtures.stage,stage))
    : and(eq(fixtures.tournamentId,tournamentId),eq(fixtures.stage,stage),eq(fixtures.groupId,groupId));
  const matches=await db.select().from(fixtures).where(where);
  let ids:number[]=[];
  if(groupId!==null) ids=(await db.select().from(groupPlayers).where(eq(groupPlayers.groupId,groupId))).map(x=>x.playerId);
  else ids=[...new Set(matches.flatMap(m=>[m.playerAId,m.playerBId]))];
  return calculateStandings(ids,matches);
}
