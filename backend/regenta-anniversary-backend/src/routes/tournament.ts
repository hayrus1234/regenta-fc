import { Router } from "express";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { tournaments } from "../db/schema/tournament.js";
import { tournamentGroups, groupPlayers } from "../db/schema/groups.js";
import { players } from "../db/schema/players.js";
import { requireAdmin } from "../middleware/admin.js";
const router=Router();
router.get("/",async(_req,res,next)=>{try{res.json({tournament:(await db.select().from(tournaments).limit(1))[0]??null,groups:await db.select().from(tournamentGroups).orderBy(asc(tournamentGroups.code))});}catch(e){next(e);}});
router.post("/setup",requireAdmin,async(req,res,next)=>{
 try{
  const p=z.object({name:z.string().min(1).max(160).default("Regenta FC 1st Anniversary Solo Tournament"),groupCount:z.number().int().min(1).max(32).default(8),qualifiersPerGroup:z.number().int().min(1).max(32).default(4),playoffSlots:z.literal(8).default(8)}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:p.error.flatten()});
  const existing=await db.select().from(tournaments).limit(1);
  if(existing.length)return res.status(409).json({error:"Tournament already initialized"});
  const [t]=await db.insert(tournaments).values({...p.data,currentStage:"qualifying",awardsStartStage:"super_league"}).returning();
  const codes=Array.from({length:p.data.groupCount},(_,i)=>String.fromCharCode(65+i));
  const gs=await db.insert(tournamentGroups).values(codes.map(code=>({tournamentId:t!.id,code,name:`Group ${code}`}))).returning();
  res.status(201).json({tournament:t,groups:gs});
 }catch(e){next(e);}
});
// Return all configured groups, including groups with zero assigned players.
router.get("/groups/details",async(_req,res,next)=>{
 try{
  const rows = await db
   .select({
    groupId: tournamentGroups.id,
    code: tournamentGroups.code,
    name: tournamentGroups.name,
    playerId: players.id,
    displayName: players.displayName,
    isActive: players.isActive
   })
   .from(tournamentGroups)
   .leftJoin(groupPlayers, eq(groupPlayers.groupId, tournamentGroups.id))
   .leftJoin(players, eq(players.id, groupPlayers.playerId))
   .orderBy(asc(tournamentGroups.code), asc(players.displayName));

  const grouped = new Map<number, {
   groupId: number;
   code: string;
   name: string;
   players: Array<{id: number; displayName: string; isActive: boolean}>;
  }>();

  for (const row of rows) {
   if (!grouped.has(row.groupId)) {
    grouped.set(row.groupId, {
     groupId: row.groupId,
     code: row.code,
     name: row.name,
     players: []
    });
   }
   if (row.playerId !== null) {
    grouped.get(row.groupId)!.players.push({
     id: row.playerId,
     displayName: row.displayName ?? "",
     isActive: row.isActive ?? false
    });
   }
  }
  res.json([...grouped.values()]);
 }catch(e){next(e);}
});

router.post("/groups/:groupId/players",requireAdmin,async(req,res,next)=>{
 try{
  const groupId=Number(req.params.groupId);
  const p=z.object({playerId:z.number().int().positive()}).safeParse(req.body);
  if(!Number.isInteger(groupId)||groupId<1||!p.success)return res.status(400).json({error:"Invalid group or player"});
  const [player]=await db.select().from(players).where(eq(players.id,p.data.playerId));
  const [group]=await db.select().from(tournamentGroups).where(eq(tournamentGroups.id,groupId));
  if(!player||!player.isActive||!group)return res.status(404).json({error:"Active player or group not found"});
  const assigned=await db.select().from(groupPlayers).where(eq(groupPlayers.playerId,player.id));
  if(assigned.length)return res.status(409).json({error:"Player is already assigned to a group"});
  const [row]=await db.insert(groupPlayers).values({groupId,playerId:player.id}).returning();
  res.status(201).json(row);
 }catch(e){next(e);}
});
router.delete("/groups/:groupId/players/:playerId",requireAdmin,async(req,res,next)=>{
 try{
  const groupId=Number(req.params.groupId),playerId=Number(req.params.playerId);
  if(!Number.isInteger(groupId)||groupId<1||!Number.isInteger(playerId)||playerId<1)return res.status(400).json({error:"Invalid group or player"});
  const removed=await db.delete(groupPlayers).where(and(eq(groupPlayers.groupId,groupId),eq(groupPlayers.playerId,playerId))).returning();
  if(!removed.length)return res.status(404).json({error:"Player assignment not found"});
  res.json({message:"Player removed from group. Player remains active and unassigned."});
 }catch(e){next(e);}
});
router.post("/groups/auto-assign",requireAdmin,async(_req,res,next)=>{
 try{
  const allPlayers=await db.select().from(players).where(eq(players.isActive,true)).orderBy(asc(players.id));
  const groups=await db.select().from(tournamentGroups).orderBy(asc(tournamentGroups.code));
  if(!groups.length)return res.status(400).json({error:"Initialize tournament groups first"});
  const assigned=await db.select().from(groupPlayers);
  const already=new Set(assigned.map(x=>x.playerId));
  const pending=allPlayers.filter(p=>!already.has(p.id));
  const counts=new Map<number,number>(groups.map(g=>[g.id,assigned.filter(a=>a.groupId===g.id).length]));
  const values:any[]=[];
  for(const player of pending){
    const target=[...groups].sort((a,b)=>(counts.get(a.id)??0)-(counts.get(b.id)??0))[0]!;
    values.push({groupId:target.id,playerId:player.id}); counts.set(target.id,(counts.get(target.id)??0)+1);
  }
  if(values.length)await db.insert(groupPlayers).values(values);
  res.json({assigned:values.length,totalPlayers:allPlayers.length,groups:groups.map(g=>({group:g.code,players:counts.get(g.id)}))});
 }catch(e){next(e);}
});
export default router;
