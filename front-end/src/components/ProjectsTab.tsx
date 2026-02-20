import { useEffect, useState } from "react";
import { useTaskStore } from "@/lib/task-store";
import { projectApi } from "@/lib/api";
import { Project } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderOpen, Plus, Pencil, Trash2 } from "lucide-react";

interface ProjectsTabProps {
  teamId: string;
  initialProjects?: Project[];
  onProjectsChange?: (projects: Project[]) => void;
}

export function ProjectsTab({ teamId, initialProjects = [], onProjectsChange }: ProjectsTabProps) {
  const { currentUser } = useTaskStore();
  const { toast } = useToast();
  const isLead = currentUser.role === "Lead";

  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await projectApi.getByTeam(teamId);
      const newProjects = res.data.projects || [];
      setProjects(newProjects);
      onProjectsChange?.(newProjects);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  };

  useEffect(() => {
    if (initialProjects.length === 0 && teamId) {
      loadProjects();
    }
  }, [teamId]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await projectApi.create(teamId, {
        name: createName.trim(),
        description: createDesc.trim() || undefined,
      });
      const newProjects = [res.data.project, ...projects];
      setProjects(newProjects);
      onProjectsChange?.(newProjects);
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
      toast({ title: "Project created", description: `"${res.data.project.name}" has been added.` });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (project: Project) => {
    setEditProject(project);
    setEditName(project.name);
    setEditDesc(project.description || "");
  };

  const handleUpdate = async () => {
    if (!editProject || !editName.trim()) return;
    setUpdating(true);
    try {
      const res = await projectApi.update(editProject._id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      const newProjects = projects.map((p) => (p._id === editProject._id ? res.data.project : p));
      setProjects(newProjects);
      onProjectsChange?.(newProjects);
      setEditProject(null);
      toast({ title: "Project updated", description: `"${res.data.project.name}" has been updated.` });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update project",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      await projectApi.delete(project._id);
      const newProjects = projects.filter((p) => p._id !== project._id);
      setProjects(newProjects);
      onProjectsChange?.(newProjects);
      toast({ title: "Project deleted", description: `"${project.name}" has been removed.` });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Projects</h3>
          <span className="text-sm text-muted-foreground">{projects.length} projects</span>
        </div>
        {isLead && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No projects found.</p>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <div key={project._id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.description || "No description"} · Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {isLead && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(project)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(project)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) { setCreateOpen(false); setCreateName(""); setCreateDesc(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Add a new project to your team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Website Redesign"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); setCreateName(""); setCreateDesc(""); }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProject} onOpenChange={(o) => { if (!o) setEditProject(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updating || !editName.trim()}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
