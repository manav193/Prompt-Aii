import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Shield, KeyRound, AtSign, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";

export default function Settings() {
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  if (!user) return null;

  const resend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success("Verification link sent. Check the backend logs.");
    } finally { setResending(false); }
  };

  return (
    <DashboardLayout>
      <div data-testid="settings-page">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Settings</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Profile & security</h1>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg tracking-tight inline-flex items-center gap-2"><AtSign className="h-4 w-4 text-cyan" /> Profile</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Name" value={user.name || "—"} testid="settings-name" />
              <Row label="Email" value={user.email} testid="settings-email" />
              <Row label="Provider" value={<span className="capitalize">{user.provider}</span>} testid="settings-provider" />
              <Row
                label="Plan"
                value={<span className="capitalize">{user.subscription}</span>}
                testid="settings-plan"
                extra={<Link to="/billing" className="text-xs text-cyan hover:underline" data-testid="settings-billing-link">Manage</Link>}
              />
            </dl>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg tracking-tight inline-flex items-center gap-2"><Shield className="h-4 w-4 text-cyan" /> Security</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row
                label="Email verification"
                value={user.email_verified ? (
                  <span className="inline-flex items-center gap-1.5 text-[#10B981]"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
                ) : (
                  <span className="text-amber-300">Not verified</span>
                )}
                testid="settings-verified"
                extra={!user.email_verified && (
                  <button onClick={resend} disabled={resending} className="text-xs text-cyan hover:underline" data-testid="settings-resend-verify">
                    Resend link
                  </button>
                )}
              />
              <Row
                label="Password"
                value={user.provider === "google" ? "Managed by Google" : "•••••••"}
                testid="settings-password"
                extra={user.provider === "email" && (
                  <Link to="/forgot-password" className="text-xs text-cyan hover:underline" data-testid="settings-change-password">
                    Reset
                  </Link>
                )}
              />
              <Row
                label="Sessions"
                value={"Active"}
                testid="settings-sessions"
              />
            </dl>
          </div>
        </div>

        <div className="mt-8 glass rounded-2xl p-6">
          <h2 className="font-display text-lg tracking-tight inline-flex items-center gap-2"><Mail className="h-4 w-4 text-cyan" /> Notifications</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">Email notifications come online with the Resend integration. For now you'll see toasts inside the app.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value, testid, extra }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
      <dt className="text-[#94A3B8]">{label}</dt>
      <dd className="flex items-center gap-3">
        <span className="text-white" data-testid={testid}>{value}</span>
        {extra}
      </dd>
    </div>
  );
}
