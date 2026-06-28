import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const { fetchMe } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m ? decodeURIComponent(m[1]) : null;

    (async () => {
      try {
        if (!sessionId) throw new Error("Missing session_id");
        await api.post("/auth/google/session", { session_id: sessionId });
        await fetchMe();
        // Strip hash and land on dashboard
        window.history.replaceState({}, "", "/dashboard");
        nav("/dashboard", { replace: true });
      } catch (e) {
        console.error("AuthCallback failed:", e);
        nav("/signin?error=oauth", { replace: true });
      }
    })();
  }, [fetchMe, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white" data-testid="auth-callback">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#00E5FF] animate-spin" />
        <p className="text-sm text-[#94A3B8]">Signing you in...</p>
      </div>
    </div>
  );
}
