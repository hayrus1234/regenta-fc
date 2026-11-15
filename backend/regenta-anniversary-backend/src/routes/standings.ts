import { Router } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db } from "../db/client.js";
import { fixtures } from "../db/schema/fixtures.js";
import { groupPlayers, tournamentGroups } from "../db/schema/groups.js";
import { tournaments } from "../db/schema/tournament.js";
import { calculateStandings } from "../lib/standings.js";
const router=Router();
router.get("/",async(req,res,next)=>{try{
 const stage=typeof req.query.stage==="string"?req.query.stage:"qualifying";
 const groupId=req.query.groupId?Number(req.query.groupId):undefined;
 const [t]=await db.select().from(tournaments).limit(1); if(!t)return res.json([]);
 let ids:number[]=[];
 if(stage==="qualifying"){
  const groups=await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId,t.id));
  const selected=groupId?groups.filter(g=>g.id===groupId):groups;
  const out=[];
  for(const g of selected){const members=await db.select().from(groupPlayers).where(eq(groupPlayers.groupId,g.id));const ms=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,stage),eq(fixtures.groupId,g.id)));out.push({group:g.code,standings:calculateStandings(members.map(x=>x.playerId),ms)});}
  return res.json(out);
 }
 const ms=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,stage))).orderBy(asc(fixtures.matchDay));
 ids=[...new Set(ms.flatMap(m=>[m.playerAId,m.playerBId]))];
 res.json(calculateStandings(ids,ms));
}catch(e){next(e);}});
export default router;
