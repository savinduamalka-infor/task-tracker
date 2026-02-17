import { Request, Response } from "express";
import Team from "../models/team.model";
import { User } from "../models/user.model";

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

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params as any;

    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

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


    res.status(200).json({ teamId: team._id, members });
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

    res.status(200).json({ message: "Member removed", team });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// export const replaceTeamMembers = async (req: Request, res: Response) => {
//   try {
//     const { teamId } = req.params as any;
//     const { members } = req.body as { members?: string[] };

//     const user = (req as any).user;
//     if (!user) return res.status(401).json({ message: "Unauthorized" });

//     if (!Array.isArray(members)) return res.status(400).json({ message: "members must be an array" });

//     const team = await Team.findById(teamId);
//     if (!team) return res.status(404).json({ message: "Team not found" });

//     if (user.role !== "Admin" && team.createdBy !== user.id) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     // ensure creator remains a member
//     const creatorId = team.createdBy;
//     const uniqueMembers = Array.from(new Set(members.map(String)));
//     if (!uniqueMembers.includes(String(creatorId))) uniqueMembers.push(String(creatorId));

//     team.members = uniqueMembers;
//     await team.save();

//     res.status(200).json({ message: "Members replaced", team });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };

