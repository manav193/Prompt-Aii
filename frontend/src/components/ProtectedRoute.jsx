import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816]" data-testid="protected-loading">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#00E5FF] animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}
