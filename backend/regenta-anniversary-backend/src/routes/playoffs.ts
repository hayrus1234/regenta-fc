import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { playoffFixtures } from "../db/schema/playoffs.js";
import { fixtures } from "../db/schema/fixtures.js";
import { tournaments } from "../db/schema/tournament.js";
import { calculateStandings } from "../lib/standings.js";
import { requireAdmin } from "../middleware/admin.js";
const router=Router();
router.get("/",async(_req,res,next)=>{try{const [t]=await db.select().from(tournaments).limit(1);if(!t)return res.json([]);res.json(await db.select().from(playoffFixtures).where(eq(playoffFixtures.tournamentId,t.id)).orderBy(asc(playoffFixtures.id)));}catch(e){next(e);}});
router.post("/generate",requireAdmin,async(_req,res,next)=>{try{
 const [t]=await db.select().from(tournaments).limit(1);if(!t)return res.status(400).json({error:"Tournament not initialized"});
 const existing=await db.select().from(playoffFixtures).where(eq(playoffFixtures.tournamentId,t.id));if(existing.length)return res.status(409).json({error:"Playoffs already generated"});
 const ms=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,"super_league")));
 if(!ms.length||ms.some(m=>m.status!=="completed"))return res.status(409).json({error:"Complete all Super League fixtures first"});
 const ids=[...new Set(ms.flatMap(m=>[m.playerAId,m.playerBId]))];const top=calculateStandings(ids,ms).slice(0,8);
 if(top.length!==8)return res.status(400).json({error:"Eight eligible players are required"});
 const qfPairs: [number, number][] = [
  [0, 7],
  [3, 4],
  [1, 6],
  [2, 5],
];
 const qfs=qfPairs.map(([a,b],i)=>({tournamentId:t.id,round:"quarterfinal",slot:i+1,playerAId:top[a]!.playerId,playerBId:top[b]!.playerId}));
 const rows=await db.insert(playoffFixtures).values([...qfs,{tournamentId:t.id,round:"semifinal",slot:1},{tournamentId:t.id,round:"semifinal",slot:2},{tournamentId:t.id,round:"final",slot:1}]).returning();
 await db.update(tournaments).set({currentStage:"playoffs",updatedAt:new Date()}).where(eq(tournaments.id,t.id));res.status(201).json({qualified:top,fixtures:rows});
}catch(e){next(e);}});
const resultSchema=z.object({goalsA:z.number().int().min(0).max(99),goalsB:z.number().int().min(0).max(99)});
router.patch("/:id/score",requireAdmin,async(req,res,next)=>{try{
 const id=Number(req.params.id),p=resultSchema.safeParse(req.body);if(!Number.isInteger(id)||!p.success)return res.status(400).json({error:"Invalid playoff result"});
 const [f]=await db.select().from(playoffFixtures).where(eq(playoffFixtures.id,id));if(!f)return res.status(404).json({error:"Fixture not found"});
 if(!f.playerAId||!f.playerBId)return res.status(409).json({error:"Both playoff participants must be determined"});
 if(p.data.goalsA===p.data.goalsB)return res.status(400).json({error:"Playoff matches cannot end in a draw; submit the final result after any tiebreak"});
 const winnerId=p.data.goalsA>p.data.goalsB?f.playerAId:f.playerBId;
 const [updated]=await db.update(playoffFixtures).set({...p.data,winnerId,status:"completed",updatedAt:new Date()}).where(eq(playoffFixtures.id,id)).returning();
 const round=f.round;
 if(round==="quarterfinal"){
  const sfSlot=Math.ceil(f.slot/2),side=f.slot%2===1?"A":"B";
  const [sf]=await db.select().from(playoffFixtures).where(and(eq(playoffFixtures.tournamentId,f.tournamentId),eq(playoffFixtures.round,"semifinal"),eq(playoffFixtures.slot,sfSlot)));
  if(sf)await db.update(playoffFixtures).set(side==="A"?{playerAId:winnerId}:{playerBId:winnerId}).where(eq(playoffFixtures.id,sf.id));
 } else if(round==="semifinal"){
  const [final]=await db.select().from(playoffFixtures).where(and(eq(playoffFixtures.tournamentId,f.tournamentId),eq(playoffFixtures.round,"final")));
  if(final)await db.update(playoffFixtures).set(f.slot===1?{playerAId:winnerId}:{playerBId:winnerId}).where(eq(playoffFixtures.id,final.id));
 }
 res.json(updated);
}catch(e){next(e);}});
export default router;
