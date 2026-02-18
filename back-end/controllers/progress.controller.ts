import { Request, Response } from "express";
import mongoose from "mongoose";
import { TaskModel } from "../models/task.model.js";
import { generateTaskProgress } from "../services/llm.service.js";

export async function getTaskProgress(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    const task = await TaskModel.findById(taskId).lean();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Find main task and all subtasks
    let mainTask = task;
    let subtasks: any[] = [];

    if (task.isSubtask && task.parentTaskId) {
      // If clicked task is a subtask, get parent and all siblings
      const parent = await TaskModel.findById(task.parentTaskId).lean();
      if (parent) {
        mainTask = parent;
        subtasks = await TaskModel.find({ parentTaskId: parent._id }).lean();
      }
    } else {
      // If clicked task is main task, get all its subtasks
      subtasks = await TaskModel.find({ parentTaskId: taskId }).lean();
    }

    // Get user names for updates
    const userIds = [...new Set(mainTask.updates?.map((u: any) => u.updatedBy) || [])];
    const users = await mongoose.connection.db!
      .collection("user")
      .find({ _id: { $in: userIds } })
      .toArray();
    const userMap = new Map(users.map((u) => [String(u._id), u.name as string]));

    const updatesWithNames = (mainTask.updates || []).map((u: any) => ({
      date: new Date(u.date).toISOString().split("T")[0],
      note: u.note,
      updatedBy: u.updatedBy,
      userName: userMap.get(String(u.updatedBy)),
    }));

    const progressReport = await generateTaskProgress(
      {
        title: mainTask.title,
        description: mainTask.description || "",
        status: mainTask.status,
        priority: mainTask.priority,
      },
      subtasks.map((st) => ({
        title: st.title,
        status: st.status,
        description: st.description,
      })),
      updatesWithNames
    );

    res.json({ progress: progressReport });
  } catch (error) {
    console.error("Task progress error:", error);
    res.status(500).json({ error: "Failed to generate task progress" });
  }
}
