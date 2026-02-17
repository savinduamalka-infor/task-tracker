import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LeadDashboard } from "@/components/dashboard/LeadDashboard";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { TaskBoard } from "@/components/board/TaskBoard";
import { TaskTable } from "@/components/TaskTable";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { DailyUpdateDialog } from "@/components/DailyUpdateDialog";
import { useTaskStore } from "@/lib/task-store";
import { taskApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Table2 } from "lucide-react";
import { Task } from "@/lib/types";

const Index = () => {
  const { currentRole } = useTaskStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTaskId, setUpdateTaskId] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    taskApi.getAll()
      .then(res => {
        const mappedTasks = res.data.map((t: any) => ({
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
        }));
        setTasks(mappedTasks);
      })
      .catch(err => console.error("Failed to load tasks:", err));
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const openTaskDetail = (id: string) => {
    setSelectedTaskId(id);
    setSheetOpen(true);
  };

  const openUpdate = (id: string) => {
    setUpdateTaskId(id);
    setUpdateOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {currentRole === "Lead" ? (
          <LeadDashboard onCreateTask={() => setCreateOpen(true)} tasks={tasks} />
        ) : (
          <MemberDashboard onQuickUpdate={openUpdate} onTaskClick={openTaskDetail} />
        )}

        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Board
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5">
              <Table2 className="h-4 w-4" /> Table
            </TabsTrigger>
          </TabsList>
          <TabsContent value="board" className="mt-4">
            <TaskBoard onTaskClick={openTaskDetail} tasks={tasks} />
          </TabsContent>
          <TabsContent value="table" className="mt-4">
            <TaskTable onTaskClick={openTaskDetail} tasks={tasks} />
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
      />
      <CreateTaskDialog open={createOpen} onClose={() => { setCreateOpen(false); loadTasks(); }} />
      <DailyUpdateDialog
        open={updateOpen}
        taskId={updateTaskId}
        onClose={() => setUpdateOpen(false)}
      />
    </div>
  );
};

export default Index;
