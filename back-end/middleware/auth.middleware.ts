import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../config/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: "Admin" | "Lead" | "Member";
  teamId?: string;
  jobTitle?: string;
  isActive: boolean;
  lastUpdateSubmitted?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export async function protectedRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = session.user as SessionUser;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized – invalid session" });
  }
}

export function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== "Admin") {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  next();
}
