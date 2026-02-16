import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTaskStore } from "@/lib/task-store";
import { TaskStatus, TaskPriority, Task } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Search, ArrowUpDown, ListChecks } from "lucide-react";

interface TaskTableProps {
  onTaskClick: (taskId: string) => void;
}

type SortKey = "title" | "priority" | "dueDate" | "status";

export function TaskTable({ onTaskClick }: TaskTableProps) {
  const { tasks, getUserById } = useTaskStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (search) result = result.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") result = result.filter((t) => t.priority === priorityFilter);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "dueDate") cmp = a.dueDate.localeCompare(b.dueDate);
      else if (sortKey === "priority") {
        const order = { High: 0, Medium: 1, Low: 2 };
        cmp = order[a.priority] - order[b.priority];
      } else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [tasks, search, statusFilter, priorityFilter, sortKey, sortAsc]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => toggleSort(k)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Title" k="title" /></TableHead>
              <TableHead className="hidden md:table-cell">Assignee</TableHead>
              <TableHead><SortHeader label="Status" k="status" /></TableHead>
              <TableHead><SortHeader label="Priority" k="priority" /></TableHead>
              <TableHead><SortHeader label="Due Date" k="dueDate" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => {
                const assignee = getUserById(task.assigneeId);
                const initials = assignee?.name.split(" ").map((n) => n[0]).join("") ?? "?";
                const stDone = task.suggestedSubtasks.filter((s) => s.status === "DONE").length;
                const stTotal = task.suggestedSubtasks.length;
                return (
                  <TableRow key={task.id} className="cursor-pointer" onClick={() => onTaskClick(task.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {task.title}
                        {stTotal > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <ListChecks className="h-3 w-3" />
                            {stDone}/{stTotal}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={task.status} /></TableCell>
                    <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                    <TableCell className="text-sm">{format(parseISO(task.dueDate), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
