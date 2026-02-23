import { Request, Response } from "express";
import mongoose from "mongoose";
import { TaskModel } from "../models/task.model.js";
import ProjectModel from "../models/project.model.js";
import { generateDailySummary, DailySummaryTask } from "../services/llm.service.js";

export async function getDailySummary(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { date } = req.query;
    const isLead = user.role === "Lead";

    const dbConn = mongoose.connection.db!;
    const dbUser = await dbConn.collection("user").findOne(
      { _id: new mongoose.Types.ObjectId(user.id) },
      { projection: { teamId: 1 } }
    );
    const teamId = dbUser?.teamId || user.teamId;

    const targetDate = date
      ? new Date(date as string)
      : new Date();

    // Set to UTC midnight to avoid timezone issues
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const taskFilter: any = {
      $or: [
        { "updates.date": { $gte: startOfDay, $lte: endOfDay } },
        { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
      ],
    };
    if (isLead && teamId) {
      taskFilter.teamId = teamId;
    } else {
      taskFilter.assigneeId = user.id;
    }

    const tasks = await TaskModel.find(taskFilter).lean();

    if (tasks.length === 0) {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      const isFuture = startOfDay > now;
      
      res.json({
        summary: isFuture 
          ? "This date is in the future. No activity has occurred yet."
          : "No task activity found for this date. The team may have had a day off or updates haven't been submitted yet.",
        date: targetDate.toISOString().split("T")[0],
        taskCount: 0,
      });
      return;
    }

    if(!isLead){
      res.status(403).json({
        error: "only leads can access the daily summary."
      });
      return;
    }

    const allUsers = await mongoose.connection.db!
      .collection("user")
      .find({}, { projection: { _id: 1, name: 1 } })
      .toArray();
    const userMap = new Map(allUsers.map((u) => [String(u._id), u.name as string]));

    const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))] as string[];
    const projectMap = new Map<string, string>();
    if (projectIds.length > 0) {
      const projects = await ProjectModel.find({ _id: { $in: projectIds } }, { name: 1 }).lean();
      projects.forEach((p) => projectMap.set(String(p._id), p.name));
    }

    const summaryTasks: DailySummaryTask[] = tasks
      .map((task) => {
        const todayUpdates = (task.updates || [])
          .filter((u) => {
            const d = new Date(u.date);
            return d >= startOfDay && d <= endOfDay;
          })
          .map((u) => ({
            note: u.note,
            blockedReason: u.blockedReason,
          }));

        const statusChanged = task.updatedAt && 
          new Date(task.updatedAt) >= startOfDay && 
          new Date(task.updatedAt) <= endOfDay;

        return {
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeName: userMap.get(String(task.assigneeId)) || "Unknown",
          projectName: task.projectId ? projectMap.get(String(task.projectId)) : undefined,
          updates: todayUpdates,
          hasActivity: todayUpdates.length > 0 || statusChanged,
        };
      })
      .filter((task) => task.hasActivity)
      .map(({ hasActivity, ...task }) => task);

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
