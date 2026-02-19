import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

export interface CreateTaskDTO {
  title: string;
  summary: string;
  description?: string;
  assigneeId: string;
  priority: "Low" | "Medium" | "High";
  startDate: string;
  dueDate: string;
  teamId: string;
}

export const authApi = {
  getSession: () => api.get("/api/auth/session"),
};

export const taskApi = {
  create: (data: CreateTaskDTO) => api.post("/api/tasks", data),
  getAll: (mainOnly?: boolean) => api.get("/api/tasks", { params: mainOnly ? { mainOnly: "true" } : {} }),
  getById: (id: string) => api.get(`/api/tasks/${id}`),
  update: (id: string, data: Partial<CreateTaskDTO>) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const subtaskApi = {
  suggest: (title: string, description: string) => api.post("/api/subtasks/suggest", { title, description }),
  addToParent: (parentTaskId: string, data: { title: string; description: string }) => api.post(`/api/subtasks/${parentTaskId}`, data),
  getByParent: (parentTaskId: string) => api.get(`/api/subtasks/${parentTaskId}`),
};

export const userApi = {
  getAll: () => api.get("/api/users"),
};

export const summaryApi = {
  getDaily: (date?: string) =>
    api.get("/api/summary/daily", { params: date ? { date } : {} }),
};

export const noteApi = {
  autocomplete: (partialText: string, taskTitle?: string) =>
    api.post("/api/notes/autocomplete", { partialText, taskTitle }),
  refine: (note: string, taskTitle?: string) =>
    api.post("/api/notes/refine", { note, taskTitle }),
};

export const progressApi = {
  getTaskProgress: (taskId: string) => api.get(`/api/tasks/${taskId}/progress`),
};

export const joinRequestApi = {
  create: (teamId: string) => api.post("/api/join-requests", { teamId }),
  getMine: () => api.get("/api/join-requests/my"),
  getForTeam: (teamId: string) => api.get(`/api/join-requests/team/${teamId}`),
  accept: (requestId: string) => api.put(`/api/join-requests/${requestId}/accept`),
  reject: (requestId: string) => api.put(`/api/join-requests/${requestId}/reject`),
};

export const teamApi = {
  getAll: () => api.get("/api/teams"),
  getMembers: (teamId: string) => api.get(`/api/teams/${teamId}/members`),
};
