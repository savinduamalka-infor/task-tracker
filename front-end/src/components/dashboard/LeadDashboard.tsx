import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, ListTodo, Clock, AlertTriangle, CheckCircle2, HandHelping, Check, X, Loader2, ArrowRight,
} from "lucide-react";
import { Task, User } from "@/lib/types";
import { AiSummary } from "@/components/AiSummary";
import { cn } from "@/lib/utils";

export interface AssignRequest {
  _id: string;
  taskId: string;
  requesterId: string;
  teamId: string;
  suggestedMemberIds: string[];
  note: string;
  status: string;
  createdAt: string;
  requester?: { _id: string; name: string; email: string; role?: string; jobTitle?: string } | null;
  suggestedMembers?: { _id: string; name: string; email?: string; jobTitle?: string }[];
  task?: { _id: string; title: string; assigneeId: string; status: string; priority: string } | null;
}

interface LeadDashboardProps {
  onCreateTask: () => void;
  tasks: Task[];
  assignRequests?: AssignRequest[];
  users?: User[];
  onApproveRequest?: (requestId: string, newHelperId: string, resolvedNote?: string) => Promise<void>;
  onRejectRequest?: (requestId: string, resolvedNote?: string) => Promise<void>;
}

export function LeadDashboard({
  onCreateTask,
  tasks,
  assignRequests = [],
  users = [],
  onApproveRequest,
  onRejectRequest,
}: LeadDashboardProps) {

  const todo = tasks.filter((t) => t.status === "TODO").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [resolvedNote, setResolvedNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const handleApprove = async (requestId: string) => {
    if (!selectedAssigneeId) return;
    setProcessing(requestId);
    try {
      await onApproveRequest?.(requestId, selectedAssigneeId, resolvedNote || undefined);
      setReviewingId(null);
      setSelectedAssigneeId("");
      setResolvedNote("");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await onRejectRequest?.(requestId, rejectNote || undefined);
      setRejectDialogId(null);
      setRejectNote("");
    } finally {
      setProcessing(null);
    }
  };

  const stats = [
    { label: "To Do", count: todo, icon: ListTodo, color: "text-blue-600 dark:text-blue-400" },
    { label: "In Progress", count: inProgress, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
    { label: "Blocked", count: blocked, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
    { label: "Done", count: done, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  const initials = (name?: string) =>
    name?.split(" ").map((n) => n[0]).join("") || "?";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor your team's progress and manage tasks.</p>
        </div>
        <div className="flex items-center space-x-3">

        <Button onClick={onCreateTask} className="gap-2">
          <Plus className="h-4 w-4" /> Assign Task
        </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Sprint Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {done} of {total} tasks completed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {assignRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HandHelping className="h-4 w-4 text-amber-500" />
              Help Requests
              <Badge variant="secondary" className="ml-1 text-xs">{assignRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {assignRequests.map((req) => (
              <div key={req._id} className="rounded-md border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {initials(req.requester?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{req.requester?.name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground mx-1.5">·</span>
                    <span className="text-xs text-muted-foreground truncate">{req.task?.title || "Unknown Task"}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs shrink-0",
                      req.task?.priority === "High" ? "border-red-200 text-red-600 dark:text-red-400" :
                      req.task?.priority === "Medium" ? "border-amber-200 text-amber-600 dark:text-amber-400" :
                      "border-blue-200 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {req.task?.priority || "—"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2 leading-relaxed">
                  {req.note}
                </p>

                {req.suggestedMembers && req.suggestedMembers.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Suggested:</span>
                    {req.suggestedMembers.map((m) => (
                      <Badge key={m._id} variant="secondary" className="text-xs gap-1 py-0">
                        <Avatar className="h-3.5 w-3.5">
                          <AvatarFallback className="text-[7px]">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        {m.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {reviewingId === req._id ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Pick a member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter((u) => u._id !== req.requesterId).map((u) => (
                          <SelectItem key={u._id} value={u._id} className="text-sm">
                            {u.name}
                            {u.jobTitle && (
                              <span className="ml-1.5 text-xs text-muted-foreground">({u.jobTitle})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs gap-1 shrink-0"
                      onClick={() => handleApprove(req._id)}
                      disabled={!selectedAssigneeId || processing === req._id}
                    >
                      {processing === req._id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ArrowRight className="h-3.5 w-3.5" />}
                      Add as Helper
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs shrink-0"
                      onClick={() => { setReviewingId(null); setSelectedAssigneeId(""); setResolvedNote(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5 pt-0.5">
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      onClick={() => {
                        setReviewingId(req._id);
                        const firstSuggested = req.suggestedMembers?.[0]?._id;
                        setSelectedAssigneeId(firstSuggested ? String(firstSuggested) : "");
                        setResolvedNote("");
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> Add Helper
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => { setRejectDialogId(req._id); setRejectNote(""); }}
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AiSummary />
      <Dialog open={!!rejectDialogId} onOpenChange={(o) => { if (!o) { setRejectDialogId(null); setRejectNote(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Help Request</DialogTitle>
            <DialogDescription>Optionally explain why the request is being declined.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setRejectDialogId(null); setRejectNote(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectDialogId && handleReject(rejectDialogId)}
              disabled={processing === rejectDialogId}
              className="gap-1.5"
            >
              {processing === rejectDialogId ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {processing === rejectDialogId ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
