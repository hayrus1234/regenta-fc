import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { fixtures } from "../db/schema/fixtures.js";
import { tournaments } from "../db/schema/tournament.js";
import { playoffFixtures } from "../db/schema/playoffs.js";
import { calculateAwards } from "../lib/awards.js";
const router=Router();
router.get("/awards",async(_req,res,next)=>{try{
 const [t]=await db.select().from(tournaments).limit(1); if(!t)return res.json({goldenBoot:[],goldenGlove:[]});
 const rows=await db.select().from(fixtures).where(and(eq(fixtures.tournamentId,t.id),eq(fixtures.status,"completed")));
 const playoffRows=await db.select().from(playoffFixtures).where(and(eq(playoffFixtures.tournamentId,t.id),eq(playoffFixtures.status,"completed")));
 const eligible=[...rows,...playoffRows.filter(p=>p.playerAId!==null&&p.playerBId!==null).map(p=>({...p,playerAId:p.playerAId!,playerBId:p.playerBId!,stage:"playoffs"}))];
 res.json(calculateAwards(eligible));
}catch(e){next(e);}});
export default router;
