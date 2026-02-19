import { Request, Response } from "express";
import JoinRequest from "../models/joinRequest.model";
import Team from "../models/team.model";
import mongoose from "mongoose";

export const createJoinRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId is required" });

    const db = mongoose.connection.db!;
    const userDoc = await db
      .collection("user")
      .findOne({ _id: new mongoose.Types.ObjectId(user.id) });

    if (userDoc?.teamId) {
      return res.status(400).json({ message: "You are already in a team" });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const existing = await JoinRequest.findOne({
      userId: user.id,
      teamId,
      status: "pending",
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You already have a pending request for this team" });
    }

    const joinRequest = new JoinRequest({
      userId: user.id,
      teamId,
      status: "pending",
    });
    await joinRequest.save();

    res
      .status(201)
      .json({ message: "Join request sent successfully", joinRequest });
  } catch (error) {
    console.error("Create join request error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getMyJoinRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const requests = await JoinRequest.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    const teamIds = [...new Set(requests.map((r) => r.teamId.toString()))];
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select("_id name")
      .lean();
    const teamMap = new Map(teams.map((t) => [t._id.toString(), t.name]));

    const enriched = requests.map((r) => ({
      ...r,
      teamName: teamMap.get(r.teamId.toString()) || "Unknown Team",
    }));

    res.status(200).json({ requests: enriched });
  } catch (error) {
    console.error("Get my join requests error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getTeamJoinRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && user.role !== "Admin" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const requests = await JoinRequest.find({ teamId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    const db = mongoose.connection.db!;
    const userIds = requests.map(
      (r) => new mongoose.Types.ObjectId(r.userId)
    );
    const users = await db
      .collection("user")
      .find(
        { _id: { $in: userIds } },
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
            jobTitle: 1,
          },
        }
      )
      .toArray();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enriched = requests.map((r) => ({
      ...r,
      user: userMap.get(r.userId) || null,
    }));

    res.status(200).json({ requests: enriched });
  } catch (error) {
    console.error("Get team join requests error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const acceptJoinRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;

    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest)
      return res.status(404).json({ message: "Join request not found" });
    if (joinRequest.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const team = await Team.findById(joinRequest.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && user.role !== "Admin" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (team.members.includes(joinRequest.userId)) {
      joinRequest.status = "accepted";
      await joinRequest.save();
      return res.status(200).json({ message: "User is already a member" });
    }

    team.members.push(joinRequest.userId);
    await team.save();

    const db = mongoose.connection.db!;
    await db.collection("user").updateOne(
      { _id: new mongoose.Types.ObjectId(joinRequest.userId) },
      { $set: { teamId: joinRequest.teamId.toString() } }
    );

    joinRequest.status = "accepted";
    await joinRequest.save();

    await JoinRequest.updateMany(
      {
        userId: joinRequest.userId,
        _id: { $ne: joinRequest._id },
        status: "pending",
      },
      { $set: { status: "rejected" } }
    );

    res.status(200).json({ message: "Join request accepted" });
  } catch (error) {
    console.error("Accept join request error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const rejectJoinRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;

    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest)
      return res.status(404).json({ message: "Join request not found" });
    if (joinRequest.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    const team = await Team.findById(joinRequest.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && user.role !== "Admin" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    joinRequest.status = "rejected";
    await joinRequest.save();

    res.status(200).json({ message: "Join request rejected" });
  } catch (error) {
    console.error("Reject join request error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
