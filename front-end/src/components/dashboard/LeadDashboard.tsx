import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { AiSummary } from "@/components/AiSummary";

interface LeadDashboardProps {
  onCreateTask: () => void;
}

export function LeadDashboard({ onCreateTask }: LeadDashboardProps) {
  const { tasks } = useTaskStore();

  const todo = tasks.filter((t) => t.status === "TODO").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const stats = [
    { label: "To Do", count: todo, icon: ListTodo, color: "text-blue-600 dark:text-blue-400" },
    { label: "In Progress", count: inProgress, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
    { label: "Blocked", count: blocked, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
    { label: "Done", count: done, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor your team's progress and manage tasks.</p>
        </div>
        <Button onClick={onCreateTask} className="gap-2">
          <Plus className="h-4 w-4" /> Assign Task
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Sprint Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {done} of {total} tasks completed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AiSummary />
    </div>
  );
}
