import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTaskStore } from "@/lib/task-store";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser } = useTaskStore();

  // if (!currentUser.id) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}
