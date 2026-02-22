import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { TaskModel } from "../models/task.model";
import * as llmService from "../services/llm.service";

// Mock Auth
vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = { id: new mongoose.Types.ObjectId().toString() };
    next();
  },
}));

describe("Task Progress", () => {
  const mockId = () => new mongoose.Types.ObjectId();
  const userId = mockId();
  const teamId = "team-123";

  beforeEach(async () => {
    vi.clearAllMocks();
    await TaskModel.deleteMany({});
    // Clean up mock user collection if necessary
    try { await mongoose.connection.db!.collection("user").deleteMany({}); } catch (e) {}
  });

  it("retrieve all subtasks when requesting progress for a main task", async () => {
    const main = await TaskModel.create({ title: "Main", reporterId: userId, assigneeId: userId, teamId });
    await TaskModel.create({ title: "Sub 1", parentTaskId: main._id, reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${main._id}/progress`);
    expect(spy.mock.calls[0][1]).toHaveLength(1);
  });

  it("use the parent task as the main context when requesting progress for a subtask.", async () => {
    const parent = await TaskModel.create({ title: "Parent", reporterId: userId, assigneeId: userId, teamId });
    const sub = await TaskModel.create({ title: "Sub", parentTaskId: parent._id, isSubtask: true, reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${sub._id}/progress`);
    expect(spy.mock.calls[0][0].title).toBe("Parent");
  });

  it("include all sibling subtasks in the progress context when querying a subtask", async () => {
    const p = await TaskModel.create({ title: "P", reporterId: userId, assigneeId: userId, teamId });
    const s1 = await TaskModel.create({ title: "S1", parentTaskId: p._id, isSubtask: true, reporterId: userId, assigneeId: userId, teamId });
    await TaskModel.create({ title: "S2", parentTaskId: p._id, isSubtask: true, reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${s1._id}/progress`);
    expect(spy.mock.calls[0][1]).toHaveLength(2);
  });

  // it("should handle subtasks with missing parents gracefully", async () => {
  //   const sub = await TaskModel.create({ title: "Orphan", parentTaskId: mockId(), isSubtask: true, reporterId: userId, assigneeId: userId, teamId });
  //   const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
  //   await request(app).get(`/api/tasks/${sub._id}/progress`);
  //   expect(spy.mock.calls[0][0].title).toBe("Orphan");
  // });

  it("return an empty subtasks array when a main task has no subtasks", async () => {
    const main = await TaskModel.create({ title: "Solo", reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${main._id}/progress`);
    expect(spy.mock.calls[0][1]).toEqual([]);
  });

  it("handle updates from deleted users (null userName)", async () => {
    const task = await TaskModel.create({ title: "T", updates: [{ note: "Work", updatedBy: mockId(), date: new Date() }], reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${task._id}/progress`);
    expect(spy.mock.calls[0][2][0].userName).toBeUndefined();
  });

  // it("9. should deduplicate user database queries for efficiency", async () => {
  //   // This is verified by ensuring the test doesn't timeout and handles multiple updates from 1 user
  //   const task = await TaskModel.create({ title: "T", updates: Array(5).fill({ note: "H", updatedBy: userId, date: new Date() }), reporterId: userId, assigneeId: userId, teamId });
  //   await request(app).get(`/api/tasks/${task._id}/progress`).expect(200);
  // });


  it("handle tasks with null or empty update arrays gracefully", async () => {
    const task = await TaskModel.create({ title: "T", updates: [], reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${task._id}/progress`);
    expect(spy.mock.calls[0][2]).toEqual([]);
  });


  it("should not leak subtasks from unrelated parent tasks", async () => {
    const p1 = await TaskModel.create({ title: "P1", reporterId: userId, assigneeId: userId, teamId });
    const p2 = await TaskModel.create({ title: "P2", reporterId: userId, assigneeId: userId, teamId });
    await TaskModel.create({ title: "S1", parentTaskId: p1._id, reporterId: userId, assigneeId: userId, teamId });
    await TaskModel.create({ title: "S2", parentTaskId: p2._id, reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${p1._id}/progress`);
    expect(spy.mock.calls[0][1]).toHaveLength(1);
    expect(spy.mock.calls[0][1][0].title).toBe("S1");
  });

  it("provide empty string for null descriptions", async () => {
    const task = await TaskModel.create({ title: "T", description: null as any, reporterId: userId, assigneeId: userId, teamId });
    const spy = vi.spyOn(llmService, "generateTaskProgress").mockResolvedValue("Report");
    await request(app).get(`/api/tasks/${task._id}/progress`);
    expect(spy.mock.calls[0][0].description).toBe("");
  });

  // it("15. should return 500 for malformed ObjectIDs", async () => {
  //   const res = await request(app).get("/api/tasks/not-a-valid-id/progress");
  //   expect(res.status).toBe(500);
  // });

  it("return 404 for non-existent Task ID", async () => {
    const res = await request(app).get(`/api/tasks/${mockId()}/progress`);
    expect(res.status).toBe(404);
  });

  it("return 500 if LLM service throws an error", async () => {
    const t = await TaskModel.create({ title: "T", reporterId: userId, assigneeId: userId, teamId });
    vi.spyOn(llmService, "generateTaskProgress").mockRejectedValue(new Error("LLM Fail"));
    const res = await request(app).get(`/api/tasks/${t._id}/progress`);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed/i);
  });

  it("should handle database database error occurs during user lookup.", async () => {
    const t = await TaskModel.create({ title: "T", updates: [{ note: "H", updatedBy: userId }], reporterId: userId, assigneeId: userId, teamId });
    vi.spyOn(mongoose.connection.db!, "collection").mockImplementation(() => { throw new Error("DB Down"); });
    const res = await request(app).get(`/api/tasks/${t._id}/progress`);
    expect(res.status).toBe(500);
  });
});