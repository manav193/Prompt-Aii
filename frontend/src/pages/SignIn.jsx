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

  const googleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthShell title="Welcome back." subtitle="Sign in to your PromptAI workspace.">
      <button onClick={googleSignIn} className="w-full btn-ghost-glass rounded-xl px-4 py-3 text-sm inline-flex items-center justify-center gap-2.5" data-testid="signin-google">
        <GoogleMark /> Continue with Google
      </button>
      <Divider />
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

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-[#94A3B8]">
      <span className="flex-1 h-px hairline" />
      <span>or</span>
      <span className="flex-1 h-px hairline" />
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.1 4 9.3 8.5 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.6 26.8 36.5 24 36.5c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.2 39.4 16 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c4.4-4 7.6-10 7.6-16.3 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
