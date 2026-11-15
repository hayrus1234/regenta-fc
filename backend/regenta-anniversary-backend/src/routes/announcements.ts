import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { announcements } from "../db/schema/announcements.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

// Public visitors can only see published announcements.
router.get("/", async (_req, res, next) => {
  try {
    res.json(await db.select().from(announcements)
      .where(eq(announcements.isPublished, true))
      .orderBy(desc(announcements.createdAt)));
  } catch (e) { next(e); }
});

// Admin-only list includes both published posts and drafts.
router.get("/admin", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await db.select().from(announcements).orderBy(desc(announcements.createdAt)));
  } catch (e) { next(e); }
});

router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({
      title: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1),
      isPublished: z.boolean().default(false)
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const [row] = await db.insert(announcements).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid announcement ID." });
    const parsed = z.object({
      title: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1),
      isPublished: z.boolean()
    }).partial().refine(value => Object.keys(value).length > 0, "Provide at least one field to update.").safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const [row] = await db.update(announcements)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(announcements.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Announcement not found." });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid announcement ID." });
    const [row] = await db.delete(announcements).where(eq(announcements.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Announcement not found." });
    res.json({ message: "Announcement deleted.", id: row.id });
  } catch (e) { next(e); }
});

export default router;
