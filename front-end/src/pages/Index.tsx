import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LeadDashboard } from "@/components/dashboard/LeadDashboard";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { TaskBoard } from "@/components/board/TaskBoard";
import { TaskTable } from "@/components/TaskTable";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { DailyUpdateDialog } from "@/components/DailyUpdateDialog";
import { useTaskStore } from "@/lib/task-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Table2 } from "lucide-react";

const Index = () => {
  const { tasks, currentRole } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTaskId, setUpdateTaskId] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);

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
          <LeadDashboard onCreateTask={() => setCreateOpen(true)} />
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
            <TaskBoard onTaskClick={openTaskDetail} />
          </TabsContent>
          <TabsContent value="table" className="mt-4">
            <TaskTable onTaskClick={openTaskDetail} />
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
      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <DailyUpdateDialog
        open={updateOpen}
        taskId={updateTaskId}
        onClose={() => setUpdateOpen(false)}
      />
    </div>
  );
};

export default Index;
