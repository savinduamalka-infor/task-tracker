import { TaskStatus } from "@/lib/types";
import { useTaskStore } from "@/lib/task-store";
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
  filteredTaskIds?: string[];
}

export function TaskBoard({ onTaskClick, filteredTaskIds }: TaskBoardProps) {
  const { tasks } = useTaskStore();

  const visibleTasks = filteredTaskIds
    ? tasks.filter((t) => filteredTaskIds.includes(t.id))
    : tasks;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((col) => {
        const colTasks = visibleTasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 w-2 rounded-full ${columnAccent[col.status]}`} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {colTasks.length}
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-1 pb-2">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
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
