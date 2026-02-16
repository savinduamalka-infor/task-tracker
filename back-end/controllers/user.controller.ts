import { Request, Response } from "express";

export function getMe(req: Request, res: Response) {
  res.json({ user: req.user });
}

export function getAdminDashboard(req: Request, res: Response) {
  res.json({
    message: "Welcome to the admin dashboard",
    user: req.user,
  });
}
