import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function SignIn() {
  const { login, formatApiErrorDetail } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back.");
      nav(loc.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back." subtitle="Sign in to your PromptAI workspace.">
      <form onSubmit={submit} className="space-y-4" data-testid="signin-form">
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} testid="signin-email" />
        <Input
          label="Password"
          type={show ? "text" : "password"}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          right={
            <button type="button" onClick={() => setShow((s) => !s)} className="text-white/50 hover:text-white" data-testid="signin-toggle-password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          testid="signin-password"
        />
        <button disabled={loading} className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="signin-submit">
          {loading ? "Signing in..." : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/forgot-password" className="text-xs text-[#94A3B8] hover:text-white" data-testid="signin-forgot">Forgot your password?</Link>
      </div>
      <p className="mt-6 text-sm text-[#94A3B8] text-center">
        Don’t have an account? <Link to="/signup" className="text-cyan hover:underline" data-testid="signin-go-signup">Create one</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen bg-[#050816] text-white overflow-hidden">
      <AnimatedBackground />
      <div className="relative mx-auto max-w-md px-4 min-h-screen flex items-center justify-center py-16">
        <div className="w-full glass-strong rounded-2xl p-8 glow-cyan" data-testid="auth-card">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: "linear-gradient(180deg, rgba(0,229,255,0.25), rgba(59,130,246,0.15))", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Sparkles className="h-4 w-4 text-cyan" />
            </span>
            <span className="font-display text-lg tracking-tight">Prompt<span className="text-cyan">AI</span></span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h1>
          <p className="mt-1 text-[#94A3B8] text-sm">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Input({ label, type = "text", value, onChange, right, testid }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span>
      <div className="relative">
        <input
          required
          type={type}
          value={value}
          onChange={onChange}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-white/40 ring-focus pr-10"
          data-testid={testid}
        />
        {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
      </div>
    </label>
  );
}
