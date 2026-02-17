import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskStore } from "@/lib/task-store";

interface MemberInput {
  name: string;
  jobTitle: string;
}

export default function CreateTeam() {
  const { addTeam } = useTaskStore();
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
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const addMemberField = () => {
    setMembers([...members, { name: "", jobTitle: "" }]);
  };

  const removeMemberField = (index: number) => {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const handleSubmit = () => {
    if (!teamName.trim()) return;

    addTeam({
      id: Date.now().toString(),
      name: teamName,
      description,
    });

    console.log("Members:", members);

    navigate("/");
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

            {/* Add Team Member Button */}
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

            {/* Members Section (Hidden Until Clicked) */}
            {showMembers && (
              <div className="space-y-3">
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

            {/* Create Button */}
            <Button onClick={handleSubmit} className="w-full">
              Create Team
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
