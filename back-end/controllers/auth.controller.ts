import { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../config/auth";

export async function getSession(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(200).json({ session: null, user: null });
      return;
    }

    res.status(200).json({
      session: session.session,
      user: session.user,
    });
  } catch (err) {
    console.error("/api/auth/session error", err);
    res.status(200).json({ session: null, user: null });
  }
}

export async function signOut(req: Request, res: Response) {
  try {
    const auth = getAuth();
    await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
    });

    res.status(200).json({ success: true, message: "Signed out successfully" });
  } catch (err) {
    console.error("/api/auth/sign-out error", err);
    res.status(500).json({ error: "sign_out_failed" });
  }
}
