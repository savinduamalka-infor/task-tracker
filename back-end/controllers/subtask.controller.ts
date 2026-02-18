import { Request, Response } from "express";
import { generateSubtasks } from "../services/llm.service.js";
import { TaskModel } from "../models/task.model.js";

export async function suggestSubtasks(req: Request, res: Response) {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const subtasks = await generateSubtasks(title, description || "");
    res.json({ subtasks });
  } catch (error) {
    console.error("Suggest subtasks error:", error);
    res.status(500).json({ error: "Failed to generate subtasks" });
  }
}

export async function addSubtaskToParent(req: Request, res: Response) {
  try {
    const parentTaskId = req.params.parentTaskId as string;
    const { title, description } = req.body;
    const user = req.user!;

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const parentTask = await TaskModel.findById(parentTaskId);
    if (!parentTask) {
      res.status(404).json({ error: "Parent task not found" });
      return;
    }

    const subtask = await TaskModel.create({
      title,
      description: description || "",
      summary: `Subtask of: ${parentTask.title}`,
      assigneeId: parentTask.assigneeId,
      reporterId: user.id,
      status: "TODO",
      priority: parentTask.priority,
      startDate: parentTask.startDate,
      dueDate: parentTask.dueDate,
      teamId: parentTask.teamId,
      parentTaskId: parentTaskId,
      isSubtask: true,
    });

    res.status(201).json(subtask);
  } catch (error) {
    console.error("Add subtask error:", error);
    res.status(500).json({ error: "Failed to add subtask" });
  }
}

export async function getSubtasksByParent(req: Request, res: Response) {
  try {
    const parentTaskId = req.params.parentTaskId as string;
    const subtasks = await TaskModel.find({ parentTaskId });
    res.json(subtasks);
  } catch (error) {
    console.error("Get subtasks error:", error);
    res.status(500).json({ error: "Failed to get subtasks" });
  }
}
