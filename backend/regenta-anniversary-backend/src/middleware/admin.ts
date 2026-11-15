import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
export type AdminRequest = Request & { adminId?: number };
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Admin authentication required" });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured");
    const payload = jwt.verify(token, secret) as { sub?: string };
    (req as AdminRequest).adminId = Number(payload.sub);
    if (!(req as AdminRequest).adminId) return res.status(401).json({ error: "Invalid token" });
    next();
  } catch { return res.status(401).json({ error: "Invalid or expired token" }); }
}
