import React, { createContext, useContext, useState, useCallback } from "react";
import { Task, TaskUpdate, TaskStatus, TaskPriority, User, UserRole, SuggestedSubtask } from "./types";
import { mockTasks, mockUsers } from "./mock-data";

interface TaskStore {
  tasks: Task[];
  users: User[];
  currentUser: User;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  setCurrentUser: (user: User) => void;
  logout: () => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updates">) => void;
  addUpdate: (taskId: string, update: Omit<TaskUpdate, "date" | "updatedBy">) => void;
  addSuggestedSubtasks: (taskId: string, subtasks: Omit<SuggestedSubtask, "id" | "status">[]) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByAssignee: (userId: string) => Task[];
  getUserById: (id: string) => User | undefined;
}

const TaskStoreContext = createContext<TaskStore | null>(null);

const DEFAULT_USER: User = {
  id: "",
  email: "",
  name: "",
  role: "Member",
  teamId: "",
  jobTitle: "",
  isActive: false,
  lastUpdateSubmitted: null,
};

export function TaskStoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [currentRole, setCurrentRole] = useState<UserRole>("Lead");
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);

  const logout = useCallback(() => {
    setCurrentUser(DEFAULT_USER);
  }, []);

  const addTask = useCallback((taskData: Omit<Task, "id" | "createdAt" | "updates">) => {
    const newTask: Task = {
      ...taskData,
      id: `t${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
      updates: [],
    };
    setTasks((prev) => [...prev, newTask]);
  }, []);

  const addUpdate = useCallback((taskId: string, update: Omit<TaskUpdate, "date" | "updatedBy">) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newUpdate: TaskUpdate = {
          ...update,
          date: new Date().toISOString().split("T")[0],
          updatedBy: currentUser.id,
        };
        const updatedSubtasks = task.suggestedSubtasks.map((st) =>
          update.subtaskCompletions?.includes(st.id)
            ? { ...st, status: "DONE" as TaskStatus }
            : st
        );
        return {
          ...task,
          status: update.status,
          updates: [...task.updates, newUpdate],
          suggestedSubtasks: updatedSubtasks,
        };
      })
    );
  }, [currentUser.id]);

  const addSuggestedSubtasks = useCallback((taskId: string, subtasks: Omit<SuggestedSubtask, "id" | "status">[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newSubtasks: SuggestedSubtask[] = subtasks.map((st, i) => ({
          ...st,
          id: `st-${taskId}-${Date.now()}-${i}`,
          status: "TODO" as TaskStatus,
        }));
        return {
          ...task,
          suggestedSubtasks: [...task.suggestedSubtasks, ...newSubtasks],
        };
      })
    );
  }, []);

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  const getTasksByAssignee = useCallback(
    (userId: string) => tasks.filter((t) => t.assigneeId === userId),
    [tasks]
  );

  const getUserById = useCallback(
    (id: string) => mockUsers.find((u) => u.id === id),
    []
  );

  return (
    <TaskStoreContext.Provider
      value={{
        tasks,
        users: mockUsers,
        currentUser,
        currentRole,
        setCurrentRole,
        setCurrentUser,
        logout,
        addTask,
        addUpdate,
        addSuggestedSubtasks,
        getTasksByStatus,
        getTasksByAssignee,
        getUserById,
      }}
    >
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error("useTaskStore must be used within TaskStoreProvider");
  return ctx;
}
