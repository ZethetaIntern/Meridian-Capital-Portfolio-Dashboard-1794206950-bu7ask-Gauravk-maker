import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Loading Meridian Capital...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}