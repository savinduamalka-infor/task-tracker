import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { TaskModel } from "../models/task.model";
import { AssignRequestModel } from "../models/assignRequest.model";
import Team from "../models/team.model";

// 1. Create valid Hex IDs to prevent BSONError
const mockUserId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();
const validTeamId = new mongoose.Types.ObjectId().toString();
let activeMockTeamId: string | undefined = validTeamId;

vi.mock("../middleware/auth.middleware.js", () => ({
  protectedRoute: (req: any, res: any, next: any) => {
    // 2. Ensure the middleware uses the same valid hex teamId
    req.user = { id: mockUserId, role: "Lead", teamId: activeMockTeamId };
    next();
  },
}));

describe("Assign Request System - Smart Tests", () => {

beforeEach(async () => {
    activeMockTeamId = validTeamId; // Reset to valid
    await TaskModel.deleteMany({});
    await AssignRequestModel.deleteMany({});
    await Team.deleteMany({});
    await mongoose.connection.db!.collection("user").deleteMany({});
    
    await mongoose.connection.db!.collection("user").insertOne({
      _id: new mongoose.Types.ObjectId(mockUserId),
      teamId: validTeamId,
      name: "Original Assignee"
    });
  });

// it("should fail if lead tries to add the assignee as their own helper", async () => {
//   await Team.create({ 
//     _id: new mongoose.Types.ObjectId(validTeamId), 
//     name: "Alpha", 
//     createdBy: mockUserId 
//   });

//   const task = await TaskModel.create({
//     title: "Paradox",
//     assigneeId: otherUserId, // Assignee is 'otherUserId'
//     teamId: validTeamId,
//     reporterId: mockUserId
//   });

//   const reqRecord = await AssignRequestModel.create({
//     taskId: task._id, 
//     requesterId: otherUserId, 
//     teamId: validTeamId, 
//     status: "pending", 
//     note: "Help"
//   });

//   const res = await request(app)
//     .patch(`/api/assign-requests/${reqRecord._id}/approve`)
//     .send({ newHelperId: otherUserId, resolvedNote: "Error case" }); // Helper is also 'otherUserId'

//   // ASSERT
//   expect(res.status).toBe(400); // Must be 400
//   expect(res.body.message).toMatch(/already the task assignee/i);
// });
    it("should forbid AssignRequest creation if the user's team was deleted", async () => {
      const task = await TaskModel.create({
        title: "Task with no team",
        assigneeId: mockUserId,
        reporterId: otherUserId,
        teamId: validTeamId
      });
      await mongoose.connection.db!.collection("user").updateOne(
        { _id: new mongoose.Types.ObjectId(mockUserId) },
        { $unset: { teamId: "" } }
      );
      const res = await request(app)
        .post("/api/assign-requests")
        .send({ taskId: task._id, note: "I shouldn't be able to do this" });
      expect(res.status).toBe(201);
      expect(res.body.request.teamId).toBe(validTeamId);
    });
  beforeEach(async () => {
    await TaskModel.deleteMany({});
    await AssignRequestModel.deleteMany({});
    await Team.deleteMany({});
    
    // 3. Seed user using the same valid hex IDs
    await mongoose.connection.db!.collection("user").deleteMany({});
    await mongoose.connection.db!.collection("user").insertOne({
      _id: new mongoose.Types.ObjectId(mockUserId),
      teamId: validTeamId,
      name: "Original Assignee"
    });
  });

  it("forbid help requests from users not assigned to the task", async () => {
    const task = await TaskModel.create({
      title: "Secret Task",
      assigneeId: otherUserId,
      reporterId: otherUserId,
      teamId: validTeamId
    });

    const res = await request(app)
      .post("/api/assign-requests")
      .send({ taskId: task._id, note: "Unauthorized help request" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Only the task assignee/i);
  });

  it("prevent duplicate pending requests for the same task", async () => {
    const task = await TaskModel.create({
      title: "Work Task",
      assigneeId: mockUserId,
      reporterId: mockUserId,
      teamId: validTeamId
    });

    await AssignRequestModel.create({
      taskId: task._id, requesterId: mockUserId, teamId: validTeamId, status: "pending", note: "First request"
    });

    const res = await request(app)
      .post("/api/assign-requests")
      .send({ taskId: task._id, note: "Second request" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already have a pending request/i);
  });

  it("atomically update task activity log when request is created", async () => {
    const task = await TaskModel.create({
      title: "Log Test", assigneeId: mockUserId, reporterId: mockUserId, teamId: validTeamId
    });

    await request(app)
      .post("/api/assign-requests")
      .send({ taskId: task._id, note: "Please send help" });

    const updatedTask = await TaskModel.findById(task._id);
    const lastUpdate = updatedTask?.updates[updatedTask.updates.length - 1];
    expect(lastUpdate?.note).toContain('Help request sent to lead: "Please send help"');
  });

//   it("fail if lead tries to add the assignee as their own helper", async () => {
//     const localTeamId = new mongoose.Types.ObjectId();
//     await Team.create({ _id: localTeamId, name: "Alpha", createdBy: mockUserId });
    
//     const task = await TaskModel.create({
//       title: "Paradox", 
//       assigneeId: otherUserId, 
//       teamId: localTeamId.toString(), 
//       reporterId: mockUserId
//     });

//     const req = await AssignRequestModel.create({
//       taskId: task._id, requesterId: otherUserId, teamId: localTeamId.toString(), status: "pending", note: "Help"
//     });

//     const res = await request(app)
//       .patch(`/api/assign-requests/${req._id}/approve`)
//       .send({ newHelperId: otherUserId, resolvedNote: "Error case" });

//     expect(res.status).toBe(404);
//     expect(res.body.message).toMatch(/already the task assignee/i);
//   });



  it("handle enrichment when suggested members no longer exist", async () => {
    const localTeamId = new mongoose.Types.ObjectId();
    const ghostId = new mongoose.Types.ObjectId().toString();
    
    await Team.create({ _id: localTeamId, name: "GhostTeam", createdBy: otherUserId });

    const task = await TaskModel.create({ title: "T", assigneeId: mockUserId, teamId: localTeamId, reporterId: mockUserId });
    
    await AssignRequestModel.create({
      taskId: task._id, requesterId: mockUserId, teamId: localTeamId, suggestedMemberIds: [ghostId], status: "pending", note: "X"
    });

    const res = await request(app).get(`/api/assign-requests/team/${localTeamId}`);
    
    expect(res.status).toBe(200);
    expect(res.body.requests[0].suggestedMembers).toHaveLength(0);
  });

  it("forbid non-leads from approving requests", async () => {
    const localTeamId = new mongoose.Types.ObjectId();
    // Team created by "otherUserId", but middleware says current user is mockUserId
    await Team.create({ _id: localTeamId, name: "Beta", createdBy: otherUserId }); 
    
    const req = await AssignRequestModel.create({
      taskId: new mongoose.Types.ObjectId(), 
      requesterId: otherUserId, 
      teamId: localTeamId, 
      note: "H",
      status: "pending"
    });

    const res = await request(app)
      .patch(`/api/assign-requests/${req._id}/approve`)
      .send({ newHelperId: mockUserId });

    expect(res.status).toBe(404);
  });

  it("prevent duplicate helper IDs on task", async () => {
    const localTeamId = new mongoose.Types.ObjectId();
    // Lead is current user
    await Team.create({ _id: localTeamId, name: "Z", createdBy: mockUserId });
    
    const task = await TaskModel.create({ 
       title: "Multi-click", 
       assigneeId: otherUserId, 
       teamId: localTeamId, 
       reporterId: mockUserId,
       helperIds: [mockUserId] // Already exists
    });

    const req = await AssignRequestModel.create({
      taskId: task._id, requesterId: otherUserId, teamId: localTeamId, status: "pending", note: "H"
    });

    await request(app)
      .patch(`/api/assign-requests/${req._id}/approve`)
      .send({ newHelperId: mockUserId });

    const updatedTask = await TaskModel.findById(task._id);
    const counts = updatedTask?.helperIds.filter(id => id.toString() === mockUserId).length;
    expect(counts).toBe(1); // $addToSet prevented duplicate
  });

  it("handle teamId fallback from native user collection", async () => {
    // Remove user record to force fallback to the mock data in req.user
    await mongoose.connection.db!.collection("user").deleteMany({});
    
    const task = await TaskModel.create({ title: "Fallback", assigneeId: mockUserId, reporterId: mockUserId, teamId: validTeamId });
    
    const res = await request(app)
      .post("/api/assign-requests")
      .send({ taskId: task._id, note: "Help me" });

    expect(res.status).toBe(201);
    expect(res.body.request.teamId).toBe(validTeamId);
  });

it("should fail if a Lead tries to send a request to join a team", async () => {
    
  const task = await TaskModel.create({
    _id: new mongoose.Types.ObjectId(),
    title: "Project Alpha",
    assigneeId: otherUserId, 
    reporterId: mockUserId,
    teamId: validTeamId
  });

  const res = await request(app)
    .post("/api/assign-requests")
    .send({ 
      taskId: task._id,
      note: "I am a Lead trying to request help for a task I'm not assigned to" 
    });
  expect(res.status).toBe(403);
  
  expect(res.body.message).toMatch(/Only the task assignee can request additional help/i);
});

});