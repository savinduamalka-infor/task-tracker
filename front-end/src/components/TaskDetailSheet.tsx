import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, User, MessageSquarePlus, AlertTriangle, ListChecks, Sparkles, CheckCircle2,
} from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { subtaskApi } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Task, TaskStatus } from "@/lib/types";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onAddUpdate: (taskId: string) => void;
}

export function TaskDetailSheet({ task, open, onClose, onAddUpdate }: TaskDetailSheetProps) {
  const { getUserById } = useTaskStore();
  const [suggesting, setSuggesting] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]);

  if (!task) return null;

  const assignee = getUserById(task.assigneeId);
  const reporter = getUserById(task.reportedBy);

  const allSubtasks = [...task.suggestedSubtasks, ...subtasks];
  const subtasksDone = allSubtasks.filter((s) => s.status === "DONE").length;
  const subtasksTotal = allSubtasks.length;
  const subtaskProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const handleSuggestSubtasks = async () => {
    setSuggesting(true);
    try {
      const response = await subtaskApi.suggest(task.title, task.description || "");
      if (response.data.subtasks && response.data.subtasks.length > 0) {
        const newSubtasks = response.data.subtasks.map((st: any, i: number) => ({
          id: `st-${task.id}-${Date.now()}-${i}`,
          title: st.title,
          description: st.description,
          status: "TODO",
        }));
        setSubtasks(newSubtasks);
      }
    } catch (error) {
      console.error("Failed to generate subtasks:", error);
    } finally {
      setSuggesting(false);
    }
  };

  // Build unified activity feed: updates + subtask completions integrated
  const allCompletedSubtaskIds = new Set(
    task.updates.flatMap((u) => u.subtaskCompletions ?? [])
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <SheetTitle className="text-xl mt-2">{task.title}</SheetTitle>
          <p className="text-sm text-muted-foreground">{task.summary}</p>
        </SheetHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Assignee</p>
                <p className="font-medium">{assignee?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reported by</p>
                <p className="font-medium">{reporter?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Start</p>
                <p className="font-medium">{format(parseISO(task.startDate), "MMM d, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="font-medium">{format(parseISO(task.dueDate), "MMM d, yyyy")}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => onAddUpdate(task.id)}>
              <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Add Update
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSuggestSubtasks}
              disabled={suggesting}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              {suggesting ? "Suggesting..." : "Suggest Subtasks"}
            </Button>
          </div>

          {/* Subtask Progress */}
          {subtasksTotal > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" /> Suggested Subtasks
                  </h4>
                  <span className="text-xs text-muted-foreground">{subtasksDone}/{subtasksTotal} done</span>
                </div>
                <Progress value={subtaskProgress} className="h-1.5 mb-3" />
                <div className="space-y-1.5">
                  {allSubtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 text-sm rounded-md p-2 bg-muted/30"
                    >
                      {st.status === "DONE" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={st.status === "DONE" ? "line-through text-muted-foreground" : "font-medium"}>
                          {st.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{st.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {suggesting && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}

          <Separator />

          {/* Activity Feed - integrates subtask completions */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Activity Feed</h4>
            {task.updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            ) : (
              <div className="space-y-3">
                {[...task.updates].reverse().map((update, i) => {
                  const author = getUserById(update.updatedBy);
                  const initials = author?.name.split(" ").map((n) => n[0]).join("") ?? "?";
                  const completedSubs = (update.subtaskCompletions ?? [])
                    .map((id) => allSubtasks.find((st) => st.id === id))
                    .filter(Boolean);

                  return (
                    <div key={i} className="flex gap-3">
                      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                        <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{author?.name}</span>
                          <StatusBadge status={update.status} />
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(parseISO(update.date), "MMM d")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{update.note}</p>
                        {update.blockedReason && (
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded-md p-2">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{update.blockedReason}</span>
                          </div>
                        )}
                        {completedSubs.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {completedSubs.map((st) => (
                              <div key={st!.id} className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span>Completed: {st!.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
