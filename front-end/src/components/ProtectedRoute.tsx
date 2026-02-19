import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTaskStore } from "@/lib/task-store";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, setCurrentUser, logout } = useTaskStore();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getSession()
      .then((res) => {
        if (res.data?.user) {
          setCurrentUser({
            _id: res.data.user.id,
            id: res.data.user.id,
            email: res.data.user.email,
            name: res.data.user.name,
            role: res.data.user.role,
            teamId: res.data.user.teamId || "",
            jobTitle: res.data.user.jobTitle || "",
            isActive: res.data.user.isActive,
            lastUpdateSubmitted: res.data.user.lastUpdateSubmitted || null,
            avatar: res.data.user.image,
          });
        } else {
          logout();
        }
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser.id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
