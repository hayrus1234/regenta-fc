import { Router } from "express";
import { z } from "zod";
import { asc, eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { players } from "../db/schema/players.js";
import { groupPlayers } from "../db/schema/groups.js";
import { fixtures } from "../db/schema/fixtures.js";
import { playoffFixtures } from "../db/schema/playoffs.js";
import { requireAdmin } from "../middleware/admin.js";
const router = Router();
router.get("/", async (_req,res,next) => { try { res.json(await db.select().from(players).orderBy(asc(players.displayName))); } catch(e){next(e);} });
router.post("/", requireAdmin, async (req,res,next) => {
  try {
    const p = z.object({ displayName:z.string().trim().min(1).max(100), gameUid:z.string().max(80).optional(), contact:z.string().max(80).optional(), avatarUrl:z.string().url().optional() }).safeParse(req.body);
    if(!p.success) return res.status(400).json({error:p.error.flatten()});
    const [created] = await db.insert(players).values(p.data).returning(); res.status(201).json(created);
  } catch(e){next(e);}
});
router.patch("/:id", requireAdmin, async(req,res,next)=>{
  try {
    const id=Number(req.params.id); if(!Number.isInteger(id)||id<1) return res.status(400).json({error:"Invalid player ID"});
    const p=z.object({displayName:z.string().trim().min(1).max(100).optional(),gameUid:z.string().max(80).nullable().optional(),contact:z.string().max(80).nullable().optional(),avatarUrl:z.string().url().nullable().optional(),isActive:z.boolean().optional()}).strict().safeParse(req.body);
    if(!p.success) return res.status(400).json({error:p.error.flatten()});
    const [updated]=await db.update(players).set({...p.data,updatedAt:new Date()}).where(eq(players.id,id)).returning();
    if(!updated) return res.status(404).json({error:"Player not found"}); res.json(updated);
  }catch(e){next(e);}
});
router.delete("/", requireAdmin, async(_req,res,next)=>{
  try {
    // Full roster reset: remove match data first to satisfy player foreign keys,
    // then clear group assignments and player rows in one transaction.
    const result = await db.transaction(async (tx) => {
      const removedPlayoffs = await tx.delete(playoffFixtures).returning({ id: playoffFixtures.id });
      const removedFixtures = await tx.delete(fixtures).returning({ id: fixtures.id });
      await tx.delete(groupPlayers);
      const removedPlayers = await tx.delete(players).returning({ id: players.id });
      return { players: removedPlayers.length, fixtures: removedFixtures.length, playoffFixtures: removedPlayoffs.length };
    });
    res.json({
      message: `Roster reset complete. Deleted ${result.players} player(s), ${result.fixtures} group/Super League fixture(s), and ${result.playoffFixtures} playoff fixture(s).`,
      ...result
    });
  } catch(e){next(e);}
});
router.delete("/:id", requireAdmin, async(req,res,next)=>{
  try {
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<1) return res.status(400).json({error:"Invalid player ID"});

    // Permanent removal: delete every fixture involving this player, including
    // playoff rows where they appeared as a participant or recorded winner.
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: players.id, displayName: players.displayName })
        .from(players).where(eq(players.id,id)).limit(1);
      if(!existing) return null;

      const removedPlayoffs = await tx.delete(playoffFixtures)
        .where(or(
          eq(playoffFixtures.playerAId,id),
          eq(playoffFixtures.playerBId,id),
          eq(playoffFixtures.winnerId,id)
        )).returning({ id: playoffFixtures.id });
      const removedFixtures = await tx.delete(fixtures)
        .where(or(eq(fixtures.playerAId,id),eq(fixtures.playerBId,id)))
        .returning({ id: fixtures.id });
      await tx.delete(groupPlayers).where(eq(groupPlayers.playerId,id));
      await tx.delete(players).where(eq(players.id,id));
      return {
        player: existing,
        deletedFixtures: removedFixtures.length,
        deletedPlayoffFixtures: removedPlayoffs.length
      };
    });

    if(!result) return res.status(404).json({error:"Player not found"});
    res.json({
      message: `Player ${result.player.displayName} permanently deleted with all associated match records.`,
      ...result
    });
  }catch(e){next(e);}
});
export default router;
