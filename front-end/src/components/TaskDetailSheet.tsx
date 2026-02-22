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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  CalendarDays, User, MessageSquarePlus, AlertTriangle, ListChecks, Sparkles, CheckCircle2, PlusCircle, Link2, Loader2, Trash2, FileText, HandHelping, ChevronsUpDown, Check, UserCheck,
} from "lucide-react";
import { useTaskStore } from "@/lib/task-store";
import { subtaskApi, taskApi, progressApi, assignRequestApi } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Task, TaskStatus, User as UserType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const { currentUser, currentRole } = useTaskStore();
  const { toast } = useToast();
  const [suggesting, setSuggesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressReport, setProgressReport] = useState<string | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [selectedSubtaskIndices, setSelectedSubtaskIndices] = useState<Set<number>>(new Set());
  const [addingSubtasks, setAddingSubtasks] = useState(false);
  const [addedSubtaskIndices, setAddedSubtaskIndices] = useState<Set<number>>(new Set());

  // Request Help state
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpNote, setHelpNote] = useState("");
  const [helpSuggestedIds, setHelpSuggestedIds] = useState<Set<string>>(new Set());
  const [sendingHelp, setSendingHelp] = useState(false);

  // Reassign state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassigneeId, setReassigneeId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const handleReassign = async () => {
    if (!reassigneeId || !task) return;
    setReassigning(true);
    try {
      const newAssignee = users.find(u => u._id === reassigneeId);
      await taskApi.update(task.id, {
        assigneeId: reassigneeId,
        updates: { note: `Task reassigned to ${newAssignee?.name || "new member"} by lead` },
      });
      toast({ title: "Task Reassigned", description: `Now assigned to ${newAssignee?.name || reassigneeId}` });
      setReassignOpen(false);
      setReassigneeId("");
      onDeleteTask?.(task.id);
    } catch (err) {
      toast({ title: "Error", description: "Failed to reassign task", variant: "destructive" });
    } finally {
      setReassigning(false);
    }
  };

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
    let lastError = "";

    for (const st of toAdd) {
      try {
        await subtaskApi.addToParent(task.id, {
          title: st.title,
          description: st.description || "",
        });
        const idx = allSubtasks.indexOf(st);
        newAdded.add(idx);
        successCount++;
      } catch (error: any) {
        console.error("Failed to add subtask:", st.title, error);
        lastError = error.response?.data?.error || "Failed to add subtask";
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
        title: "Error",
        description: lastError || `${toAdd.length - successCount} subtask(s) failed to add.`,
        variant: "destructive",
      });
    }
  };

  const handleGenerateProgress = async () => {
    if (!task) return;
    setProgressLoading(true);
    setProgressReport(null);
    setProgressDialogOpen(true);
    try {
      const res = await progressApi.getTaskProgress(task.id);
      setProgressReport(res.data.progress);
    } catch (error) {
      console.error("Failed to generate progress:", error);
      toast({ title: "Error", description: "Failed to generate progress report", variant: "destructive" });
      setProgressDialogOpen(false);
    } finally {
      setProgressLoading(false);
    }
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    const html: string[] = [];
    let inList = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (inList) { html.push("</ul>"); inList = false; }
        html.push("<br/>");
        continue;
      }
      if (line.startsWith("## ")) {
        if (inList) { html.push("</ul>"); inList = false; }
        html.push(`<h3 class="text-sm font-semibold mt-3 mb-1">${line.slice(3)}</h3>`);
        continue;
      }
      if (/^[-*•]\s/.test(line)) {
        if (!inList) { html.push('<ul class="list-disc list-inside space-y-0.5 text-muted-foreground">'); inList = true; }
        html.push(`<li>${line.replace(/^[-*•]\s*/, "")}</li>`);
        continue;
      }
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p class="text-muted-foreground">${line}</p>`);
    }
    if (inList) html.push("</ul>");
    return html.join("\n");
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
    } catch (error: any) {
      console.error("Failed to delete subtask:", error);
      toast({ title: "Error", description: error.response?.data?.error || "Failed to remove subtask", variant: "destructive" });
    } finally {
      setDeletingSubtaskId(null);
    }
  };

  const existingSubtasks = allTasks.filter((t) => t.parentTaskId === task.id);

  const parentTask = task.isSubtask && task.parentTaskId
    ? allTasks.find((t) => t.id === task.parentTaskId)
    : null;

  const handleSendHelpRequest = async () => {
    if (!helpNote.trim()) {
      toast({ title: "Note required", description: "Please explain why you need help.", variant: "destructive" });
      return;
    }
    setSendingHelp(true);
    try {
      await assignRequestApi.create({
        taskId: task.id,
        suggestedMemberIds: Array.from(helpSuggestedIds),
        note: helpNote.trim(),
      });
      toast({ title: "Request Sent", description: "Your reassignment request has been sent to the team lead." });
      setHelpDialogOpen(false);
      setHelpNote("");
      setHelpSuggestedIds(new Set());
      onSubtaskAdded?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send request.",
        variant: "destructive",
      });
    } finally {
      setSendingHelp(false);
    }
  };

  const toggleHelpMember = (id: string) => {
    setHelpSuggestedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            {task.helperIds && task.helperIds.length > 0 && (
              <div className="flex items-start gap-2 col-span-2">
                <HandHelping className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Helpers</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {task.helperIds.map(hid => {
                      const helper = getUserById(hid);
                      return helper ? (
                        <Badge key={hid} variant="secondary" className="text-xs gap-1 py-0">
                          <Avatar className="h-3.5 w-3.5">
                            <AvatarFallback className="text-[7px]">
                              {helper.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {helper.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            )}
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
            {(task.assigneeId === currentUser.id || task.helperIds?.includes(currentUser.id)) && (
              <Button size="sm" onClick={() => onAddUpdate(task.id)}>
                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Add Update
              </Button>
            )}
            {task.assigneeId === currentUser.id && task.status !== "DONE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHelpDialogOpen(true)}
                className="gap-1.5"
              >
                <HandHelping className="h-4 w-4" />
                Request Help
              </Button>
            )}
            {currentRole === "Lead" && task.status !== "DONE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setReassignOpen(true); setReassigneeId(""); }}
                className="gap-1.5"
              >
                <UserCheck className="h-4 w-4" />
                Reassign
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
              size="sm"
              variant="outline"
              onClick={handleGenerateProgress}
              disabled={progressLoading}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              {progressLoading ? "Generating..." : "Progress Report"}
            </Button>
            {currentRole === "Lead" && (
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
            )}
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
                      {currentRole === "Lead" && (
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
                      )}
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
                  const initials = author?.name?.split(" ").map((n) => n[0]).join("") ?? "?";
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
                          <span className="text-sm font-medium">{author?.name || "Former Member"}</span>
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

      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Task Progress Report
            </DialogTitle>
          </DialogHeader>
          {progressLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/4" />
            </div>
          ) : progressReport ? (
            <div className="prose prose-sm max-w-none py-2">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(progressReport) }} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No progress report available.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={(o) => { if (!o) { setReassignOpen(false); setReassigneeId(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4 text-primary" />
              Reassign Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Change the assignee of <span className="font-medium text-foreground">"{task.title}"</span>.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">New Assignee</Label>
              <Select value={reassigneeId} onValueChange={setReassigneeId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a member..." />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => u._id !== task.assigneeId)  // exclude current assignee
                    .map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarFallback className="text-[8px]">
                            {u.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span>{u.name}</span>
                        {u.jobTitle && (
                          <span className="text-xs text-muted-foreground">({u.jobTitle})</span>
                        )}

                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setReassignOpen(false); setReassigneeId(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReassign}
              disabled={reassigning || !reassigneeId || reassigneeId === task.assigneeId}
              className="gap-1.5"
            >
              {reassigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              {reassigning ? "Reassigning..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpDialogOpen} onOpenChange={(o) => { if (!o) { setHelpDialogOpen(false); setHelpNote(""); setHelpSuggestedIds(new Set()); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HandHelping className="h-4 w-4 text-primary" />
              Request Help
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Ask the lead to assign someone new to{" "}
              <span className="font-medium text-foreground">"{task.title}"</span>.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Suggest members{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between font-normal h-9">
                    {helpSuggestedIds.size > 0
                      ? `${helpSuggestedIds.size} member${helpSuggestedIds.size > 1 ? "s" : ""} selected`
                      : "Select members to suggest..."}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search members..." className="h-8" />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {users
                          .filter(u =>
                            u._id !== currentUser.id &&          // not the requester
                            u._id !== task.assigneeId &&         // not the primary assignee
                            !task.helperIds?.includes(u._id)     // not already a helper
                          )
                          .map((u) => (
                          <CommandItem
                            key={u._id}
                            value={u.name}
                            onSelect={() => toggleHelpMember(u._id)}
                            className="gap-2"
                          >
                            <Check className={cn("h-3.5 w-3.5 shrink-0", helpSuggestedIds.has(u._id) ? "opacity-100" : "opacity-0")} />
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarFallback className="text-[8px]">
                                {u.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{u.name}</span>
                            {(u.jobTitle || u.role) && (
                              <span className="ml-auto text-xs text-muted-foreground">{u.jobTitle || u.role}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {helpSuggestedIds.size > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {users.filter(u => helpSuggestedIds.has(u._id)).map(u => (
                    <Badge
                      key={u._id}
                      variant="secondary"
                      className="text-xs gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => toggleHelpMember(u._id)}
                    >
                      {u.name} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="helpNote" className="text-xs font-medium">
                Note to lead <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="helpNote"
                value={helpNote}
                onChange={(e) => setHelpNote(e.target.value)}
                placeholder="Explain why you need help on this task..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setHelpDialogOpen(false); setHelpNote(""); setHelpSuggestedIds(new Set()); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendHelpRequest} disabled={sendingHelp} className="gap-1.5">
              {sendingHelp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHelping className="h-3.5 w-3.5" />}
              {sendingHelp ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
