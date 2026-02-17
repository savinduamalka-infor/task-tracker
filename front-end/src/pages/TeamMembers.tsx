import { useTaskStore } from "@/lib/task-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TeamMembers() {
  const { users } = useTaskStore();

  // Group users by teamId
  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.teamId]) {
      acc[user.teamId] = [];
    }
    acc[user.teamId].push(user);
    return acc;
  }, {} as Record<string, typeof users>);

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Team Members</h1>

      {Object.entries(groupedUsers).map(([teamId, teamUsers]) => (
        <Card key={teamId} className="mb-6">
          <CardHeader>
            <CardTitle>{teamId}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {teamUsers.map((user) => (
              <div
                key={user.id}
                className="flex justify-between items-center border p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.jobTitle}
                  </p>
                </div>

                <Badge variant="secondary">
                  {user.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
