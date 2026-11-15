import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { admins } from "../db/schema/admins.js";
const router = Router();
router.post("/login", async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const [admin] = await db.select().from(admins).where(eq(admins.email, parsed.data.email.toLowerCase()));
    if (!admin || !admin.isActive || !(await bcrypt.compare(parsed.data.password, admin.passwordHash))) return res.status(401).json({ error: "Invalid credentials" });
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(admin.id), expiresIn: "8h" });
    res.json({ token, expiresIn: 28800, admin: { id: admin.id, email: admin.email } });
  } catch (e) { next(e); }
});
export default router;
