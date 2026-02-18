import { useState } from "react";
import { TaskStatus } from "@/lib/types";
import { Task, User } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "BLOCKED", label: "Blocked" },
  { status: "DONE", label: "Done" },
];

const columnAccent: Record<TaskStatus, string> = {
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  BLOCKED: "bg-red-500",
  DONE: "bg-emerald-500",
};

interface TaskBoardProps {
  onTaskClick: (taskId: string) => void;
  tasks: Task[];
  users: User[];
  onTaskDrop?: (taskId: string, newStatus: TaskStatus) => void;
}

export function TaskBoard({ onTaskClick, tasks, users, onTaskDrop }: TaskBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column itself, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    onTaskDrop?.(taskId, newStatus);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        const isDragOver = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className={`flex flex-col rounded-lg transition-colors duration-200 p-2 ${
              isDragOver
                ? "bg-primary/5 ring-2 ring-primary/20"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 w-2 rounded-full ${columnAccent[col.status]}`} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {colTasks.length}
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-1 pb-2 min-h-[60px]">
                {colTasks.length === 0 ? (
                  <div className={`text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg transition-colors ${
                    isDragOver ? "border-primary/40 bg-primary/5" : ""
                  }`}>
                    {isDragOver ? "Drop here" : "No tasks"}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TaskCard task={task} onClick={() => onTaskClick(task.id)} users={users} />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
