import { Router } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { fixtures } from "../db/schema/fixtures.js";
import { groupPlayers, tournamentGroups } from "../db/schema/groups.js";
import { players } from "../db/schema/players.js";
import { tournaments } from "../db/schema/tournament.js";
import { requireAdmin } from "../middleware/admin.js";
import { generateRoundRobin } from "../lib/round-robin.js";
import { recalculateStage } from "../services/recalculate.js";
const router=Router();
router.get("/",async(req,res,next)=>{try{
 const stage=typeof req.query.stage==="string"?req.query.stage:undefined;
 const groupId=typeof req.query.groupId==="string"?Number(req.query.groupId):undefined;
 const filters=[]; if(stage)filters.push(eq(fixtures.stage,stage)); if(groupId)filters.push(eq(fixtures.groupId,groupId));
 const rows=filters.length?await db.select().from(fixtures).where(and(...filters)).orderBy(asc(fixtures.matchDay),asc(fixtures.id)):await db.select().from(fixtures).orderBy(asc(fixtures.matchDay),asc(fixtures.id));
 res.json(rows);
}catch(e){next(e);}});
router.post("/generate/qualifying",requireAdmin,async(_req,res,next)=>{try{
 const [t]=await db.select().from(tournaments).limit(1); if(!t)return res.status(400).json({error:"Initialize tournament first"});
 const groups=await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId,t.id)).orderBy(asc(tournamentGroups.code));
 const created:any[]=[];
 for(const g of groups){
  const members=await db.select({playerId:groupPlayers.playerId}).from(groupPlayers).where(eq(groupPlayers.groupId,g.id));
  if(members.length<2)continue;
  const generated=generateRoundRobin(members.map(x=>x.playerId));
  const existing=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,"qualifying"),eq(fixtures.groupId,g.id)));
  if(existing.length)continue; // never silently overwrite history
  if(generated.length)created.push(...generated.map(f=>({...f,tournamentId:t.id,stage:"qualifying",groupId:g.id,status:"upcoming"})));
 }
 if(created.length)await db.insert(fixtures).values(created);
 res.status(201).json({created:created.length,fixtures:created});
}catch(e){next(e);}});
router.post("/generate/super-league",requireAdmin,async(_req,res,next)=>{try{
 const [t]=await db.select().from(tournaments).limit(1); if(!t)return res.status(400).json({error:"Tournament not initialized"});
 const existing=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,"super_league")));
 if(existing.length)return res.status(409).json({error:"Super League fixtures already exist; reset must be an explicit separate operation"});
 const gs=await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId,t.id));
 if(gs.length!==8)return res.status(409).json({error:"The solo tournament requires all 8 qualifying groups (A–H)."});
 const qualifying=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,"qualifying")));
 if(!qualifying.length)return res.status(409).json({error:"Generate qualifying fixtures before moving to the Super League."});
 if(qualifying.some(f=>f.status!=="completed"))return res.status(409).json({error:"Complete all qualifying fixtures before generating Super League."});
 for(const g of gs){if(!qualifying.some(f=>f.groupId===g.id))return res.status(409).json({error:`Group ${g.code} has no generated fixtures.`});}
 const members=await db.select().from(groupPlayers).where(inArray(groupPlayers.groupId,gs.map(g=>g.id)));
 const matches=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.stage,"qualifying"),eq(fixtures.status,"completed")));
 const ids=[...new Set(members.map(m=>m.playerId))];
 const {calculateStandings}=await import("../lib/standings.js");
 const ranking=calculateStandings(ids,matches);
 const qualifiedByGroup:number[]=[];
 for(const g of gs){
  const groupIds=members.filter(m=>m.groupId===g.id).map(m=>m.playerId);
  const groupRows=calculateStandings(groupIds,matches.filter(f=>groupIds.includes(f.playerAId)&&groupIds.includes(f.playerBId)));
  qualifiedByGroup.push(...groupRows.slice(0,t.qualifiersPerGroup).map(r=>r.playerId));
 }
 if(qualifiedByGroup.length!==32)return res.status(400).json({error:`Expected 32 qualified players (4 from each of 8 groups), found ${qualifiedByGroup.length}. Check group assignments and standings.`});
 const generated=generateRoundRobin(qualifiedByGroup);
 await db.insert(fixtures).values(generated.map(f=>({...f,tournamentId:t.id,stage:"super_league",groupId:null,status:"upcoming"})));
 await db.update(tournaments).set({currentStage:"super_league",updatedAt:new Date()}).where(eq(tournaments.id,t.id));
 res.status(201).json({qualifiedPlayers:qualifiedByGroup.length,qualifiedPlayerIds:qualifiedByGroup,fixtureCount:generated.length,currentStage:"super_league"});
}catch(e){next(e);}});
const scoreSchema=z.object({goalsA:z.number().int().min(0).max(99),goalsB:z.number().int().min(0).max(99),notes:z.string().max(1000).optional()});
router.patch("/:id/score",requireAdmin,async(req,res,next)=>{try{
 const id=Number(req.params.id); const p=scoreSchema.safeParse(req.body);
 if(!Number.isInteger(id)||id<1||!p.success)return res.status(400).json({error:p.success?"Invalid fixture ID":p.error.flatten()});
 const [old]=await db.select().from(fixtures).where(eq(fixtures.id,id)); if(!old)return res.status(404).json({error:"Fixture not found"});
 const [updated]=await db.update(fixtures).set({...p.data,status:"completed",playedAt:new Date(),updatedAt:new Date()}).where(eq(fixtures.id,id)).returning();
 await recalculateStage(updated!.tournamentId,updated!.stage,updated!.groupId);
 res.json(updated);
}catch(e){next(e);}});
router.patch("/:id/reset-score",requireAdmin,async(req,res,next)=>{try{
 const id=Number(req.params.id); const [old]=await db.select().from(fixtures).where(eq(fixtures.id,id)); if(!old)return res.status(404).json({error:"Fixture not found"});
 const [updated]=await db.update(fixtures).set({goalsA:null,goalsB:null,status:"upcoming",playedAt:null,updatedAt:new Date()}).where(eq(fixtures.id,id)).returning();
 await recalculateStage(updated!.tournamentId,updated!.stage,updated!.groupId); res.json(updated);
}catch(e){next(e);}});
export default router;
