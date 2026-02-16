import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/StatusBadge";
import { CalendarDays, ListChecks } from "lucide-react";
import { Task } from "@/lib/types";
import { useTaskStore } from "@/lib/task-store";
import { format, parseISO, isPast, isToday } from "date-fns";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { getUserById } = useTaskStore();
  const assignee = getUserById(task.assigneeId);
  const initials = assignee?.name.split(" ").map((n) => n[0]).join("") ?? "?";
  const due = parseISO(task.dueDate);
  const overdue = isPast(due) && task.status !== "DONE" && !isToday(due);

  const subtasksDone = task.suggestedSubtasks.filter((s) => s.status === "DONE").length;
  const subtasksTotal = task.suggestedSubtasks.length;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-border/60"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm leading-snug">{task.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{task.summary}</p>
        <div className="flex items-center justify-between pt-1">
          <PriorityBadge priority={task.priority} />
          <div className="flex items-center gap-2">
            {subtasksTotal > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {subtasksDone}/{subtasksTotal}
              </span>
            )}
            <div className="flex items-center gap-1">
              <CalendarDays className={`h-3 w-3 ${overdue ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {format(due, "MMM d")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{assignee?.name}</span>
        </div>
      </CardContent>
    </Card>
  );
}
