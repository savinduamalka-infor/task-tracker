import { Request, Response } from "express";
import Team from "../models/team.model";

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const team = new Team({
      name,
      description,
      createdBy: user.id,
      members: [user.id],
    });

    await team.save();

    res.status(201).json({
      message: "Team created successfully",
      team,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
