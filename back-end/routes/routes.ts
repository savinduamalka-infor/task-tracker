import { Router } from "express";
import { protectedRoute, adminOnly } from "../middleware/auth.middleware.js";
import { getAdminDashboard, getMe, getAllUsers } from "../controllers/user.controller.js";
import { getSession, signOut } from "../controllers/auth.controller.js";
import { createTask, getAllTasks, getTaskById, updateTask, deleteTask } from "../controllers/task.controller.js";
import { suggestSubtasks, addSubtaskToParent, getSubtasksByParent } from "../controllers/subtask.controller.js";
import { getDailySummary } from "../controllers/summary.controller.js";
import { autocompleteNoteHandler, refineNoteHandler } from "../controllers/note.controller.js";
import { getTaskProgress } from "../controllers/progress.controller.js";

import {  getUsersWithoutTeam } from "../controllers/user.controller.js";
//import { getSession, signOut } from "../controllers/auth.controller.js";
import { createTeam, addTeamMember, removeTeamMember, getTeamMembers } from "../controllers/team.controller";
const router = Router();

router.get("/api/auth/session", getSession);
router.post("/api/auth/sign-out", signOut);
router.get("/api/me", protectedRoute, getMe);
router.get("/api/users", protectedRoute, getAllUsers);
router.get("/api/admin/dashboard", protectedRoute, adminOnly, getAdminDashboard);
router.post("/api/teams", protectedRoute, createTeam);
router.post("/api/teams/:teamId/members", protectedRoute, addTeamMember);
router.delete("/api/teams/:teamId/members/:memberId", protectedRoute, removeTeamMember);
router.get(
	"/api/users/without-team",
	protectedRoute,
	adminOnly,
	getUsersWithoutTeam,
);
router.get("/api/teams/:teamId/members", protectedRoute, getTeamMembers);

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

export default router;
