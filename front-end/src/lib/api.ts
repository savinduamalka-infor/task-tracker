import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

// Attach Bearer token to every request (needed for cross-domain deployments
// where cookies aren't sent between vercel.app and onrender.com)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.startsWith("/login")) {
        localStorage.removeItem("session_token");
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Drop-in replacement for `fetch()` that attaches the Bearer token.
 * Use this instead of raw fetch() for any backend call.
 */
export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("session_token");
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, credentials: "include", headers });
}

export interface CreateTaskDTO {
  title: string;
  summary: string;
  description?: string;
  assigneeId: string;
  priority: "Low" | "Medium" | "High";
  startDate: string;
  dueDate: string;
  teamId: string;
  projectId?: string;
  updates?: { note: string };
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

export const projectApi = {
  getByTeam: (teamId: string) => api.get(`/api/teams/${teamId}/projects`),
  getById: (projectId: string) => api.get(`/api/projects/${projectId}`),
  create: (teamId: string, data: { name: string; description?: string }) =>
    api.post(`/api/teams/${teamId}/projects`, data),
  update: (projectId: string, data: { name?: string; description?: string }) =>
    api.patch(`/api/projects/${projectId}`, data),
  delete: (projectId: string) => api.delete(`/api/projects/${projectId}`),
};

export const assignRequestApi = {
  create: (data: { taskId: string; suggestedMemberIds?: string[]; note: string }) =>
    api.post("/api/assign-requests", data),
  getMine: () => api.get("/api/assign-requests/my"),
  getForTeam: (teamId: string) => api.get(`/api/assign-requests/team/${teamId}`),
  approve: (requestId: string, data: { newHelperId: string; resolvedNote?: string }) =>
    api.put(`/api/assign-requests/${requestId}/approve`, data),
  reject: (requestId: string, data?: { resolvedNote?: string }) =>
    api.put(`/api/assign-requests/${requestId}/reject`, data || {}),
};
