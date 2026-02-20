import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ListChecks, Link2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Task, User } from "@/lib/types";
import { format, parseISO, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  users: User[];
}

const priorityConfig = {
  High: { icon: ArrowUp, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
  Medium: { icon: ArrowDown, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  Low: { icon: Minus, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
};

export function TaskCard({ task, onClick, users }: TaskCardProps) {
  const assignee = users.find(u => u._id === task.assigneeId);
  const initials = assignee?.name.split(" ").map((n) => n[0]).join("") ?? "?";
  const due = task.dueDate ? parseISO(task.dueDate) : new Date();
  const overdue = task.dueDate && isPast(due) && task.status !== "DONE" && !isToday(due);
  const subtasksDone = (task.suggestedSubtasks || []).filter((s) => s.status === "DONE").length;
  const subtasksTotal = (task.suggestedSubtasks || []).length;
  const PriorityIcon = priorityConfig[task.priority].icon;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/20 border group w-full min-w-0"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2.5 min-w-0">
        {task.isSubtask && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate font-medium">
              {task.parentTaskTitle || "Subtask"}
            </span>
          </div>
        )}
        
        <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
          {task.title}
        </h3>

        <div className="flex items-center flex-wrap gap-1.5">
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
            priorityConfig[task.priority].bg,
            priorityConfig[task.priority].color
          )}>
            <PriorityIcon className="h-3 w-3" />
            <span>{task.priority}</span>
          </div>
          {task.isSubtask && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5">
              Sub
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          {subtasksTotal > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              <span className="font-medium">{subtasksDone}/{subtasksTotal}</span>
            </div>
          )}
          <div className={cn(
            "flex items-center gap-1 ml-auto",
            overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground"
          )}>
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{format(due, "MMM d")}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t">
          <Avatar className="h-5 w-5 border shrink-0">
            <AvatarFallback className="text-[9px] font-medium">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] font-medium text-foreground truncate">{assignee?.name}</span>
        </div>
      </CardContent>
    </Card>
  );
}
