import { Request, Response } from "express";
import { TaskModel } from "../models/task.model.js";

export async function createTask(req: Request, res: Response) {
  try {
    const user = req.user!;

    console.log("Create task request by user:", user.id, "with role:", user.role);

    if (user.role === "Member" && req.body.assigneeId && req.body.assigneeId !== user.id) {
      res.status(403).json({ error: "Members can only assign tasks to themselves" });
      return;
    }

    const task = await TaskModel.create({
      ...req.body,
      assigneeId: user.role === "Member" ? user.id : req.body.assigneeId,
      reporterId: user.id,
    });
    res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
}

export async function getAllTasks(req: Request, res: Response) {
  try {
    const { mainOnly } = req.query;
    const filter: any = {};
    if (mainOnly === "true") {
      filter.isSubtask = { $ne: true };
    }
    const tasks = await TaskModel.find(filter);
    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Failed to get tasks" });
  }
}

export async function getTaskById(req: Request, res: Response) {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ error: "Failed to get task" });
  }
}

export async function updateTask(req: Request, res: Response) {
  try {
    const { updates, ...updateData } = req.body;
    
    let task;
    if (updates) {
      if (!updates.note || typeof updates.note !== "string" || !updates.note.trim()) {
        res.status(400).json({ error: "Update note is required" });
        return;
      }

      const normalizedUpdate = {
        note: updates.note.trim(),
        blockedReason: updates.blockedReason,
        subtaskCompletions: updates.subtaskCompletions,
        updatedBy: req.user!.id,
        date: new Date(),
      };

      task = await TaskModel.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { updates: normalizedUpdate },
          ...updateData
        },
        { new: true, runValidators: true }
      );
    } else {
      task = await TaskModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
    }
    
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
}

export async function deleteTask(req: Request, res: Response) {
  try {
    const task = await TaskModel.findByIdAndDelete(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    // Cascade delete subtasks
    await TaskModel.deleteMany({ parentTaskId: req.params.id });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
}
