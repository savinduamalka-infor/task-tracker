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
  getAll: () => api.get("/api/tasks"),
  getById: (id: string) => api.get(`/api/tasks/${id}`),
  update: (id: string, data: Partial<CreateTaskDTO>) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const subtaskApi = {
  suggest: (title: string, description: string) => api.post("/api/subtasks/suggest", { title, description }),
};

export const userApi = {
  getAll: () => api.get("/api/users"),
};

export const summaryApi = {
  getDaily: (date?: string) =>
    api.get("/api/summary/daily", { params: date ? { date } : {} }),
};
