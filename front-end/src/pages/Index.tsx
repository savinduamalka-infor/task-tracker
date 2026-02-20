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
import { taskApi, userApi, authApi, joinRequestApi, teamApi, assignRequestApi } from "@/lib/api";
import { AssignRequest } from "@/components/dashboard/LeadDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Table2, Filter, Users, UserPlus, Trash2, Plus, Clock, Check, X, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Task, TaskStatus, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const {currentUser, setCurrentUser } = useTaskStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  //const [tasks, setTasks] = useState<Task[]>([]);
  //const [users, setUsers] = useState<User[]>([]);
  //const { tasks, currentRole } = useTaskStore();
  //const [tasks, setTasks] = useState<Task[]>([]);
  const { tasks: storeTasks, currentRole } = useTaskStore();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);

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

  // Join request state (for Members)
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [myJoinRequests, setMyJoinRequests] = useState<any[]>([]);
  const [sendingJoinRequest, setSendingJoinRequest] = useState<string | null>(null);

  // Join requests for Lead to review
  const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Assign/help requests for Lead to review
  const [pendingAssignRequests, setPendingAssignRequests] = useState<AssignRequest[]>([]);

  useEffect(() => {
    loadTasks();
    loadUsers();
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (currentUser?.teamId) {
      loadTeamMembers();
      loadUsers();
      loadTasks();
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
    if (currentUser?.teamId) {
      teamApi.getMembers(currentUser.teamId)
        .then(res => {
          const members = (res.data?.members || []).map((m: any) => ({
            _id: String(m._id),
            id: String(m._id),
            name: m.name,
            email: m.email,
            role: m.role,
            teamId: m.teamId,
            jobTitle: m.jobTitle || "",
            isActive: m.isActive ?? true,
            lastUpdateSubmitted: null,
          }));
          setUsers(members);
        })
        .catch(err => console.error("Failed to load team members:", err));
    } else {
      setUsers([]);
    }
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
          helperIds: t.helperIds || [],
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
    const task = tasks.find((t) => t.id === taskId);
    const isAssignee = task?.assigneeId === currentUser.id;
    const isLead = currentRole === "Lead";

    if (!isAssignee && !isLead) {
      toast({
        title: "Permission Denied",
        description: "Only the task assignee or a Lead can change the task status.",
        variant: "destructive",
      });
      return;
    }

    if (newStatus === "BLOCKED") {
      setPendingDrop({ taskId, newStatus });
      setBlockedReason("");
      setBlockedDialogOpen(true);
      return;
    }
    applyStatusChange(taskId, newStatus);
  };

  const statusLabel = (s: TaskStatus) =>
    ({ TODO: "To Do", IN_PROGRESS: "In Progress", BLOCKED: "Blocked", DONE: "Done" }[s] ?? s);

  const applyStatusChange = async (taskId: string, newStatus: TaskStatus, reason?: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const updatePayload: any = {
        status: newStatus,
        updates: {
          note: reason
            ? `Status changed to Blocked`
            : `Status changed to ${statusLabel(newStatus)}`,
          ...(reason ? { blockedReason: reason } : {}),
        },
      };
      await taskApi.update(taskId, updatePayload);
      toast({ title: "Status Updated", description: `Task moved to ${newStatus.replace("_", " ")}.` });
      loadTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      loadTasks();
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
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Member removed and tasks reassigned to lead" });
        loadTeamMembers();
        loadTasks();
      } else {
        toast({ title: "Error", description: data.message || "Failed to remove member", variant: "destructive" });
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

  const loadAllTeams = async () => {
    try {
      const res = await teamApi.getAll();
      setAllTeams(res.data?.teams || []);
    } catch (err) {
      console.error("Failed to load teams:", err);
    }
  };

  const loadMyJoinRequests = async () => {
    try {
      const res = await joinRequestApi.getMine();
      setMyJoinRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Failed to load join requests:", err);
    }
  };
  useEffect(() => {
    if (!currentUser?.teamId && currentUser?.id && currentUser.role !== "Lead") {
      const interval = setInterval(() => {
        loadMyJoinRequests();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.teamId, currentUser?.id, currentUser?.role]);

  const loadPendingJoinRequests = async () => {
    if (!currentUser?.teamId) return;
    try {
      const res = await joinRequestApi.getForTeam(currentUser.teamId);
      setPendingJoinRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Failed to load pending join requests:", err);
    }
  };

  const loadPendingAssignRequests = async () => {
    if (!currentUser?.teamId) return;
    try {
      const res = await assignRequestApi.getForTeam(currentUser.teamId);
      setPendingAssignRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Failed to load pending assign requests:", err);
    }
  };

  const handleApproveAssignRequest = async (requestId: string, newHelperId: string, resolvedNote?: string) => {
    await assignRequestApi.approve(requestId, { newHelperId, resolvedNote });
    toast({ title: "Helper Added", description: "A helper has been added to the task." });
    await loadPendingAssignRequests();
    loadTasks();
  };

  const handleRejectAssignRequest = async (requestId: string, resolvedNote?: string) => {
    await assignRequestApi.reject(requestId, { resolvedNote });
    toast({ title: "Request Rejected", description: "The help request has been declined." });
    await loadPendingAssignRequests();
  };

  const handleSendJoinRequest = async (teamId: string) => {
    setSendingJoinRequest(teamId);
    try {
      await joinRequestApi.create(teamId);
      toast({ title: "Request Sent", description: "Your join request has been sent to the team lead." });
      await loadMyJoinRequests();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send join request.",
        variant: "destructive",
      });
    } finally {
      setSendingJoinRequest(null);
    }
  };

  const handleAcceptJoinRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await joinRequestApi.accept(requestId);
      toast({ title: "Accepted", description: "Member has been added to your team." });
      await loadPendingJoinRequests();
      await loadTeamMembers();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to accept request.", variant: "destructive" });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      await joinRequestApi.reject(requestId);
      toast({ title: "Rejected", description: "Join request has been rejected." });
      await loadPendingJoinRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to reject request.", variant: "destructive" });
    } finally {
      setProcessingRequest(null);
    }
  };

  useEffect(() => {
    if (!currentUser?.teamId && currentUser?.id) {
      loadAllTeams();
      loadMyJoinRequests();
    }
    if (currentUser?.teamId && currentUser.role === "Lead") {
      loadPendingJoinRequests();
      loadPendingAssignRequests();
    }
  }, [currentUser?.teamId, currentUser?.id, currentUser?.role]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {currentRole === "Lead" ? (
          <LeadDashboard
            onCreateTask={() => setCreateOpen(true)}
            tasks={tasks}
            assignRequests={pendingAssignRequests}
            users={users}
            onApproveRequest={handleApproveAssignRequest}
            onRejectRequest={handleRejectAssignRequest}
          />
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
            <div className="space-y-6">
              {currentUser.teamId ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{teamName || "Team Members"}</h3>
                      <span className="text-sm text-muted-foreground">{teamMembers.length} members</span>
                    </div>
                    {currentUser.role === "Lead" && (
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

                  {currentUser.role === "Lead" && pendingJoinRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Pending Join Requests ({pendingJoinRequests.length})
                      </h4>
                      <div className="grid gap-2">
                        {pendingJoinRequests.map((req) => (
                          <div key={req._id} className="border border-dashed border-primary/30 rounded-lg p-4 flex items-center justify-between bg-primary/5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {req.user?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{req.user?.name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {req.user?.jobTitle || "No title"} {req.user?.email && `• ${req.user.email}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptJoinRequest(req._id)}
                                disabled={processingRequest === req._id}
                                className="gap-1.5"
                              >
                                <Check className="h-4 w-4" />
                                {processingRequest === req._id ? "..." : "Accept"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectJoinRequest(req._id)}
                                disabled={processingRequest === req._id}
                                className="gap-1.5 text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {teamMembers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No team members found.</p>
                  ) : (
                    <div className="grid gap-3">
                      {teamMembers.map((member) => {
                        const isTeamLead = member._id === currentUser.teamId && teamMembers.find(m => m._id === member._id)?.role === "Lead";
                        // Find team creator from team data
                        const isCreator = allTeams.find(t => t._id === currentUser.teamId)?.createdBy === member._id;
                        
                        return (
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
                            {currentUser.role === "Lead" && member._id !== currentUser.id && (
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
                      )})}
                    </div>
                  )}
                </>
              ) : currentUser.role === "Lead" ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">You need to create a team first.</p>
                  <Button onClick={() => setCreateTeamDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Create Team
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold">Join a Team</h3>
                    <p className="text-sm text-muted-foreground">
                      Send a request to join an available team. The team lead will review your request.
                    </p>
                  </div>

                  {myJoinRequests.filter((r) => r.status === "pending" || r.status === "rejected").length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Your Join Requests
                      </h4>
                      <div className="grid gap-2">
                        {myJoinRequests
                          .filter((r) => r.status === "pending" || r.status === "rejected")
                          .map((r) => (
                            <div
                              key={r._id}
                              className={`border rounded-lg p-4 flex items-center justify-between ${
                                r.status === "rejected" ? "bg-destructive/5 border-destructive/20" : "bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  r.status === "rejected" ? "bg-destructive/10" : "bg-primary/10"
                                }`}>
                                  {r.status === "rejected" ? (
                                    <X className="h-5 w-5 text-destructive" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{r.teamName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {r.status === "rejected" ? "Request rejected" : "Waiting for approval"}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={r.status === "rejected" ? "destructive" : "secondary"}
                                className="gap-1.5"
                              >
                                {r.status === "rejected" ? (
                                  <><X className="h-3 w-3" /> Rejected</>
                                ) : (
                                  <><Clock className="h-3 w-3" /> Pending</>
                                )}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Available Teams
                    </h4>
                    {allTeams.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No teams available. Please wait for a team lead to create a team.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {allTeams.map((team) => {
                          const hasPending = myJoinRequests.some(
                            (r) => r.teamId === team._id && r.status === "pending"
                          );
                          return (
                            <div
                              key={team._id}
                              className="border rounded-lg p-4 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{team.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {team.description || "No description"} • {team.members?.length || 0} members
                                  </p>
                                </div>
                              </div>
                              {hasPending ? (
                                <Badge variant="secondary" className="gap-1.5">
                                  <Clock className="h-3 w-3" /> Requested
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendJoinRequest(team._id)}
                                  disabled={sendingJoinRequest === team._id}
                                  className="gap-1.5"
                                >
                                  <Send className="h-4 w-4" />
                                  {sendingJoinRequest === team._id ? "Sending..." : "Request to Join"}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
     {/* <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} /> */}


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
