import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";
import { AuthShell, Input } from "@/pages/SignIn";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("If that email exists, a reset link has been sent.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a secure reset link.">
      {sent ? (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/[0.08] px-4 py-5 text-sm" data-testid="forgot-sent">
          <Mail className="h-5 w-5 text-[#10B981] mb-2" />
          Check your inbox at <span className="text-white">{email}</span>. The link is valid for one hour.
          <p className="mt-2 text-[12px] text-[#94A3B8]">No email yet? Check the backend logs (no email provider configured in this MVP).</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} testid="forgot-email" />
          <button disabled={loading} className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="forgot-submit">
            {loading ? "Sending..." : (<>Send reset link <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-[#94A3B8] text-center">
        Remembered it? <Link to="/signin" className="text-cyan hover:underline" data-testid="forgot-back-signin">Sign in</Link>
      </p>
    </AuthShell>
  );
}
