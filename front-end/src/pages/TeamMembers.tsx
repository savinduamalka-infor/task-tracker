import { useEffect, useState } from "react";
import { useTaskStore } from "@/lib/task-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

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
  const { users, currentUser } = useTaskStore();

  // Group users by teamId
  const groupedUsers = users.reduce((acc, user) => {
    const key = user.teamId ?? "unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {} as Record<string, typeof users>);

  const [remoteMembersByTeam, setRemoteMembersByTeam] = useState<Record<string, RemoteUser[]>>({});
  const [addingTeam, setAddingTeam] = useState<string | null>(null);
  const [selectedAddUser, setSelectedAddUser] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.teamId) {
      fetch(`/api/teams/${currentUser.teamId}/members`, { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((data) => {
          if (data?.members) setRemoteMembersByTeam((s) => ({ ...s, [currentUser.teamId!]: data.members }));
        })
        .catch(() => {});
    }
  }, [currentUser?.teamId]);

  const refreshTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setRemoteMembersByTeam((s) => ({ ...s, [teamId]: data.members }));
    } catch (err) {
      // ignore
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!selectedAddUser) return;
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: selectedAddUser }),
    });
    if (res.ok) {
      setSelectedAddUser(null);
      setAddingTeam(null);
      await refreshTeam(teamId);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) await refreshTeam(teamId);
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Team Members</h1>

      {Object.entries(groupedUsers).map(([teamId, teamUsers]) => (
        <Card key={teamId} className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">{teamId}</CardTitle>

              {currentUser?.role === "Lead" && currentUser?.teamId === teamId && (
                <div className="flex items-center gap-2">
                  {addingTeam === teamId ? (
                    <div className="flex items-center gap-2">
                      <Select value={selectedAddUser ?? ""} onValueChange={(v) => setSelectedAddUser(v)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => !teamUsers.some((tu) => tu.id === u.id))
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => handleAddMember(teamId)}>Add</Button>
                      <Button size="sm" variant="outline" onClick={() => { setAddingTeam(null); setSelectedAddUser(null); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setAddingTeam(teamId)}>+ Add Member</Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>


          <CardContent className="space-y-3">
            {(remoteMembersByTeam[teamId] ?? teamUsers.map((u) => ({ _id: u.id, name: u.name, email: u.email, role: u.role, jobTitle: u.jobTitle }))).map((user: any) => (
              <div
                key={user._id}
                className="flex justify-between items-center border p-3 rounded-md bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">{(user.name || "?").split(" ").map((n:string)=>n[0]).slice(0,2).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.jobTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{user.role}</Badge>
                  {currentUser?.role === "Lead" && currentUser?.teamId === teamId && (
                    <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(teamId, user._id)}>Remove</Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
