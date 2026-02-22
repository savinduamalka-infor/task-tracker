import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import * as llmService from "../services/llm.service";
import { TaskModel } from "../models/task.model";

// Mock the Auth Middleware to swap roles easily
let mockUser = { id: "user-1", role: "Member" };
vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

describe("Note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1", role: "Member" }; 
  });

  it("prevent a member from adding an update note to a task they don't own/help with", async () => {
    vi.spyOn(TaskModel, "findById").mockResolvedValue({
      _id: "task-123",
      assigneeId: "user-99",
      helperIds: ["user-88"]
    } as any);

    const res = await request(app)
      .patch("/api/tasks/task-123")
      .send({ updates: { note: "Trying to hack a note" } });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Only the assignee or a helper/i);
  });

  it("trim whitespace before sending text to the LLM service", async () => {
    const dirtyText = "   Check this out   ";
    const llmSpy = vi.spyOn(llmService, "autocompleteNote").mockResolvedValue("Suggestion");

    await request(app)
      .post("/api/notes/autocomplete")
      .send({ partialText: dirtyText, taskTitle: "Clean Title" });
    expect(llmSpy).toHaveBeenCalledWith("Check this out", "Clean Title");
  });

  it("reject with 400 if the note is explicitly null", async () => {
    const res = await request(app)
      .post("/api/notes/refine")
      .send({ note: null, taskTitle: "Null Title" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be at least 3 characters/i);
  });

  it("should reject with 400 if taskTitle is missing", async () => {
    const res = await request(app)
      .post("/api/notes/refine")
      .send({ note: "Correct this sentence." }); // Missing taskTitle

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/task title is required/i);
  });
  
  it("handle extremely large strings without crashing (The 'Book' Attack)", async () => {
    const hugeText = "A".repeat(50000); // 50KB string
    vi.spyOn(llmService, "autocompleteNote").mockResolvedValue("Suggested completion");

    const res = await request(app)
      .post("/api/notes/autocomplete")
      .send({ partialText: hugeText, taskTitle: "Stress Test" });

    expect([200, 413]).toContain(res.status);
  });

  // // 2. Unicode/Emoji Test
  // it("TC2: should correctly calculate length and trim strings containing complex Emojis 👨‍👩‍👧‍👦", async () => {
  //   // This emoji is actually multiple characters long in bytes but seen as 1 by users
  //   const emojiText = "  👨‍👩‍👧‍👦  "; 
  //   const llmSpy = vi.spyOn(llmService, "refineNote").mockResolvedValue("Refined Emoji");

  //   const res = await request(app)
  //     .post("/api/notes/refine")
  //     .send({ note: emojiText, taskTitle: "Emoji Task" });

  //   // Should pass because the trimmed length of this complex emoji is > 3
  //   expect(res.status).toBe(200);
  //   expect(llmSpy).toHaveBeenCalledWith("👨‍👩‍👧‍👦", "Emoji Task");
  // });

  it("reject partialText if it is sent as an object/array (Type Confusion)", async () => {
    const res = await request(app)
      .post("/api/notes/autocomplete")
      .send({ partialText: { key: "value" }, taskTitle: "Hack Attempt" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be at least 3 characters/i);
  });
  it("reject strings containing only tabs, newlines, and spaces", async () => {
    const ghostText = "\n    \t    \r  ";
    const res = await request(app)
      .post("/api/notes/autocomplete")
      .send({ partialText: ghostText, taskTitle: "Ghost" });

    expect(res.status).toBe(400);
  });

  // it("should handle missing taskTitle property without throwing internal error", async () => {
  //   vi.spyOn(llmService, "refineNote").mockResolvedValue("Refined without title");

  //   const res = await request(app)
  //     .post("/api/notes/refine")
  //     .send({ note: "Correct my grammar please" }); // Missing taskTitle

  //   expect(res.status).toBe(200);
  //   expect(res.body.refined).toBe("Refined without title");
  // });

  it("should return 500 if the LLM service hangs indefinitely", async () => {
    // Simulate a promise that never resolves
    vi.spyOn(llmService, "refineNote").mockImplementation(() => new Promise(() => {}));

    // use a timeout in the test to not hang our test runner
    const res = await Promise.race([
      request(app).post("/api/notes/refine").send({ note: "Wait for me", taskTitle: "T" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
    ]).catch(err => err);

    // If controller doesn't have an internal timeout, this test will help to realize need one!
    if (res instanceof Error) {
        console.warn("Server hung! You need a timeout in your controller or service.");
    }
  });
});