import { Request, Response } from "express";
import Team from "../models/team.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";

// controllers/team.controller.ts
export const createTeam = async (req: Request, res: Response) => {
  try {
    console.log("Request received");
    const { name, description, members = [] } = req.body; // ← accept members
    const user = (req as any).user;

    if (!user) {
      console.log("Unauthorized request");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name?.trim()) {
      return res.status(400).json({ message: "Team name is required" });
    }

    // 1. Create team with creator as first member
    const team = new Team({
      name,
      description,
      createdBy: user.id,
      members: [user.id],
    });

    // 2. Handle initial members (if provided)
    if (members.length > 0) {
      for (const m of members) {
        if (!m.name?.trim() || !m.jobTitle?.trim()) continue;

        // Check if user with this name already exists (very basic check)
        // In real apps → better to use email or unique identifier
        let teamMember = await User.findOne({ name: m.name });

        if (!teamMember) {
          teamMember = new User({
            name: m.name,
            jobTitle: m.jobTitle,
        
            role: "Member",           
            isActive: false,          
            teamId: team._id,
          });

          await teamMember.save();
        }

        // Add to team only if not already there
        if (!team.members.includes(teamMember._id.toString())) {
          team.members.push(teamMember._id.toString());
        }
      }
    }

    await team.save();
    console.log(`team created with ID: ${team._id}`);
    console.log(`Total team members: ${team.members.length}`);

    // Ensure creator has a local User document and set their teamId
    let creatorDoc = await User.findById(user.id);
    if (!creatorDoc) {
      creatorDoc = new User({
        _id: user.id,
        email: user.email || undefined,
        name: user.name || "",
        role: user.role || "Lead",
        teamId: team._id,
        jobTitle: user.jobTitle || null,
        isActive: true,
        emailVerified: user.emailVerified || false,
        image: user.image || undefined,
      });
      await creatorDoc.save();
    } else {
      await User.findByIdAndUpdate(user.id, { teamId: team._id });
    }

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

    
console.log("=== MODEL & COLLECTION DIAGNOSTIC ===");
console.log("Model name:            ", User.modelName);
console.log("Collection name:       ", User.collection?.name || "undefined");
console.log("Mongoose connection DB:", User.db.name || mongoose.connection.name || "unknown");
console.log("Team members IDs:      ", team.members);
console.log("Team members types:    ", team.members.map(id => typeof id));
console.log("Team members count:    ", team.members.length);
console.log("=== END DIAGNOSTIC ===");

    // allow if requester is Admin, team creator, or a member of the team
    const isMember = team.members.includes(user.id);
    if (user.role !== "Admin" && team.createdBy !== user.id && !isMember) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const members = await User.find({ _id: { $in: team.members } }).select(
      "_id name email role teamId jobTitle isActive createdAt updatedAt",
    );
    console.log("team.members:", team.members);
    console.log("req.user:", user);

    console.log("Found members count:", members.length);
    console.log("Found _ids:         ", members.map(u => u._id));

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

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // only admin or team creator can add members
    if (user.role !== "Admin" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (team.members.includes(memberId)) {
      return res.status(400).json({ message: "Member already in team" });
    }

    team.members.push(memberId);
    await team.save();
    await User.findByIdAndUpdate(memberId, { teamId });
    res.status(200).json({ message: "Member added", team });
  } catch (error) {
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

    // only admin or team creator can remove members
    if (user.role !== "Admin" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!team.members.includes(memberId)) {
      return res.status(404).json({ message: "Member not found in team" });
    }

    team.members = team.members.filter((m: string) => m !== memberId);
    await team.save();
    await User.findByIdAndUpdate(memberId, { 
      $set: { teamId: null } 
    });

    res.status(200).json({ message: "Member removed", team });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

