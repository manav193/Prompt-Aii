import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell, Input } from "@/pages/SignIn";

export default function SignUp() {
  const { register, formatApiErrorDetail } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created. Welcome to PromptAI.");
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your workspace." subtitle="Start free. No credit card required.">
      <form onSubmit={submit} className="space-y-4" data-testid="signup-form">
        <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} testid="signup-name" />
        <Input label="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} testid="signup-email" />
        <Input
          label="Password (8+ chars)"
          type={show ? "text" : "password"}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          right={
            <button type="button" onClick={() => setShow((s) => !s)} className="text-white/50 hover:text-white" data-testid="signup-toggle-password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          testid="signup-password"
        />
        <button disabled={loading} className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="signup-submit">
          {loading ? "Creating..." : (<>Create account <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#94A3B8] text-center">
        Already have an account? <Link to="/signin" className="text-cyan hover:underline" data-testid="signup-go-signin">Sign in</Link>
      </p>
    </AuthShell>
  );
}
