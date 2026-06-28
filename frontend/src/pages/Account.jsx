import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Crown, ArrowRight } from "lucide-react";

export default function Account() {
  const { user, fetchMe } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const setPlan = async (plan) => {
    setBusy(true);
    try {
      await api.post("/me/subscription", { plan });
      await fetchMe();
      toast.success(plan === "pro" ? "Welcome to Pro." : "Switched to Free.");
    } catch (e) {
      toast.error("Couldn't update plan.");
    } finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <div data-testid="account-page">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Account</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Settings</h1>
        </header>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg tracking-tight">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Name" value={user.name || "—"} testid="account-name" />
            <Row label="Email" value={user.email} testid="account-email" />
            <Row label="Provider" value={user.provider} testid="account-provider" />
            <Row label="Email verified" value={user.email_verified ? "Yes" : "No"} testid="account-verified" />
          </dl>
        </div>

        <div className="mt-6 glass rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-lg tracking-tight inline-flex items-center gap-2">
                <Crown className="h-4 w-4 text-cyan" /> Subscription
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                You're on the <span className="text-white capitalize" data-testid="account-plan">{user.subscription}</span> plan.
              </p>
            </div>
            {user.subscription === "pro" ? (
              <button onClick={() => setPlan("free")} disabled={busy} className="btn-ghost-glass rounded-full px-4 py-2 text-xs" data-testid="account-downgrade">
                Switch to Free (demo)
              </button>
            ) : (
              <button onClick={() => setPlan("pro")} disabled={busy} className="btn-primary rounded-full px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2" data-testid="account-upgrade">
                Upgrade to Pro <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-3 text-[11px] text-[#94A3B8]">Stripe checkout integration coming next — for now you can toggle here to demo gating.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value, testid }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
      <dt className="text-[#94A3B8]">{label}</dt>
      <dd className="text-white" data-testid={testid}>{value}</dd>
    </div>
  );
}
