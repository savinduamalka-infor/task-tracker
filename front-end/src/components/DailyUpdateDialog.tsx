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
import { taskApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

const schema = z.object({
  note: z.string().min(1, "Note is required"),
});

type FormData = z.infer<typeof schema>;

interface DailyUpdateDialogProps {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DailyUpdateDialog({ open, taskId, onClose, onSuccess }: DailyUpdateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      note: "",
    },
  });

  const handleResolveTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      await taskApi.update(taskId, {
        status: "DONE",
        updates: {
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
        updates: {
          note: data.note,
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
            <Label>Note</Label>
            <Textarea {...register("note")} placeholder="What did you work on today?" rows={3} />
            {errors.note && <p className="text-xs text-destructive mt-1">{errors.note.message}</p>}
          </div>

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
