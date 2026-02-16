import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { useTaskStore } from "@/lib/task-store";

export function AiSummary() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const { tasks, getUserById } = useTaskStore();

  const done = tasks.filter((t) => t.status === "DONE");
  const blocked = tasks.filter((t) => t.status === "BLOCKED");
  const total = tasks.length;
  const progress = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const generate = () => {
    setLoading(true);
    setVisible(false);
    setTimeout(() => {
      setLoading(false);
      setVisible(true);
    }, 1800);
  };

  return (
    <div className="space-y-3">
      <Button onClick={generate} disabled={loading} className="gap-2">
        <Sparkles className="h-4 w-4" />
        {loading ? "Generating..." : "Generate AI Summary"}
      </Button>

      {loading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      )}

      {visible && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Stand-up Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Completed ({done.length})</p>
                {done.length > 0 ? (
                  <ul className="text-muted-foreground mt-0.5 space-y-0.5">
                    {done.map((t) => (
                      <li key={t.id}>• {t.title} — {getUserById(t.assigneeId)?.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No tasks completed yet today.</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Blocked ({blocked.length})</p>
                {blocked.length > 0 ? (
                  <ul className="text-muted-foreground mt-0.5 space-y-0.5">
                    {blocked.map((t) => {
                      const lastBlocked = [...t.updates].reverse().find((u) => u.blockedReason);
                      return (
                        <li key={t.id}>
                          • {t.title}: {lastBlocked?.blockedReason ?? "No reason specified"}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No blockers — great work!</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Overall Progress</p>
                <p className="text-muted-foreground">
                  {progress}% of tasks completed ({done.length}/{total}). The team is
                  {progress >= 50 ? " on track" : " ramping up"} for this sprint.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
