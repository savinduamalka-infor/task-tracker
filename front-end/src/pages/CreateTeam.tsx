import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskStore } from "@/lib/task-store";

interface MemberInput {
  name: string;
  jobTitle: string;
}

export default function CreateTeam() {
  const { addTeam, setCurrentUser, currentUser } = useTaskStore();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  const [members, setMembers] = useState<MemberInput[]>([
    { name: "", jobTitle: "" },
  ]);

  const handleMemberChange = (
    index: number,
    field: keyof MemberInput,
    value: string
  ) => {
    const updatedMembers = [...members];
    updatedMembers[index][field] = value;
    setMembers(updatedMembers);
  };

  const addMemberField = () => {
    setMembers([...members, { name: "", jobTitle: "" }]);
  };

  const removeMemberField = (index: number) => {
    const updatedMembers = members.filter((_, i) => i !== index);
    setMembers(updatedMembers.length ? updatedMembers : [{ name: "", jobTitle: "" }]);
  };

// const handleSubmit = async () => {
//   if (!teamName.trim()) return;

//   // Prepare payload
//   const validMembers = members.filter((m) => m.name.trim() && m.jobTitle.trim()).map((m) => ({ name: m.name, jobTitle: m.jobTitle }));

//   try {
//     const res = await axios.post(
//       `${import.meta.env.VITE_BACKEND_URL}/api/teams`,
//       { name: teamName, description, members: validMembers },
//       { withCredentials: true, headers: { "Content-Type": "application/json" } }
//     );

//     if (res.data?.team) {
//       const team = res.data.team;
//       // update local store
//       addTeam({ id: team._id || team.id || Date.now().toString(), name: team.name, description: team.description, members: [] as any });
//       // update currentUser's teamId if present
//       if (currentUser && currentUser.id) {
//         setCurrentUser({ ...currentUser, teamId: team._id || team.id });
//       }
//       navigate("/team-members");
//     }
//   } catch (err) {
//     console.error("Create team failed", err);
//   }
// };

// minor improvements in handleSubmit

const handleSubmit = async () => {
  if (!teamName.trim()) {
    alert("Team name is required");
    return;
  }

  const validMembers = members
    .filter((m) => m.name.trim() && m.jobTitle.trim())
    .map((m) => ({ name: m.name.trim(), jobTitle: m.jobTitle.trim() }));

  try {
    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/api/teams`,
      { name: teamName.trim(), description: description.trim(), members: validMembers },
      { withCredentials: true }
    );

    if (res.data?.team) {
      const team = res.data.team;
      addTeam({
        id: team._id || team.id,
        name: team.name,
        description: team.description,
        members: [], // will be loaded later
      });

      if (currentUser && currentUser.id) {
        setCurrentUser({ ...currentUser, teamId: team._id });
      }

      navigate("/");
    }
  } catch (err: any) {
    console.error("Create team failed", err);
    alert(err.response?.data?.message || "Failed to create team. Please try again.");
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Create Your First Team</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Team Name */}
            <Input
              placeholder="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />

            {/* Description */}
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Show Members Button */}
            {!showMembers && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowMembers(true)}
              >
                + Add Team Members
              </Button>
            )}

            {/* Members Section */}
            {showMembers && (
              <div className="space-y-4">

                <h3 className="text-sm font-medium">Team Members</h3>

                {members.map((member, index) => (
                  <div key={index} className="flex gap-2 items-center">

                    <Input
                      placeholder="Member Name"
                      value={member.name}
                      onChange={(e) =>
                        handleMemberChange(index, "name", e.target.value)
                      }
                    />

                    <Input
                      placeholder="Job Role"
                      value={member.jobTitle}
                      onChange={(e) =>
                        handleMemberChange(index, "jobTitle", e.target.value)
                      }
                    />

                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeMemberField(index)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addMemberField}
                >
                  + Add Another Member
                </Button>

              </div>
            )}

            {/* Submit Button */}
            <Button onClick={handleSubmit} className="w-full">
              Create Team
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
