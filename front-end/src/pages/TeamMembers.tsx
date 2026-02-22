import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "@/lib/task-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "@/lib/api";

type RemoteUser = {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  teamId?: string | null;
  jobTitle?: string | null;
  isActive?: boolean;
};

export default function TeamMembers() {
  const navigate = useNavigate();
  const { currentUser } = useTaskStore();

  const [members, setMembers] = useState<RemoteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAddUser, setSelectedAddUser] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<RemoteUser[]>([]);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    if (!currentUser?.teamId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await authFetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`,
          { headers: { Accept: "application/json" } },
        );

        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const data = await res.json();
        setMembers(data.members || []);
        setTeamName(data.teamName || "");
      } catch (err) {
        console.error("Failed to load team members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [currentUser?.teamId]);

  const refreshMembers = async () => {
    if (!currentUser?.teamId) return;
    try {
      const res = await authFetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setTeamName(data.teamName || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedAddUser || !currentUser?.teamId) return;

    try {
      const res = await authFetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedAddUser }),
      });

      if (res.ok) {
        setSelectedAddUser(null);
        await refreshMembers();
      } else {
        console.error("Add failed:", await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentUser?.teamId) return;

    try {
      const res = await authFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members/${memberId}`,
        { method: "DELETE" },
      );

      if (res.ok) await refreshMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const canManage = currentUser?.teamId ? currentUser.role === "Lead" : false;

    return (
        <div className="min-h-screen p-6">
            <div className="flex items-center mb-8 pb-4 ">

                <h1 className="text-2xl font-bold flex-1 text-center sm:text-left">Team Members</h1>
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back
                </Button>
            </div>

      {!currentUser?.teamId ? (
        <p className="text-center text-muted-foreground">You are not part of any team yet.</p>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{teamName ? `${teamName} Members` : "Team Members"}</CardTitle>

              {canManage && (
                <div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await authFetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/without-team`);

                            if (res.ok) {
                              const data = await res.json();
                              setAvailableUsers(data.users || []);
                            }
                          } catch (err) {
                            console.error(err);
                          }

                          setDialogOpen(true);
                        }}
                      >
                        + Add Member
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>Select a user to add to the team.</DialogDescription>
                      </DialogHeader>

                      <div className="pt-4">
                        <Select value={selectedAddUser ?? ""} onValueChange={setSelectedAddUser}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select user to add..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.name} {user.email && `• ${user.email}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <DialogFooter>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { await handleAddMember(); setDialogOpen(false); }}>
                            Add
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setDialogOpen(false); setSelectedAddUser(null); }}>
                            Cancel
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading team members...</p>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {teamName ? `No members in ${teamName} yet.` : "No members in your team yet."}
              </p>
            ) : (
              members.map((user) => (
                <div key={user._id} className="flex justify-between items-center border p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">
                        {(user.name || "??").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.jobTitle || "No title"} {user.email && `• ${user.email}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{user.role || "Member"}</Badge>

                    {canManage && (
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(user._id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}