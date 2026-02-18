import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "@/lib/task-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

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
  const [adding, setAdding] = useState(false);
  const [selectedAddUser, setSelectedAddUser] = useState<string | null>(null);
const [availableUsers, setAvailableUsers] = useState<RemoteUser[]>([]);
const [teamName, setTeamName] = useState<string>("");


  // Fetch only the current user's team members
  useEffect(() => {
    if (!currentUser?.teamId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }

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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`, {
        credentials: "include",
      });
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedAddUser }),
      });

      if (res.ok) {
        setAdding(false);
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/teams/${currentUser.teamId}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        await refreshMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Only admins and leads of this team can manage members
  const canManage = currentUser?.teamId
    ? currentUser.role === "Admin" ||
      (currentUser.role === "Lead" && currentUser.teamId === currentUser.teamId)
    : false;

  if (!currentUser?.teamId) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold flex-1 text-center sm:text-left">
            Team Members
          </h1>
        </div>
        <p className="text-center text-muted-foreground">
          You are not part of any team yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex-1 text-center sm:text-left">
          Team Members
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{teamName ? `${teamName} Members` : "Team Members"}</CardTitle>

            {canManage && (
              <div>
                {adding ? (
                  <div className="flex items-center gap-2">

                    <Select value={selectedAddUser ?? ""} onValueChange={setSelectedAddUser}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select user to add..." />
                      </SelectTrigger>
                      <SelectContent>
{/* 
                        <SelectItem value="placeholder-id-1">Example User 1</SelectItem>
                        <SelectItem value="placeholder-id-2">Example User 2</SelectItem> */}
                        {availableUsers.map((user) => (
  <SelectItem key={user._id} value={user._id}>
    {user.name} {user.email && `• ${user.email}`}
  </SelectItem>
))}

                      </SelectContent>
                    </Select>

                    <Button size="sm" onClick={handleAddMember}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdding(false);
                        setSelectedAddUser(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                //   <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                //     + Add Member
                //   </Button>
                <Button
  size="sm"
  variant="outline"
  onClick={async () => {
    setAdding(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/without-team`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  }}
>
  + Add Member
</Button>

                )}
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
              <div
                key={user._id}
                className="flex justify-between items-center border p-4 rounded-lg"
              >
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveMember(user._id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}