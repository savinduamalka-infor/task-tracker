import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TaskStatus } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";

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
  onSuccess: () => void;
}

export function DailyUpdateDialog({ open, taskId, currentStatus, onClose, onSuccess }: DailyUpdateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      status: currentStatus ?? "IN_PROGRESS",
      note: "",
      blockedReason: "",
    },
  });

  const watchedStatus = watch("status");

  const handleResolveTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      await taskApi.update(taskId, {
        status: "DONE",
        updates: {
          status: "DONE",
          note: watch("note") || "Task marked as resolved.",
        }
      } as any);
      toast({ title: "Success", description: "Task resolved successfully" });
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to resolve task", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!taskId) return;
    setLoading(true);
    try {
      await taskApi.update(taskId, {
        status: data.status,
        updates: {
          status: data.status,
          note: data.note,
          blockedReason: data.status === "BLOCKED" ? data.blockedReason : undefined,
        }
      } as any);
      toast({ title: "Success", description: "Update added successfully" });
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Update</DialogTitle>
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} disabled={loading}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Submit Update"}</Button>
              <Button
                type="button"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleResolveTask}
                disabled={loading}
              >
                <CheckCircle2 className="h-4 w-4" /> Resolve
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
