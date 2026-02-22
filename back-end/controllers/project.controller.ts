import { Request, Response } from "express";
import mongoose from "mongoose";
import ProjectModel from "../models/project.model.js";
import { TaskModel } from "../models/task.model.js";
import Team from "../models/team.model.js";

async function resolveTeamId(userId: string, userTeamId?: string): Promise<string | null> {
  const db = mongoose.connection.db!;
  const dbUser = await db.collection("user").findOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { projection: { teamId: 1 } }
  );
  return dbUser?.teamId ?? userTeamId ?? null;
}

export const createProject = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (user.role !== "Lead") {
      return res.status(403).json({ message: "Only Leads can create projects" });
    }

    const { teamId } = req.params;
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    // Verify team exists and user belongs to it
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const callerTeamId = await resolveTeamId(user.id, user.teamId);
    if (callerTeamId !== teamId) {
      return res.status(403).json({ message: "You can only create projects within your own team" });
    }

    const project = await ProjectModel.create({
      name: name.trim(),
      description: description?.trim(),
      teamId,
      createdBy: user.id,
    });

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A project with this name already exists in the team" });
    }
    console.error("Create project error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getProjectsByTeam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.includes(user.id);
    if (!isMember) {
      return res.status(403).json({ message: "Forbidden: you are not a member of this team" });
    }

    const projects = await ProjectModel.find({ teamId }).sort({ createdAt: -1 });
    res.status(200).json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { projectId } = req.params;
    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const team = await Team.findById(project.teamId);
    if (!team || !team.members.includes(user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (user.role !== "Lead") {
      return res.status(403).json({ message: "Only Leads can update projects" });
    }

    const { projectId } = req.params;
    const { name, description } = req.body;

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const callerTeamId = await resolveTeamId(user.id, user.teamId);
    if (callerTeamId !== project.teamId) {
      return res.status(403).json({ message: "Forbidden: project does not belong to your team" });
    }

    if (name?.trim()) project.name = name.trim();
    if (description !== undefined) project.description = description?.trim();

    await project.save();
    res.status(200).json({ message: "Project updated", project });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A project with this name already exists in the team" });
    }
    console.error("Update project error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (user.role !== "Lead") {
      return res.status(403).json({ message: "Only Leads can delete projects" });
    }

    const { projectId } = req.params;

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const callerTeamId = await resolveTeamId(user.id, user.teamId);
    if (callerTeamId !== project.teamId) {
      return res.status(403).json({ message: "Forbidden: project does not belong to your team" });
    }

    // Cascade-delete all tasks belonging to this project
    const projectTasks = await TaskModel.find({ projectId }, { _id: 1 });
    const taskIds = projectTasks.map((t) => t._id.toString());
    if (taskIds.length > 0) {
      await TaskModel.deleteMany({ $or: [{ projectId }, { parentTaskId: { $in: taskIds } }] });
    }

    await ProjectModel.findByIdAndDelete(projectId);
    res.status(200).json({ message: "Project and associated tasks deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};