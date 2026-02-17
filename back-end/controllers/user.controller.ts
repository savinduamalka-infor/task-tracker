import { Request, Response } from "express";
import { User } from "../models/user.model.js";

export function getMe(req: Request, res: Response) {
  res.json({ user: req.user });
}

export function getAdminDashboard(req: Request, res: Response) {
  res.json({
    message: "Welcome to the admin dashboard",
    user: req.user,
  });
}

export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await User.find().select("_id name email role jobTitle teamId");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
}
