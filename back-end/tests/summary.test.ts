import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { TaskModel } from "../models/task.model";
import * as llmService from "../services/llm.service";

const mockUserId = new mongoose.Types.ObjectId().toString();

vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = { 
      id: mockUserId, 
      teamId: "team-123" 
    };
    next();
  },
}));

describe("", () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return no activity if no tasks exist for that date", async () => {
    vi.spyOn(llmService, "generateDailySummary").mockResolvedValue("No task activity found.");

    const res = await request(app).get("/api/summary/daily?date=2026-02-20");

    expect(res.status).toBe(200);
    expect(res.body.summary).toMatch(/no task activity/i);
  });

it("only include tasks updated on the requested date", async () => {
    const teamId = "team-123";

    // Task 1: Updated TODAY
    await TaskModel.create({
      title: "Today's Task",
      status: "DONE",
      priority: "High",
      teamId: teamId,
      reporterId: mockUserId,
      assigneeId: mockUserId,
      updates: [{ 
        date: "2026-02-20T10:00:00.000Z", 
        note: "Done",
        updatedBy: mockUserId
      }]
    });

    // Task 2: Updated on DIFFERENT date
    await TaskModel.create({
      title: "Old Task",
      status: "TODO",
      priority: "Low",
      teamId: teamId,
      reporterId: mockUserId,
      assigneeId: mockUserId,
      updates: [{ 
        date: "2026-02-15T10:00:00.000Z", 
        note: "Started",
        updatedBy: mockUserId
      }],
      // FIX: Explicitly set updatedAt to the past so it fails the $or filter
      updatedAt: new Date("2026-02-15T10:00:00.000Z") 
    });

    const llmSpy = vi.spyOn(llmService, "generateDailySummary").mockResolvedValue("Summary content");

    const res = await request(app).get("/api/summary/daily?date=2026-02-20");

    expect(res.status).toBe(200);
    const calledTasks = llmSpy.mock.calls[0][1]; 
    
    // Now this will correctly be 1
    expect(calledTasks).toHaveLength(1);
    expect(calledTasks[0].title).toBe("Today's Task");
  });


  it("handle server errors gracefully if LLM fails", async () => {
    // 1. Create a task so the controller doesn't return "No activity" before the LLM call
    await TaskModel.create({
      title: "Error Task",
      teamId: "team-123",
      reporterId: mockUserId,
      assigneeId: mockUserId,
      updates: [{ date: "2026-02-20T10:00:00.000Z", note: "x", updatedBy: mockUserId }]
    });

    // 2. Force the LLM service to throw an error
    vi.spyOn(llmService, "generateDailySummary").mockRejectedValue(new Error("AI Offline"));

    const res = await request(app).get("/api/summary/daily?date=2026-02-20");

    // This will fail if your controller doesn't use res.status(500)
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to generate daily summary");
  });
});