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
import { taskApi, userApi, authApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Table2, Filter, Users, UserPlus, Trash2, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Task, TaskStatus, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from "axios";



const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole, currentUser, setCurrentUser } = useTaskStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTaskId, setUpdateTaskId] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [showMainOnly, setShowMainOnly] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamName, setTeamName] = useState("");
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [pendingDrop, setPendingDrop] = useState<{ taskId: string; newStatus: TaskStatus } | null>(null);
  const [activeTab, setActiveTab] = useState("board");
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();

  // Inline team creation state
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    loadTasks();
    loadUsers();
    loadTeamMembers();
  }, []);

  // Re-load team members whenever currentUser.teamId changes (e.g. after team creation)
  useEffect(() => {
    if (currentUser?.teamId) {
      loadTeamMembers();
    }
  }, [currentUser?.teamId]);

  // Auto-switch to the Team tab when coming from the create-team page
  useEffect(() => {
    if ((location.state as any)?.showTeamTab) {
      setActiveTab("team");
      // Clear the state so refreshing doesn't keep switching to team tab
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadUsers = () => {
    userApi.getAll()
      .then(res => setUsers(res.data))
      .catch(err => console.error("Failed to load users:", err));
  };

  const loadTeamMembers = async () => {
    if (!currentUser?.teamId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
        setTeamName(data.teamName || "");
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
    }
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

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({ title: "Error", description: "Please select a user", variant: "destructive" });
      return;
    }
    if (!currentUser?.teamId) {
      toast({ title: "Error", description: "You must create or join a team first", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Member added successfully" });
        // Use returned members for instant update, then also refresh
        if (data.members) {
          setTeamMembers(data.members);
        }
        setSelectedUserId("");
        setAddMemberDialogOpen(false);
        await loadTeamMembers();
      } else {
        toast({ title: "Error", description: data.message || "Failed to add member", variant: "destructive" });
      }
    } catch (err) {
      console.error("Add member error:", err);
      toast({ title: "Error", description: "Failed to add member", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentUser?.teamId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members/${memberId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        toast({ title: "Success", description: "Member removed successfully" });
        loadTeamMembers();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/without-team`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load available users:", err);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({ title: "Validation Error", description: "Team name is required", variant: "destructive" });
      return;
    }
    setCreatingTeam(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/teams`,
        { name: newTeamName.trim(), description: newTeamDescription.trim() },
        { withCredentials: true }
      );

      if (res.data?.team) {
        // Refresh session to get updated teamId
        const sessionRes = await authApi.getSession();
        if (sessionRes.data?.user) {
          setCurrentUser({
            _id: sessionRes.data.user.id,
            id: sessionRes.data.user.id,
            email: sessionRes.data.user.email,
            name: sessionRes.data.user.name,
            role: sessionRes.data.user.role,
            teamId: sessionRes.data.user.teamId || res.data.team._id,
            jobTitle: sessionRes.data.user.jobTitle || "",
            isActive: sessionRes.data.user.isActive,
            lastUpdateSubmitted: sessionRes.data.user.lastUpdateSubmitted || null,
            avatar: sessionRes.data.user.image,
          });
        }
        toast({ title: "Team Created", description: `"${newTeamName.trim()}" has been created successfully.` });
        setCreateTeamDialogOpen(false);
        setNewTeamName("");
        setNewTeamDescription("");
      }
    } catch (err: any) {
      console.error("Create team failed", err);
      toast({ title: "Error", description: err.response?.data?.message || "Failed to create team.", variant: "destructive" });
    } finally {
      setCreatingTeam(false);
    }
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="board" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" /> Board
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5">
                <Table2 className="h-4 w-4" /> Table
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-1.5">
                <Users className="h-4 w-4" /> Team
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
          <TabsContent value="team" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{teamName || "Team Members"}</h3>
                  <span className="text-sm text-muted-foreground">{teamMembers.length} members</span>
                </div>
                {(currentUser.role === "Lead" || currentUser.role === "Admin") && currentUser.teamId && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await loadAvailableUsers();
                      setAddMemberDialogOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" /> Add Member
                  </Button>
                )}
              </div>
              {!currentUser.teamId ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">You need to create a team first.</p>
                  <Button onClick={() => setCreateTeamDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Create Team
                  </Button>
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No team members found.</p>
              ) : (
                <div className="grid gap-3">
                  {teamMembers.map((member) => (
                    <div key={member._id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.jobTitle || "No title"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{member.role || "Member"}</span>
                        {(currentUser.role === "Lead" || currentUser.role === "Admin") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member._id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
        taskTitle={tasks.find(t => t.id === updateTaskId)?.title}
        onClose={() => setUpdateOpen(false)}
        onSuccess={loadTasks}
      />

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Select a user to add to your team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.filter(user => user._id !== currentUser.id).map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name} {user.email && `• ${user.email}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMemberDialogOpen(false); setSelectedUserId(""); }}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Create Team Dialog (inline, no navigation) */}
      <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Your Team</DialogTitle>
            <DialogDescription>Enter a name and optional description for your new team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="e.g. Engineering Squad"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDesc">Description (optional)</Label>
              <Input
                id="teamDesc"
                placeholder="Brief description of your team"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateTeamDialogOpen(false); setNewTeamName(""); setNewTeamDescription(""); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}>
              {creatingTeam ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
