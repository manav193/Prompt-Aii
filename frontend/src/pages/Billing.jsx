import { useEffect, useState } from "react";
import { ArrowRight, Check, CreditCard, Receipt, Crown, Coins } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export default function Billing() {
  const { user, fetchMe } = useAuth();
  const [credits, setCredits] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/me/usage").then(({ data }) => setCredits(data));
  }, []);

  const change = async (plan) => {
    setBusy(true);
    try {
      const { data } = await api.post("/me/subscription", { plan });
      setCredits(data.credits);
      await fetchMe();
      toast.success(plan === "pro" ? "Welcome to Pro." : "Switched to Free.");
    } finally { setBusy(false); }
  };

  if (!user) return null;
  const isPro = user.subscription === "pro";

  return (
    <DashboardLayout>
      <div data-testid="billing-page">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Billing</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Plan & credits</h1>
          <p className="mt-2 text-[#94A3B8]">Stripe checkout is coming. For now, toggle plans to preview gating and credits.</p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            cadence="forever"
            features={[
              "100 credits per cycle",
              "Refill 30 days after balance hits 0",
              "Photo Promptlets unlocked",
              "Personal prompt library",
            ]}
            active={!isPro}
            cta={isPro ? { label: "Switch to Free", onClick: () => change("free"), variant: "ghost" } : { label: "Current plan", disabled: true }}
            testid="plan-free"
          />
          <PlanCard
            name="Pro"
            price="$19"
            cadence="/ month"
            features={[
              "Unlimited credits",
              "Full library (24 Pro promptlets)",
              "Priority optimizer queue",
              "Founding-member pricing locked in",
            ]}
            highlight
            active={isPro}
            cta={isPro ? { label: "Current plan", disabled: true } : { label: "Upgrade to Pro", onClick: () => change("pro") }}
            testid="plan-pro"
            busy={busy}
          />
        </div>

        <div className="mt-8 glass rounded-2xl p-6">
          <h2 className="font-display text-lg tracking-tight inline-flex items-center gap-2"><Coins className="h-4 w-4 text-cyan" /> Credit balance</h2>
          <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
            <Row label="Plan" value={<span className="capitalize">{credits?.plan || "—"}</span>} testid="billing-plan" />
            <Row label="Remaining" value={credits?.plan === "pro" ? "Unlimited" : (credits?.balance ?? "—")} testid="billing-remaining" />
            <Row label="Next refill" value={credits?.plan === "pro" ? "—" : (credits?.next_credit_date ? new Date(credits.next_credit_date).toLocaleDateString() : "Starts when you hit 0")} testid="billing-next" />
          </div>
        </div>

        <div className="mt-8 glass rounded-2xl p-6" data-testid="billing-stripe-placeholder">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-lg grid place-items-center" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.30)" }}>
              <CreditCard className="h-4 w-4 text-[#60A5FA]" />
            </span>
            <div>
              <h3 className="font-display text-lg tracking-tight">Payment methods</h3>
              <p className="text-xs text-[#94A3B8]">Stripe checkout integration is coming soon. You'll be able to manage cards, invoices and proration here.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 glass rounded-2xl p-6" data-testid="billing-invoices-placeholder">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-lg grid place-items-center" style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.30)" }}>
              <Receipt className="h-4 w-4 text-[#10B981]" />
            </span>
            <div>
              <h3 className="font-display text-lg tracking-tight">Invoices</h3>
              <p className="text-xs text-[#94A3B8]">No invoices yet. Past payments will appear here once billing is live.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PlanCard({ name, price, cadence, features, highlight, active, cta, testid, busy }) {
  return (
    <div className={`relative rounded-2xl p-7 ${highlight ? "glass-strong border-cyan glow-cyan" : "glass"}`} data-testid={testid}>
      {highlight && (
        <span className="absolute -top-3 left-6 px-2.5 py-0.5 text-[11px] rounded-full bg-[#00E5FF] text-[#050816] font-semibold">Most popular</span>
      )}
      <div className="flex items-center gap-2">
        <h3 className="font-display text-lg tracking-tight">{name}</h3>
        {active && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-semibold">Active</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl tracking-tighter">{price}</span>
        {cadence && <span className="text-[#94A3B8] text-sm">{cadence}</span>}
      </div>
      <ul className="mt-6 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-white/85">
            <span className="mt-0.5 h-4 w-4 rounded-full grid place-items-center" style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.4)" }}>
              <Check className="h-3 w-3 text-cyan" />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={cta.onClick}
        disabled={cta.disabled || busy}
        className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 ${
          cta.disabled
            ? "btn-ghost-glass opacity-60 cursor-not-allowed"
            : cta.variant === "ghost" ? "btn-ghost-glass" : "btn-primary"
        }`}
        data-testid={`${testid}-cta`}
      >
        {cta.label} {!cta.disabled && cta.variant !== "ghost" && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Row({ label, value, testid }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-[#94A3B8]">{label}</div>
      <div className="mt-1 font-display text-base" data-testid={testid}>{value}</div>
    </div>
  );
}
