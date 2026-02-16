import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { MessageSquarePlus, CalendarDays, Inbox } from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { format, parseISO, differenceInDays } from "date-fns";

interface MemberDashboardProps {
  onQuickUpdate: (taskId: string) => void;
  onTaskClick: (taskId: string) => void;
}

export function MemberDashboard({ onQuickUpdate, onTaskClick }: MemberDashboardProps) {
  const { tasks, currentUser } = useTaskStore();

  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const doneTasks = myTasks.filter((t) => t.status === "DONE").length;
  const total = myTasks.length;
  const progress = total > 0 ? Math.round((doneTasks / total) * 100) : 0;

  const activeTasks = myTasks
    .filter((t) => t.status !== "DONE")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Tasks</h2>
        <p className="text-sm text-muted-foreground">Your current assignments and progress.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">My Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {doneTasks} of {total} tasks completed
          </p>
        </CardContent>
      </Card>

      {activeTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">You have no active tasks assigned.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeTasks.map((task) => {
            const daysUntil = differenceInDays(parseISO(task.dueDate), new Date());
            const urgent = daysUntil <= 2 && daysUntil >= 0;
            const overdue = daysUntil < 0;
            return (
              <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onTaskClick(task.id)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(parseISO(task.dueDate), "MMM d")}
                      </span>
                      {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                      {urgent && !overdue && <Badge className="bg-amber-500 text-white text-xs">Due Soon</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onQuickUpdate(task.id); }}>
                    <MessageSquarePlus className="h-4 w-4 mr-1" /> Update
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
