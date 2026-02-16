import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTaskStore } from "@/lib/task-store";
import { TaskStatus } from "@/lib/types";
import { useState } from "react";
import { CheckCircle2, ListChecks } from "lucide-react";

const schema = z
  .object({
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]),
    note: z.string().min(1, "Note is required"),
    blockedReason: z.string().optional(),
  })
  .refine(
    (data) => data.status !== "BLOCKED" || (data.blockedReason && data.blockedReason.length > 0),
    { message: "Blocked reason is required", path: ["blockedReason"] }
  );

type FormData = z.infer<typeof schema>;

interface DailyUpdateDialogProps {
  open: boolean;
  taskId: string | null;
  currentStatus?: TaskStatus;
  onClose: () => void;
}

export function DailyUpdateDialog({ open, taskId, currentStatus, onClose }: DailyUpdateDialogProps) {
  const { addUpdate, tasks } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);
  const [completedSubtasks, setCompletedSubtasks] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: currentStatus ?? task?.status ?? "IN_PROGRESS",
      note: "",
      blockedReason: "",
    },
  });

  const watchedStatus = watch("status");

  const pendingSubtasks = task?.suggestedSubtasks.filter((st) => st.status !== "DONE") ?? [];

  const toggleSubtask = (id: string) => {
    setCompletedSubtasks((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleResolveTask = () => {
    if (!taskId) return;
    const noteVal = watch("note") || "Task marked as resolved.";
    addUpdate(taskId, {
      status: "DONE",
      note: noteVal,
      subtaskCompletions: completedSubtasks.length > 0 ? completedSubtasks : undefined,
    });
    setCompletedSubtasks([]);
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    if (!taskId) return;
    addUpdate(taskId, {
      status: data.status,
      note: data.note,
      blockedReason: data.status === "BLOCKED" ? data.blockedReason : undefined,
      subtaskCompletions: completedSubtasks.length > 0 ? completedSubtasks : undefined,
    });
    setCompletedSubtasks([]);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setCompletedSubtasks([]); reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Update{task ? `: ${task.title}` : ""}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Status</Label>
            <Select
              onValueChange={(v) => setValue("status", v as any)}
              value={watchedStatus}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea {...register("note")} placeholder="What did you work on today?" rows={3} />
            {errors.note && <p className="text-xs text-destructive mt-1">{errors.note.message}</p>}
          </div>
          {watchedStatus === "BLOCKED" && (
            <div>
              <Label>Blocked Reason <span className="text-destructive">*</span></Label>
              <Textarea {...register("blockedReason")} placeholder="Why is this blocked?" rows={2} />
              {errors.blockedReason && <p className="text-xs text-destructive mt-1">{errors.blockedReason.message}</p>}
            </div>
          )}

          {/* Subtask completions */}
          {pendingSubtasks.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <ListChecks className="h-4 w-4" /> Mark Subtasks Completed
                </Label>
                <div className="space-y-2">
                  {pendingSubtasks.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-start gap-2 text-sm cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={completedSubtasks.includes(st.id)}
                        onCheckedChange={() => toggleSubtask(st.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-medium">{st.title}</p>
                        <p className="text-xs text-muted-foreground">{st.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => { setCompletedSubtasks([]); reset(); onClose(); }}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button type="submit">Submit Update</Button>
              {task?.status !== "DONE" && (
                <Button
                  type="button"
                  variant="default"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleResolveTask}
                >
                  <CheckCircle2 className="h-4 w-4" /> Resolve Task
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
