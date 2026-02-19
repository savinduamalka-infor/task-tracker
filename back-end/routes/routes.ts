import { Router } from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { getMe, getAllUsers, getUsersWithoutTeam } from "../controllers/user.controller.js";
import { getSession, signOut } from "../controllers/auth.controller.js";
import { createTask, getAllTasks, getTaskById, updateTask, deleteTask } from "../controllers/task.controller.js";
import { suggestSubtasks, addSubtaskToParent, getSubtasksByParent } from "../controllers/subtask.controller.js";
import { getDailySummary } from "../controllers/summary.controller.js";
import { autocompleteNoteHandler, refineNoteHandler } from "../controllers/note.controller.js";
import { getTaskProgress } from "../controllers/progress.controller.js";
import { createTeam, addTeamMember, removeTeamMember, getTeamMembers, getAllTeams, getTeamById, updateTeam, deleteTeam } from "../controllers/team.controller.js";
import { createJoinRequest, getMyJoinRequests, getTeamJoinRequests, acceptJoinRequest, rejectJoinRequest } from "../controllers/joinRequest.controller.js";
import { createAssignRequest, getMyAssignRequests, getTeamAssignRequests, approveAssignRequest, rejectAssignRequest } from "../controllers/assignRequest.controller.js";
const router = Router();

router.get("/api/auth/session", getSession);
router.post("/api/auth/sign-out", signOut);
router.get("/api/me", protectedRoute, getMe);
router.get("/api/users", protectedRoute, getAllUsers);
router.get("/api/users/without-team", protectedRoute, getUsersWithoutTeam);
router.get("/api/teams", protectedRoute, getAllTeams);
router.post("/api/teams", protectedRoute, createTeam);
router.get("/api/teams/:teamId", protectedRoute, getTeamById);
router.put("/api/teams/:teamId", protectedRoute, updateTeam);
router.delete("/api/teams/:teamId", protectedRoute, deleteTeam);
router.post("/api/teams/:teamId/members", protectedRoute, addTeamMember);
router.delete("/api/teams/:teamId/members/:memberId", protectedRoute, removeTeamMember);

router.get("/api/teams/:teamId/members", protectedRoute, getTeamMembers);

// Join request routes
router.post("/api/join-requests", protectedRoute, createJoinRequest);
router.get("/api/join-requests/my", protectedRoute, getMyJoinRequests);
router.get("/api/join-requests/team/:teamId", protectedRoute, getTeamJoinRequests);
router.put("/api/join-requests/:requestId/accept", protectedRoute, acceptJoinRequest);
router.put("/api/join-requests/:requestId/reject", protectedRoute, rejectJoinRequest);

router.post("/api/tasks", protectedRoute, createTask);
router.get("/api/tasks", protectedRoute, getAllTasks);
router.get("/api/tasks/:id", protectedRoute, getTaskById);
router.put("/api/tasks/:id", protectedRoute, updateTask);
router.delete("/api/tasks/:id", protectedRoute, deleteTask);

router.post("/api/subtasks/suggest", protectedRoute, suggestSubtasks);
router.post("/api/subtasks/:parentTaskId", protectedRoute, addSubtaskToParent);
router.get("/api/subtasks/:parentTaskId", protectedRoute, getSubtasksByParent);
router.get("/api/summary/daily", protectedRoute, getDailySummary);

router.post("/api/notes/autocomplete", protectedRoute, autocompleteNoteHandler);
router.post("/api/notes/refine", protectedRoute, refineNoteHandler);

router.get("/api/tasks/:taskId/progress", protectedRoute, getTaskProgress);

router.post("/api/assign-requests", protectedRoute, createAssignRequest);
router.get("/api/assign-requests/my", protectedRoute, getMyAssignRequests);
router.get("/api/assign-requests/team/:teamId", protectedRoute, getTeamAssignRequests);
router.put("/api/assign-requests/:requestId/approve", protectedRoute, approveAssignRequest);
router.put("/api/assign-requests/:requestId/reject", protectedRoute, rejectAssignRequest);

export default router;
