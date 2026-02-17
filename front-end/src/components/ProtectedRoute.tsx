import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTaskStore } from "@/lib/task-store";
import { authApi } from "@/lib/api";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, setCurrentUser } = useTaskStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser.id) {
      authApi.getSession()
        .then(res => {
          if (res.data?.user) {
            setCurrentUser({
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
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser.id, setCurrentUser]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser.id) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
