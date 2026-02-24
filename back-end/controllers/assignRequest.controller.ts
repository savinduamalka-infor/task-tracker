import { Request, Response } from "express";
import mongoose from "mongoose";
import { AssignRequestModel } from "../models/assignRequest.model.js";
import { TaskModel } from "../models/task.model.js";
import Team from "../models/team.model.js";

export const createAssignRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { taskId, suggestedMemberIds, note } = req.body;

    if (!taskId) return res.status(400).json({ message: "taskId is required" });
    if (!note?.trim()) return res.status(400).json({ message: "A note explaining why you need help is required" });

    const task = await TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only the current assignee can request help
    if (task.assigneeId !== user.id) {
      return res.status(403).json({ message: "Only the task assignee can request additional help" });
    }

    // Resolve user's teamId
    const db = mongoose.connection.db!;
    const dbUser = await db.collection("user").findOne(
      { _id: new mongoose.Types.ObjectId(user.id) },
      { projection: { teamId: 1 } }
    );
    const teamId = dbUser?.teamId || user.teamId;

    if (!teamId) return res.status(400).json({ message: "You must belong to a team" });

    // Check for existing pending request on this task by this user
    const existing = await AssignRequestModel.findOne({
      taskId,
      requesterId: user.id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({ message: "You already have a pending request for this task" });
    }

    const request = await AssignRequestModel.create({
      taskId,
      requesterId: user.id,
      teamId,
      suggestedMemberIds: suggestedMemberIds || [],
      note: note.trim(),
    });


    res.status(201).json({ message: "Request sent", request });
  } catch (error) {
    console.error("Create assign request error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getMyAssignRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const requests = await AssignRequestModel.find({ requesterId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Populate task titles
    const taskIds = requests.map((r) => r.taskId);
    const tasks = await TaskModel.find({ _id: { $in: taskIds } })
      .select("_id title")
      .lean();
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t.title]));

    const enriched = requests.map((r) => ({
      ...r,
      taskTitle: taskMap.get(r.taskId.toString()) || "Unknown Task",
    }));

    res.status(200).json({ requests: enriched });
  } catch (error) {
    console.error("Get my assign requests error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getTeamAssignRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const requests = await AssignRequestModel.find({ teamId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    // Populate requester info
    const db = mongoose.connection.db!;
    const requesterIds = [...new Set(requests.map((r) => r.requesterId))];
    const requesterOids = requesterIds.map((id) => new mongoose.Types.ObjectId(id));
    const requesters = await db
      .collection("user")
      .find(
        { _id: { $in: requesterOids } },
        { projection: { _id: 1, name: 1, email: 1, role: 1, jobTitle: 1 } }
      )
      .toArray();
    const requesterMap = new Map(requesters.map((u) => [u._id.toString(), u]));

    // Populate suggested member info
    const allSuggestedIds = [...new Set(requests.flatMap((r) => r.suggestedMemberIds || []))];
    const suggestedOids = allSuggestedIds.map((id) => new mongoose.Types.ObjectId(id));
    let suggestedMap = new Map<string, any>();
    if (suggestedOids.length > 0) {
      const suggestedUsers = await db
        .collection("user")
        .find(
          { _id: { $in: suggestedOids } },
          { projection: { _id: 1, name: 1, email: 1, jobTitle: 1 } }
        )
        .toArray();
      suggestedMap = new Map(suggestedUsers.map((u) => [u._id.toString(), u]));
    }

    // Populate task info
    const taskIds = [...new Set(requests.map((r) => r.taskId))];
    const tasks = await TaskModel.find({ _id: { $in: taskIds } })
      .select("_id title assigneeId status priority")
      .lean();
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

    const enriched = requests.map((r) => ({
      ...r,
      requester: requesterMap.get(r.requesterId) || null,
      suggestedMembers: (r.suggestedMemberIds || [])
        .map((id: string) => suggestedMap.get(id))
        .filter(Boolean),
      task: taskMap.get(r.taskId.toString()) || null,
    }));

    res.status(200).json({ requests: enriched });
  } catch (error) {
    console.error("Get team assign requests error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const approveAssignRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;
    const { newHelperId, resolvedNote } = req.body;

    if (!newHelperId) {
      return res.status(400).json({ message: "newHelperId is required" });
    }

    const request = await AssignRequestModel.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    // Verify lead belongs to the team
    const team = await Team.findById(request.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const task = await TaskModel.findById(request.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Add as a helper (keep original assignee, just push to helperIds)
    if (newHelperId === task.assigneeId) {
      return res.status(400).json({ message: "This member is already the task assignee" });
    }

    // Get new helper's name for the activity log
    const db = mongoose.connection.db!;
    const helperUser = await db.collection("user").findOne(
      { _id: new mongoose.Types.ObjectId(newHelperId) },
      { projection: { name: 1 } }
    );

    // Add helper and push activity entry atomically
    await TaskModel.findByIdAndUpdate(request.taskId, {
      $addToSet: { helperIds: newHelperId },
      $push: {
        updates: {
          note: `Help request approved — ${helperUser?.name || "A new member"} added as a helper${resolvedNote ? `. Reason: ${resolvedNote}` : ""}`,
          updatedBy: user.id,
          date: new Date(),
        },
      },
    });

    // Mark request as approved
    request.status = "approved";
    request.resolvedBy = user.id;
    request.resolvedNote = resolvedNote || null;
    await request.save();

    res.status(200).json({ message: "Helper added successfully" });
  } catch (error) {
    console.error("Approve assign request error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const rejectAssignRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;
    const { resolvedNote } = req.body;

    const request = await AssignRequestModel.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    const team = await Team.findById(request.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (user.role !== "Lead" && team.createdBy !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    request.status = "rejected";
    request.resolvedBy = user.id;
    request.resolvedNote = resolvedNote || null;
    await request.save();

    // Activity entry
    await TaskModel.findByIdAndUpdate(request.taskId, {
      $push: {
        updates: {
          note: `Help request rejected${resolvedNote ? `. Reason: ${resolvedNote}` : ""}`,
          updatedBy: user.id,
          date: new Date(),
        },
      },
    });

    res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error("Reject assign request error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
