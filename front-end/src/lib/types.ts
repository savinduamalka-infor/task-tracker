export type UserRole = "Admin" | "Lead" | "Member";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type TaskPriority = "Low" | "Medium" | "High";

export interface User {
  _id: string;
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
  jobTitle: string;
  isActive: boolean;
  lastUpdateSubmitted: string | null;
  avatar?: string;
}

export interface SuggestedSubtask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  suggestedDate?: string;
}

export interface TaskUpdate {
  date: string;
  note: string;
  blockedReason?: string;
  updatedBy: string;
  subtaskCompletions?: string[]; // IDs of suggested subtasks completed in this update
}

export interface Task {
  id: string;
  title: string;
  summary: string;
  description: string;
  assigneeId: string;
  helperIds: string[];
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  reportedBy: string;
  restrictedTo?: string[];
  createdAt: string;
  updates: TaskUpdate[];
  suggestedSubtasks: SuggestedSubtask[];
  parentTaskId?: string;
  isSubtask: boolean;
  parentTaskTitle?: string;
}

export interface TeamMember{
  id: string;
  name: string;
  role: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members?: TeamMember[];
}

