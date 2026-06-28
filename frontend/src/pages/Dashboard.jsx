import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Wand2, Heart, History, Crown, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export default function Dashboard() {
  const { user, fetchMe } = useAuth();
  const [usage, setUsage] = useState(null);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [u, h, f] = await Promise.all([
          api.get("/me/usage"),
          api.get("/me/history?limit=8"),
          api.get("/me/favorites"),
        ]);
        setUsage(u.data);
        setHistory(h.data.items || []);
        setFavorites(f.data.items || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const upgrade = async () => {
    await api.post("/me/subscription", { plan: "pro" });
    await fetchMe();
    const u = await api.get("/me/usage");
    setUsage(u.data);
  };

  if (!user) return null;
  const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];

  const used = usage?.used ?? 0;
  const limit = usage?.limit;
  const remaining = limit == null ? "∞" : Math.max(0, limit - used);
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 8;

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Welcome back</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter" data-testid="dashboard-welcome">
            Hello, {firstName}.
          </h1>
          <p className="mt-2 text-[#94A3B8]">
            Your prompt workspace — {user.subscription === "pro" ? "unlimited prompts unlocked." : `${remaining} of ${limit} prompts left this month.`}
          </p>
        </header>

        {/* Usage + Plan */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="md:col-span-2 glass rounded-2xl p-6" data-testid="usage-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">Usage this period</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl tracking-tighter" data-testid="usage-used">{used}</span>
                  <span className="text-[#94A3B8] text-sm">/ {limit ?? "unlimited"} prompts</span>
                </div>
              </div>
              <Wand2 className="h-5 w-5 text-cyan" />
            </div>
            <div className="mt-5 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #00E5FF, #3B82F6)",
                  transition: "width .6s ease",
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Period started {fmtDate(usage?.period_start)}</span>
              <span>Resets {fmtDate(usage?.period_end)}</span>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${user.subscription === "pro" ? "glass-strong glow-cyan border-cyan" : "glass"}`} data-testid="plan-card">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">Current plan</p>
              <Crown className={`h-5 w-5 ${user.subscription === "pro" ? "text-cyan" : "text-[#94A3B8]"}`} />
            </div>
            <div className="mt-2 font-display text-3xl tracking-tight capitalize" data-testid="plan-name">{user.subscription}</div>
            <p className="text-sm text-[#94A3B8] mt-1">
              {user.subscription === "pro" ? "Unlimited prompts. Full library." : "100 prompts/mo · Photo Promptlets only."}
            </p>
            {user.subscription !== "pro" ? (
              <button onClick={upgrade} className="mt-5 w-full btn-primary rounded-full px-4 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2" data-testid="upgrade-pro">
                Upgrade to Pro <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <p className="mt-5 text-xs text-cyan">You're on the team plan that ships.</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <QuickCard to="/marketplace" icon={Sparkles} title="Browse marketplace" desc="29 hand-tuned promptlets across 10 categories." testid="quick-marketplace" />
          <QuickCard to="/favorites" icon={Heart} title="Your favorites" desc={`${favorites.length} saved promptlet${favorites.length === 1 ? "" : "s"}.`} testid="quick-favorites" />
          <QuickCard to="/history" icon={History} title="Recent activity" desc={`${history.length} prompt${history.length === 1 ? "" : "s"} this period.`} testid="quick-history" />
        </div>

        {/* Recent prompts */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl tracking-tight">Recent prompts</h2>
            <Link to="/history" className="text-xs text-[#94A3B8] hover:text-white inline-flex items-center gap-1" data-testid="see-all-history">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {history.length === 0 ? (
            <Empty msg="No prompts yet. Try one from the marketplace." />
          ) : (
            <ul className="glass rounded-2xl divide-y divide-white/5" data-testid="recent-list">
              {history.map((h) => (
                <li key={h.history_id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{h.promptlet_name}</p>
                    <p className="text-[12px] text-[#94A3B8]">{h.category}</p>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">{fmtDate(h.created_at, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Saved promptlets preview */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl tracking-tight">Saved Promptlets</h2>
            <Link to="/favorites" className="text-xs text-[#94A3B8] hover:text-white inline-flex items-center gap-1" data-testid="see-all-favs">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {favorites.length === 0 ? (
            <Empty msg="No favorites yet. Tap the heart on any promptlet to save it." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="favorites-preview">
              {favorites.slice(0, 6).map((f) => (
                <li key={f.promptlet_id} className="glass rounded-xl p-4 flex items-start gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${f.gradient?.[0] || "#0EA5E9"}, ${f.gradient?.[1] || "#3B82F6"})` }} />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{f.name}</p>
                    <p className="text-[12px] text-[#94A3B8]">{f.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
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
