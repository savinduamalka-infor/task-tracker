import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { LeadDashboard } from "@/components/dashboard/LeadDashboard";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { TaskBoard } from "@/components/board/TaskBoard";
import { TaskTable } from "@/components/TaskTable";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { DailyUpdateDialog } from "@/components/DailyUpdateDialog";
import { useTaskStore } from "@/lib/task-store";
import { taskApi, userApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Table2, Filter } from "lucide-react";
import { Task, TaskStatus, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const Index = () => {
  const { currentRole } = useTaskStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTaskId, setUpdateTaskId] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [showMainOnly, setShowMainOnly] = useState(false);
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [pendingDrop, setPendingDrop] = useState<{ taskId: string; newStatus: TaskStatus } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const loadUsers = () => {
    userApi.getAll()
      .then(res => setUsers(res.data))
      .catch(err => console.error("Failed to load users:", err));
  };

  const loadTasks = useCallback(() => {
    taskApi.getAll()
      .then(res => {
        const allTasks: Task[] = res.data.map((t: any) => ({
          id: t._id,
          title: t.title,
          summary: t.summary || "",
          description: t.description || "",
          assigneeId: t.assigneeId,
          status: t.status,
          priority: t.priority,
          startDate: t.startDate,
          dueDate: t.dueDate,
          reportedBy: t.reporterId,
          createdAt: t.createdAt,
          updates: t.updates || [],
          suggestedSubtasks: [],
          parentTaskId: t.parentTaskId || undefined,
          isSubtask: t.isSubtask || false,
          parentTaskTitle: undefined,
        }));
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        allTasks.forEach(t => {
          if (t.parentTaskId) {
            const parent = taskMap.get(t.parentTaskId);
            t.parentTaskTitle = parent?.title;
          }
        });
        setTasks(allTasks);
      })
      .catch(err => console.error("Failed to load tasks:", err));
  }, []);

  const filteredTasks = showMainOnly ? tasks.filter(t => !t.isSubtask) : tasks;

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const openTaskDetail = (id: string) => {
    setSelectedTaskId(id);
    setSheetOpen(true);
  };

  const openUpdate = (id: string) => {
    setUpdateTaskId(id);
    setUpdateOpen(true);
  };

  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === "BLOCKED") {
      setPendingDrop({ taskId, newStatus });
      setBlockedReason("");
      setBlockedDialogOpen(true);
      return;
    }
    applyStatusChange(taskId, newStatus);
  };

  const applyStatusChange = async (taskId: string, newStatus: TaskStatus, reason?: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const updatePayload: any = { status: newStatus };
      if (reason) {
        updatePayload.updates = {
          note: `Status changed to Blocked`,
          status: newStatus,
          blockedReason: reason,
        };
      }
      await taskApi.update(taskId, updatePayload);
      toast({ title: "Status Updated", description: `Task moved to ${newStatus.replace("_", " ")}.` });
      loadTasks(); // Refresh from server
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      loadTasks(); // Revert by reloading
    }
  };

  const handleBlockedConfirm = () => {
    if (!pendingDrop || !blockedReason.trim()) return;
    setBlockedDialogOpen(false);
    applyStatusChange(pendingDrop.taskId, pendingDrop.newStatus, blockedReason.trim());
    setPendingDrop(null);
    setBlockedReason("");
  };

  const handleBlockedCancel = () => {
    setBlockedDialogOpen(false);
    setPendingDrop(null);
    setBlockedReason("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {currentRole === "Lead" ? (
          <LeadDashboard onCreateTask={() => setCreateOpen(true)} tasks={tasks} />
        ) : (
          <MemberDashboard onQuickUpdate={openUpdate} onTaskClick={openTaskDetail} tasks={tasks} />
        )}

        <Tabs defaultValue="board">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="board" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" /> Board
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5">
                <Table2 className="h-4 w-4" /> Table
              </TabsTrigger>
            </TabsList>
            <Button
              size="sm"
              variant={showMainOnly ? "default" : "outline"}
              onClick={() => setShowMainOnly(!showMainOnly)}
              className="gap-1.5"
            >
              <Filter className="h-4 w-4" />
              {showMainOnly ? "Main Tasks Only" : "All Tasks"}
            </Button>
          </div>
          <TabsContent value="board" className="mt-4">
            <TaskBoard onTaskClick={openTaskDetail} tasks={filteredTasks} users={users} onTaskDrop={handleTaskDrop} />
          </TabsContent>
          <TabsContent value="table" className="mt-4">
            <TaskTable onTaskClick={openTaskDetail} tasks={filteredTasks} />
          </TabsContent>
        </Tabs>
      </main>

      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAddUpdate={(id) => {
          setSheetOpen(false);
          openUpdate(id);
        }}
        users={users}
        onSubtaskAdded={loadTasks}
        onTaskClick={(id) => {
          setSelectedTaskId(id);
          setSheetOpen(true);
        }}
        allTasks={tasks}
        onDeleteTask={() => {
          setSheetOpen(false);
          loadTasks();
        }}
      />
      <CreateTaskDialog open={createOpen} onClose={() => { setCreateOpen(false); loadTasks(); }} />
      <DailyUpdateDialog
        open={updateOpen}
        taskId={updateTaskId}
        onClose={() => setUpdateOpen(false)}
        onSuccess={loadTasks}
      />

      {/* Blocked Reason Dialog */}
      <Dialog open={blockedDialogOpen} onOpenChange={(o) => { if (!o) handleBlockedCancel(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why is this task blocked?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="blockedReason">Blocked Reason</Label>
            <Textarea
              id="blockedReason"
              placeholder="Describe why this task is blocked..."
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleBlockedCancel}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!blockedReason.trim()}
              onClick={handleBlockedConfirm}
            >
              Mark as Blocked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
