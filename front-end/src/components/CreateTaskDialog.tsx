import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskApi, userApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TaskPriority } from "@/lib/types";
import { useTaskStore } from "@/lib/task-store";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required"),
  description: z.string().optional(),
  assigneeId: z.string().min(1, "Assignee is required"),
  priority: z.enum(["Low", "Medium", "High"]),
  startDate: z.string().min(1, "Start date is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

type FormData = z.infer<typeof schema>;

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { currentUser, currentRole } = useTaskStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assigneeId: "",
      priority: "Medium",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
    },
  });

  const isMember = (currentUser.role || "Member").toLowerCase() === "member";

  useEffect(() => {
    if (open) {
      if (isMember) {
        setUsers([{ _id: currentUser.id, name: "Assign to me" }]);
        setValue("assigneeId", currentUser.id);
      } else {
        userApi.getAll()
          .then((res) => {
            setUsers(res.data || []);
          })
          .catch(err => {
            console.error("Failed to load users:", err);
            toast({
              title: "Error",
              description: "Failed to load users",
              variant: "destructive",
            });
          });
      }
    }
  }, [open, isMember, currentUser.id, setValue, toast]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await taskApi.create({
        title: data.title,
        summary: data.summary,
        description: data.description ?? "",
        assigneeId: data.assigneeId,
        priority: data.priority as TaskPriority,
        startDate: data.startDate,
        dueDate: data.dueDate,
        teamId: "000000000000000000000000", // Temporary until team module is ready
      });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      reset();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Task title" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="summary">Summary</Label>
            <Input id="summary" {...register("summary")} placeholder="Brief summary" />
            {errors.summary && <p className="text-xs text-destructive mt-1">{errors.summary.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="Detailed description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isMember}>
                    <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assigneeId && <p className="text-xs text-destructive mt-1">{errors.assigneeId.message}</p>}
            </div>
            <div>
              <Label>Priority</Label>
              <Select onValueChange={(v) => setValue("priority", v as any)} value={watch("priority")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
