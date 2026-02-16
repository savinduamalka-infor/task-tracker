import { Badge } from "@/components/ui/badge";
import { TaskStatus, TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusColors: Record<TaskStatus, string> = {
  TODO: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  BLOCKED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

const priorityColors: Record<TaskPriority, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  High: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", statusColors[status])}>
      {statusLabels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", priorityColors[priority])}>
      {priority}
    </Badge>
  );
}
