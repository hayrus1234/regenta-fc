import { Router } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { fixtures } from "../db/schema/fixtures.js";
import { playoffFixtures } from "../db/schema/playoffs.js";
import { groupPlayers } from "../db/schema/groups.js";
import { tournaments } from "../db/schema/tournament.js";
import { players } from "../db/schema/players.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

/**
 * Stage resets intentionally cascade forward:
 * qualifying -> also removes Super League and Playoffs
 * super_league -> also removes Playoffs
 * playoffs -> removes only playoff fixtures/results
 */
router.post("/:stage", requireAdmin, async (req, res, next) => {
  try {
    const stage = String(req.params.stage);
    const [tournament] = await db.select().from(tournaments).limit(1);
    if (!tournament) return res.status(404).json({ error: "Tournament not initialized" });

    if (stage === "all") {
      await db.transaction(async (tx) => {
        await tx.delete(playoffFixtures).where(eq(playoffFixtures.tournamentId, tournament.id));
        await tx.delete(fixtures).where(eq(fixtures.tournamentId, tournament.id));
        await tx.delete(groupPlayers);
        // Fixtures are deleted first to satisfy player foreign keys; then remove the complete roster.
        await tx.delete(players);
        await tx.update(tournaments).set({ currentStage: "qualifying", updatedAt: new Date() }).where(eq(tournaments.id, tournament.id));
      });
      return res.json({ message: "Entire tournament reset completed. All fixtures, results, group assignments, player records and player statistics were deleted. Tournament setup, group definitions and announcements were kept.", reset: "all" });
    }

    if (stage === "qualifying") {
      await db.transaction(async (tx) => {
        await tx.delete(playoffFixtures).where(eq(playoffFixtures.tournamentId, tournament.id));
        await tx.delete(fixtures).where(and(eq(fixtures.tournamentId, tournament.id), inArray(fixtures.stage, ["qualifying", "super_league"])));
        await tx.update(tournaments).set({ currentStage: "qualifying", updatedAt: new Date() }).where(eq(tournaments.id, tournament.id));
      });
      return res.json({ message: "Group-stage results and all later-stage fixtures/results were reset. Group assignments were kept.", reset: "qualifying" });
    }

    if (stage === "super_league") {
      await db.transaction(async (tx) => {
        await tx.delete(playoffFixtures).where(eq(playoffFixtures.tournamentId, tournament.id));
        await tx.delete(fixtures).where(and(eq(fixtures.tournamentId, tournament.id), eq(fixtures.stage, "super_league")));
        await tx.update(tournaments).set({ currentStage: "super_league", updatedAt: new Date() }).where(eq(tournaments.id, tournament.id));
      });
      return res.json({ message: "Super League and Playoff fixtures/results were reset. Qualifying results were kept.", reset: "super_league" });
    }

    if (stage === "playoffs") {
      await db.delete(playoffFixtures).where(eq(playoffFixtures.tournamentId, tournament.id));
      await db.update(tournaments).set({ currentStage: "super_league", updatedAt: new Date() }).where(eq(tournaments.id, tournament.id));
      return res.json({ message: "Playoff fixtures/results were reset. Super League results were kept.", reset: "playoffs" });
    }

    return res.status(400).json({ error: "Unknown reset stage. Use all, qualifying, super_league, or playoffs." });
  } catch (error) { next(error); }
});

export default router;
