import { Moon, Sun, ChevronDown, LogOut, ClipboardList } from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTaskStore } from "@/lib/task-store";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, currentRole, setCurrentRole, logout } = useTaskStore();

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const handleLogout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/sign-out`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Logout API error:", error);
    }
    logout();

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });

    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 mr-auto">
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">TaskFlow</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Role Switcher */}
          <div className="hidden sm:flex items-center gap-1 mr-2 border rounded-lg p-0.5">
            <Button
              variant={currentRole === "Lead" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCurrentRole("Lead")}
            >
              Lead
            </Button>
            <Button
              variant={currentRole === "Member" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCurrentRole("Member")}
            >
              Member
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/team-members")}
            className="hidden sm:flex items-center gap-1"
          >
            <Users className="h-4 w-4" />
            Team 
          </Button>



          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm">{currentUser.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span>{currentUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {currentUser.jobTitle}
                  </span>
                  <Badge variant="secondary" className="w-fit text-xs mt-1">
                    {currentRole}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="sm:hidden" onClick={() => setCurrentRole(currentRole === "Lead" ? "Member" : "Lead")}>
                Switch to {currentRole === "Lead" ? "Member" : "Lead"} View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
