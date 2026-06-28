import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";
import { AuthShell, Input } from "@/pages/SignIn";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Missing reset token.");
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated. Sign in.");
      nav("/signin", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Set a new password." subtitle="Choose something strong (8+ chars).">
      <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
        <Input
          label="New password"
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          right={
            <button type="button" onClick={() => setShow((s) => !s)} className="text-white/50 hover:text-white" data-testid="reset-toggle-password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          testid="reset-password"
        />
        <button disabled={loading || !token} className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="reset-submit">
          {loading ? "Updating..." : (<>Update password <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#94A3B8] text-center">
        Back to <Link to="/signin" className="text-cyan hover:underline" data-testid="reset-back-signin">Sign in</Link>
      </p>
    </AuthShell>
  );
}
