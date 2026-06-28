import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/pages/SignIn";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { fetchMe } = useAuth();
  const ran = useRef(false);
  const [status, setStatus] = useState("pending"); // pending | ok | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");
    if (!token) { setStatus("error"); setError("Missing token."); return; }
    (async () => {
      try {
        await api.post("/auth/verify-email", { token });
        await fetchMe().catch(() => null);
        setStatus("ok");
      } catch (err) {
        setStatus("error");
        setError(err.response?.data?.detail || "Verification failed.");
      }
    })();
  }, [params, fetchMe]);

  return (
    <AuthShell title="Email verification" subtitle="Confirming your email address.">
      <div className="text-center" data-testid="verify-status">
        {status === "pending" && (
          <div className="py-6">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/10 border-t-[#00E5FF] animate-spin" />
            <p className="mt-4 text-sm text-[#94A3B8]">Verifying...</p>
          </div>
        )}
        {status === "ok" && (
          <div className="py-4" data-testid="verify-ok">
            <span className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-[#10B981]/15 border border-[#10B981]/40">
              <Check className="h-6 w-6 text-[#10B981]" />
            </span>
            <p className="mt-4 font-display text-lg">You're verified.</p>
            <Link to="/dashboard" className="mt-5 inline-flex btn-primary rounded-full px-5 py-2.5 text-sm font-semibold" data-testid="verify-go-dashboard">
              Continue to dashboard
            </Link>
          </div>
        )}
        {status === "error" && (
          <div className="py-4" data-testid="verify-error">
            <span className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-red-500/15 border border-red-500/40">
              <X className="h-6 w-6 text-red-400" />
            </span>
            <p className="mt-4 font-display text-lg">Verification failed.</p>
            <p className="mt-1 text-sm text-[#94A3B8]">{error}</p>
            <Link to="/signin" className="mt-5 inline-flex btn-ghost-glass rounded-full px-5 py-2.5 text-sm" data-testid="verify-back-signin">Back to sign in</Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
