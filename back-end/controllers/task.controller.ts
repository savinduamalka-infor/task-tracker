import { Request, Response } from "express";
import { TaskModel } from "../models/task.model.js";

export async function createTask(req: Request, res: Response) {
  try {
    const task = await TaskModel.create({
      ...req.body,
      reporterId: req.user!.id,
    });
    res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
}

export async function getAllTasks(req: Request, res: Response) {
  try {
    const tasks = await TaskModel.find();
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
