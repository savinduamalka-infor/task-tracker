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
  CalendarDays, User, MessageSquarePlus, AlertTriangle, ListChecks, Sparkles, CheckCircle2, PlusCircle, Link2, Loader2, Trash2,
} from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { subtaskApi, taskApi } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Task, TaskStatus, User as UserType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onAddUpdate: (taskId: string) => void;
  users: UserType[];
  onSubtaskAdded?: () => void;
  onTaskClick?: (taskId: string) => void;
  allTasks?: Task[];
  onDeleteTask?: (taskId: string) => void;
}

export function TaskDetailSheet({ task, open, onClose, onAddUpdate, users, onSubtaskAdded, onTaskClick, allTasks = [], onDeleteTask }: TaskDetailSheetProps) {
  const { currentUser } = useTaskStore();
  const { toast } = useToast();
  const [suggesting, setSuggesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [selectedSubtaskIndices, setSelectedSubtaskIndices] = useState<Set<number>>(new Set());
  const [addingSubtasks, setAddingSubtasks] = useState(false);
  const [addedSubtaskIndices, setAddedSubtaskIndices] = useState<Set<number>>(new Set());

  if (!task) return null;

  const getUserById = (id: string) => users.find(u => u._id === id);
  const assignee = getUserById(task.assigneeId);
  const reporter = getUserById(task.reportedBy);

  const allSubtasks = [...task.suggestedSubtasks, ...subtasks];
  const subtasksDone = allSubtasks.filter((s) => s.status === "DONE").length;
  const subtasksTotal = allSubtasks.length;
  const subtaskProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const handleSuggestSubtasks = async () => {
    setSuggesting(true);
    setAddedSubtaskIndices(new Set());
    setSelectedSubtaskIndices(new Set());
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

  const toggleSubtaskSelection = (index: number) => {
    setSelectedSubtaskIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddSelectedSubtasks = async () => {
    const toAdd = Array.from(selectedSubtaskIndices)
      .filter((idx) => !addedSubtaskIndices.has(idx))
      .map((idx) => allSubtasks[idx])
      .filter(Boolean);

    if (toAdd.length === 0) return;

    setAddingSubtasks(true);
    let successCount = 0;
    const newAdded = new Set(addedSubtaskIndices);

    for (const st of toAdd) {
      try {
        await subtaskApi.addToParent(task.id, {
          title: st.title,
          description: st.description || "",
        });
        const idx = allSubtasks.indexOf(st);
        newAdded.add(idx);
        successCount++;
      } catch (error) {
        console.error("Failed to add subtask:", st.title, error);
      }
    }

    setAddedSubtaskIndices(newAdded);
    setSelectedSubtaskIndices(new Set());
    setAddingSubtasks(false);

    if (successCount > 0) {
      toast({
        title: "Subtasks Added",
        description: `${successCount} subtask${successCount > 1 ? "s" : ""} added successfully.`,
      });
      onSubtaskAdded?.();
    }
    if (successCount < toAdd.length) {
      toast({
        title: "Warning",
        description: `${toAdd.length - successCount} subtask(s) failed to add.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    setDeleting(true);
    try {
      await taskApi.delete(task.id);
      toast({ title: "Deleted", description: `"${task.title}" has been removed.` });
      onClose();
      onDeleteTask?.(task.id);
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSubtaskId(subtaskId);
    try {
      await taskApi.delete(subtaskId);
      toast({ title: "Subtask Removed", description: "Subtask has been removed." });
      onSubtaskAdded?.();
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      toast({ title: "Error", description: "Failed to remove subtask", variant: "destructive" });
    } finally {
      setDeletingSubtaskId(null);
    }
  };

  const existingSubtasks = allTasks.filter((t) => t.parentTaskId === task.id);

  const parentTask = task.isSubtask && task.parentTaskId
    ? allTasks.find((t) => t.id === task.parentTaskId)
    : null;

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
            {task.isSubtask && (
              <Badge variant="outline" className="text-xs gap-1">
                <Link2 className="h-3 w-3" /> Subtask
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl mt-2">{task.title}</SheetTitle>
          <p className="text-sm text-muted-foreground">{task.summary}</p>
          {parentTask && (
            <button
              onClick={() => onTaskClick?.(parentTask.id)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1 w-fit"
            >
              <Link2 className="h-3 w-3" />
              Parent: {parentTask.title}
            </button>
          )}
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
            {task.assigneeId === currentUser.id && (
              <Button size="sm" onClick={() => onAddUpdate(task.id)}>
                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Add Update
              </Button>
            )}
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
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDeleteTask}
              disabled={deleting}
              className="h-8 w-8 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete task"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Suggested Subtask Progress */}
          {subtasksTotal > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" /> AI Suggested Subtasks
                  </h4>
                  <span className="text-xs text-muted-foreground">{subtasksDone}/{subtasksTotal} done</span>
                </div>
                <Progress value={subtaskProgress} className="h-1.5 mb-3" />
                <div className="space-y-1.5">
                  {allSubtasks.map((st, idx) => {
                    const isAdded = addedSubtaskIndices.has(idx);
                    const isSuggested = idx >= task.suggestedSubtasks.length;
                    const isSelected = selectedSubtaskIndices.has(idx);
                    const isSelectable = isSuggested && !isAdded;

                    return (
                      <div
                        key={st.id}
                        className={`flex items-center gap-2 text-sm rounded-md p-2 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : "bg-muted/30 hover:bg-muted/50"
                        } ${isAdded ? "opacity-60 cursor-default" : ""}`}
                        onClick={() => isSelectable && toggleSubtaskSelection(idx)}
                      >
                        {isAdded ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : isSelected ? (
                          <div className="h-4 w-4 rounded-full bg-primary border-2 border-primary shrink-0 flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          </div>
                        ) : st.status === "DONE" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0 hover:border-primary/60 transition-colors" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={isAdded ? "line-through text-muted-foreground" : st.status === "DONE" ? "line-through text-muted-foreground" : "font-medium"}>
                            {st.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{st.description}</p>
                        </div>
                        {isAdded && (
                          <Badge variant="outline" className="text-xs text-emerald-600 shrink-0">
                            Added
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Selected Subtasks Button */}
                {subtasks.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      {selectedSubtaskIndices.size > 0
                        ? `${selectedSubtaskIndices.size} subtask${selectedSubtaskIndices.size > 1 ? "s" : ""} selected`
                        : "Select subtasks to add"}
                    </p>
                    <Button
                      size="sm"
                      disabled={selectedSubtaskIndices.size === 0 || addingSubtasks}
                      onClick={handleAddSelectedSubtasks}
                      className="gap-1.5"
                    >
                      {addingSubtasks ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlusCircle className="h-3.5 w-3.5" />
                      )}
                      {addingSubtasks
                        ? "Adding..."
                        : `Add${selectedSubtaskIndices.size > 0 ? ` (${selectedSubtaskIndices.size})` : ""}`}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Existing Subtasks from DB */}
          {existingSubtasks.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <ListChecks className="h-4 w-4" /> Subtasks ({existingSubtasks.length})
                </h4>
                <div className="space-y-1.5">
                  {existingSubtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 text-sm rounded-md p-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <button
                        onClick={() => onTaskClick?.(st.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
                        </div>
                        <StatusBadge status={st.status} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSubtask(st.id, e)}
                        disabled={deletingSubtaskId === st.id}
                        className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove subtask"
                      >
                        {deletingSubtaskId === st.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
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
