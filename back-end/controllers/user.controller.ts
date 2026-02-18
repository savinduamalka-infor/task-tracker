import { Request, Response } from "express";
import { User } from "../models/user.model";

export function getMe(req: Request, res: Response) {
  res.json({ user: req.user });
}

export function getAdminDashboard(req: Request, res: Response) {
  res.json({
    message: "Welcome to the admin dashboard",
    user: req.user,
  });
}

export const getUsersWithoutTeam = async (req: Request, res: Response) => {
  try {
    const users = await User.find({
      $or: [
        { teamId: null },
        { teamId: { $exists: false } },
        { teamId: "" },
      ],
    }).select("_id name email role jobTitle");

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

