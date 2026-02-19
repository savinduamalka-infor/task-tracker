import { Request, Response } from "express";
import Team from "../models/team.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";

// controllers/team.controller.ts
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name?.trim()) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return res.status(409).json({ message: "Team already exists" });
    }

    // 1. Create team with creator as first member
    const team = new Team({
      name,
      description,
      createdBy: user.id,
      members: [user.id],
    });

    await team.save();

    // Use raw MongoDB driver because better-auth stores _id as ObjectId
    // but the Mongoose User model defines _id as String, causing a mismatch
    const db = mongoose.connection.db!;
    await db.collection("user").updateOne(
      { _id: new mongoose.Types.ObjectId(user.id) },
      { $set: { teamId: team._id.toString() } }
    );

    res.status(201).json({
      message: "Team created successfully",
      team,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params as any;
    const user = (req as any).user;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.includes(user.id);
    if (user.role !== "Lead" && team.createdBy !== user.id && !isMember) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = mongoose.connection.db!;
    const memberObjectIds = team.members.map((m: string) => new mongoose.Types.ObjectId(m));
    const members = await db.collection("user").find(
      { _id: { $in: memberObjectIds } },
      { projection: { _id: 1, name: 1, email: 1, role: 1, teamId: 1, jobTitle: 1, isActive: 1, createdAt: 1, updatedAt: 1 } }
    ).toArray();

    res.status(200).json({ teamId: team._id, teamName: team.name, members });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params as any;
    const { memberId } = req.body;

    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!memberId) return res.status(400).json({ message: "memberId is required" });

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (team.members.includes(memberId)) {
      return res.status(400).json({ message: "Member already in team" });
    }

    team.members.push(memberId);
    await team.save();

    const db = mongoose.connection.db!;
    await db.collection("user").updateOne(
      { _id: new mongoose.Types.ObjectId(memberId) },
      { $set: { teamId: teamId.toString() } }
    );
    
    const db2 = mongoose.connection.db!;
    const updatedMemberOids = team.members.map((m: string) => new mongoose.Types.ObjectId(m));
    const updatedMembers = await db2.collection("user").find(
      { _id: { $in: updatedMemberOids } },
      { projection: { _id: 1, name: 1, email: 1, role: 1, teamId: 1, jobTitle: 1, isActive: 1 } }
    ).toArray();
    
    res.status(200).json({ message: "Member added", team, members: updatedMembers });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId, memberId } = req.params as any;

    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!team.members.includes(memberId)) {
      return res.status(404).json({ message: "Member not found in team" });
    }

    team.members = team.members.filter((m: string) => m !== memberId);
    await team.save();

    const db = mongoose.connection.db!;
    await db.collection("user").updateOne(
      { _id: new mongoose.Types.ObjectId(memberId) },
      { $set: { teamId: null } }
    );

    res.status(200).json({ message: "Member removed", team });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getAllTeams = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const teams = await Team.find();
    res.status(200).json({ teams });
  } catch (error) {
    console.error("Get teams error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getTeamById = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const user = (req as any).user;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    res.status(200).json({ team });
  } catch (error) {
    console.error("Get team error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;
    const user = (req as any).user;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;

    await team.save();
    res.status(200).json({ message: "Team updated", team });
  } catch (error) {
    console.error("Update team error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const user = (req as any).user;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = mongoose.connection.db!;
    const memberObjectIds = team.members.map((m: string) => new mongoose.Types.ObjectId(m));
    await db.collection("user").updateMany(
      { _id: { $in: memberObjectIds } },
      { $set: { teamId: null } }
    );

    await Team.findByIdAndDelete(teamId);
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

