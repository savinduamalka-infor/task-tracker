import { Request, Response } from "express";
import mongoose from "mongoose";
import { TaskModel } from "../models/task.model.js";
import { generateDailySummary, DailySummaryTask } from "../services/llm.service.js";

export async function getDailySummary(req: Request, res: Response) {
  try {
    const { date } = req.query;

    const targetDate = date
      ? new Date(date as string)
      : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await TaskModel.find({
      $or: [
        { "updates.date": { $gte: startOfDay, $lte: endOfDay } },
        { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
      ],
    }).lean();

    if (tasks.length === 0) {
      res.json({
        summary: "No task activity found for this date. The team may have had a day off or updates haven't been submitted yet.",
        date: targetDate.toISOString().split("T")[0],
        taskCount: 0,
      });
      return;
    }

    const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId))];
    const users = await mongoose.connection.db!
      .collection("user")
      .find(
        { _id: { $in: assigneeIds } as any },
        { projection: { _id: 1, name: 1 } }
      )
      .toArray();
    const userMap = new Map(users.map((u) => [String(u._id), u.name as string]));

    const summaryTasks: DailySummaryTask[] = tasks.map((task) => {
      const todayUpdates = (task.updates || [])
        .filter((u) => {
          const d = new Date(u.date);
          return d >= startOfDay && d <= endOfDay;
        })
        .map((u) => ({
          note: u.note,
          status: u.status,
          blockedReason: u.blockedReason,
        }));

      return {
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeName: userMap.get(String(task.assigneeId)) || "Unknown",
        updates: todayUpdates,
      };
    });

    const dateStr = targetDate.toISOString().split("T")[0];
    const summary = await generateDailySummary(dateStr, summaryTasks);

    res.json({
      summary,
      date: dateStr,
      taskCount: tasks.length,
    });
  } catch (error) {
    console.error("Daily summary error:", error);
    res.status(500).json({ error: "Failed to generate daily summary" });
  }
}
