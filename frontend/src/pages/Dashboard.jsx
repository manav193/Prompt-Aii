import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Wand2, Heart, History as HistoryIcon, Crown, Sparkles, Coins, CalendarClock, Activity, Tag } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/me/dashboard").then(({ data }) => setData(data)).catch(() => null);
  }, []);

  if (!user) return null;
  const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];

  const c = data?.credits;
  const isPro = c?.plan === "pro";
  const balance = c?.balance;
  const used = c?.used ?? 0;
  const refill = c?.refill_amount ?? 100;
  const pct = isPro ? 8 : Math.min(100, Math.round(((refill - (balance ?? 0)) / refill) * 100));

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Welcome back</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter" data-testid="dashboard-welcome">
            Hello, {firstName}.
          </h1>
          <p className="mt-2 text-[#94A3B8]">
            {isPro
              ? "You're on Pro — unlimited credits, full library."
              : balance > 0
                ? `${balance} credits remaining. ${used} used so far.`
                : c?.next_credit_date
                  ? `0 credits. Next refill ${fmtDate(c.next_credit_date)}.`
                  : "Your free credits will refill 30 days after you hit zero."}
          </p>
        </header>

        {/* Top stat row */}
        <div className="grid gap-5 md:grid-cols-3">
          <StatCard
            icon={Coins}
            label="Remaining Credits"
            value={isPro ? "∞" : (balance ?? 0)}
            hint={isPro ? "Unlimited on Pro" : `${refill}-credit refill cycle`}
            testid="card-balance"
          >
            {!isPro && (
              <div className="mt-4 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00E5FF, #3B82F6)", transition: "width .6s ease" }} />
              </div>
            )}
          </StatCard>
          <StatCard
            icon={CalendarClock}
            label="Next Credit Date"
            value={isPro ? "Always available" : c?.next_credit_date ? fmtDate(c.next_credit_date) : "—"}
            hint={isPro ? "Pro members never wait." : c?.next_credit_date ? `${daysUntil(c.next_credit_date)} days away` : "Starts when you hit 0"}
            testid="card-next-credit"
          />
          <StatCard
            icon={Activity}
            label="Credits Used"
            value={used}
            hint={`Total prompts: ${data?.total_used ?? 0}`}
            testid="card-credits-used"
          />
        </div>

        {/* Second row */}
        <div className="grid gap-5 md:grid-cols-3 mt-5">
          <div className={`rounded-2xl p-6 ${isPro ? "glass-strong border-cyan glow-cyan" : "glass"}`} data-testid="card-plan">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">Current Plan</p>
              <Crown className={`h-5 w-5 ${isPro ? "text-cyan" : "text-[#94A3B8]"}`} />
            </div>
            <div className="mt-2 font-display text-3xl tracking-tight capitalize" data-testid="plan-name">{user.subscription}</div>
            <p className="text-sm text-[#94A3B8] mt-1">
              {isPro ? "Unlimited credits. Full library." : "100 credits per cycle. Photo Promptlets unlocked."}
            </p>
            <Link to="/billing" className="mt-5 w-full inline-flex justify-center btn-ghost-glass rounded-full px-4 py-2 text-xs" data-testid="dashboard-billing-link">
              Manage billing
            </Link>
          </div>

          <StatCard icon={HistoryIcon} label="Monthly Usage" value={data?.monthly_used ?? 0} hint="Prompts in the last 30 days" testid="card-monthly" />
          <StatCard icon={Sparkles} label="Total Promptlets Used" value={data?.total_used ?? 0} hint={`${data?.favorites_count ?? 0} favorites · ${data?.saved_prompts_count ?? 0} saved`} testid="card-total" />
        </div>

        {/* Quick actions */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <QuickCard to="/generate" icon={Wand2} title="Generate a prompt" desc="AI-optimized prompts in any model." testid="quick-generate" />
          <QuickCard to="/marketplace" icon={Sparkles} title="Browse Promptlets" desc="27 curated promptlets, 10 categories." testid="quick-marketplace" />
          <QuickCard to="/saved" icon={Heart} title="Your saved" desc={`${data?.saved_prompts_count ?? 0} generations · ${data?.favorites_count ?? 0} marketplace favs.`} testid="quick-saved" />
        </div>

        {/* Recent + Favourite categories */}
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl tracking-tight">Recent prompts</h2>
              <Link to="/history" className="text-xs text-[#94A3B8] hover:text-white inline-flex items-center gap-1" data-testid="see-all-history">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {(data?.recent_history?.length ?? 0) === 0 ? (
              <Empty msg="No prompts yet. Try the Generator or Marketplace." />
            ) : (
              <ul className="glass rounded-2xl divide-y divide-white/5" data-testid="recent-list">
                {data.recent_history.map((h) => (
                  <li key={h.history_id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{h.promptlet_name || "Custom prompt"}</p>
                      <p className="text-[12px] text-[#94A3B8]">{h.category}{h.model ? ` · ${h.model}` : ""}{h.kind === "optimize" ? " · Generator" : ""}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-cyan whitespace-nowrap">−{h.cost ?? 1} cr</span>
                      <div className="text-[11px] text-[#94A3B8] whitespace-nowrap">{fmtDate(h.created_at, true)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-display text-xl tracking-tight mb-4 inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-cyan" /> Favourite Categories
            </h2>
            {(data?.favorite_categories?.length ?? 0) === 0 ? (
              <Empty msg="Use a few prompts and we'll show your top categories here." />
            ) : (
              <ul className="glass rounded-2xl p-4 space-y-3" data-testid="fav-categories">
                {data.favorite_categories.map((c, i) => {
                  const max = data.favorite_categories[0]?.count || 1;
                  const w = Math.max(8, Math.round((c.count / max) * 100));
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono-pa text-[#94A3B8] w-6">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">{c.category}</span>
                          <span className="text-[#94A3B8] text-xs">{c.count} prompt{c.count === 1 ? "" : "s"}</span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full" style={{ width: `${w}%`, background: "linear-gradient(90deg, #00E5FF, #3B82F6)" }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, hint, testid, children }) {
  return (
    <div className="glass rounded-2xl p-6" data-testid={testid}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">{label}</p>
        <Icon className="h-5 w-5 text-cyan" />
      </div>
      <div className="mt-2 font-display text-3xl tracking-tighter" data-testid={`${testid}-value`}>{value}</div>
      {hint && <div className="text-xs text-[#94A3B8] mt-1">{hint}</div>}
      {children}
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, desc, testid }) {
  return (
    <Link to={to} className="glass card-lift rounded-2xl p-5 block" data-testid={testid}>
      <div className="h-9 w-9 rounded-lg grid place-items-center mb-4"
           style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.25)" }}>
        <Icon className="h-4 w-4 text-cyan" />
      </div>
      <div className="font-display text-base tracking-tight">{title}</div>
      <div className="text-xs text-[#94A3B8] mt-1">{desc}</div>
    </Link>
  );
}

function Empty({ msg }) {
  return (
    <div className="glass rounded-2xl px-5 py-8 text-center text-sm text-[#94A3B8]">{msg}</div>
  );
}

function fmtDate(iso, withTime = false) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const opts = withTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", year: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  } catch { return "—"; }
}

function daysUntil(iso) {
  try {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  } catch { return 0; }
}
