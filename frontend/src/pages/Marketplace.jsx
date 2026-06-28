import { useEffect, useMemo, useState } from "react";
import { Search, Crown, ArrowRight } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import PromptletCard from "@/components/PromptletCard";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Marketplace() {
  const { user, fetchMe } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get("q") || "");

  const activeCategory = params.get("category") || "All";
  const activePlan = params.get("plan") || "all"; // free / pro / all

  useEffect(() => {
    setLoading(true);
    const search = new URLSearchParams();
    if (activeCategory !== "All") search.set("category", activeCategory);
    if (activePlan !== "all") search.set("plan", activePlan);
    if (q.trim()) search.set("q", q.trim());

    const t = setTimeout(() => {
      api.get(`/promptlets?${search.toString()}`)
        .then(({ data }) => {
          setItems(data.items || []);
          if (!categories.length) setCategories(["All", ...(data.categories || [])]);
        })
        .finally(() => setLoading(false));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activePlan, q]);

  const setCategory = (c) => {
    const next = new URLSearchParams(params);
    if (c === "All") next.delete("category"); else next.set("category", c);
    setParams(next, { replace: true });
  };
  const setPlan = (p) => {
    const next = new URLSearchParams(params);
    if (p === "all") next.delete("plan"); else next.set("plan", p);
    setParams(next, { replace: true });
  };

  const upgrade = async () => {
    await api.post("/me/subscription", { plan: "pro" });
    await fetchMe();
  };

  const counts = useMemo(() => ({
    free: items.filter((i) => i.plan === "free").length,
    pro: items.filter((i) => i.plan === "pro").length,
  }), [items]);

  return (
    <DashboardLayout>
      <div data-testid="marketplace-page">
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Marketplace</p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Promptlets that just work.</h1>
            <p className="mt-2 text-[#94A3B8]">{items.length} promptlets · {counts.free} free · {counts.pro} Pro.</p>
          </div>
          {user?.subscription !== "pro" && (
            <button onClick={upgrade} className="btn-primary rounded-full px-4 py-2.5 text-xs font-semibold inline-flex items-center gap-2" data-testid="marketplace-upgrade">
              <Crown className="h-3.5 w-3.5" /> Unlock all promptlets
            </button>
          )}
        </header>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3" data-testid="marketplace-filters">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search promptlets, categories, models..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 ring-focus"
              data-testid="marketplace-search"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  activeCategory === c
                    ? "bg-[#00E5FF] text-[#050816] border-transparent font-semibold"
                    : "bg-white/[0.04] border-white/10 text-white/80 hover:border-[#00E5FF]/40"
                }`}
                data-testid={`filter-cat-${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                {c}
              </button>
            ))}
            <span className="mx-2 h-5 w-px bg-white/10" />
            {[
              { v: "all", label: "All plans" },
              { v: "free", label: "Free" },
              { v: "pro", label: "Pro" },
            ].map((p) => (
              <button
                key={p.v}
                onClick={() => setPlan(p.v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  activePlan === p.v
                    ? "bg-white text-[#050816] border-transparent font-semibold"
                    : "bg-white/[0.04] border-white/10 text-white/80 hover:border-white/30"
                }`}
                data-testid={`filter-plan-${p.v}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl h-72 animate-pulse-soft" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-[#94A3B8]">No promptlets match those filters.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="promptlet-grid">
              {items.map((it, i) => (
                <PromptletCard key={it.promptlet_id} item={it} index={i} onChange={() => {}} />
              ))}
            </div>
          )}
        </div>

        {user?.subscription !== "pro" && (
          <div className="mt-12 glass-strong rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glow-cyan">
            <div>
              <h3 className="font-display text-xl tracking-tight">Unlock 24+ Pro promptlets.</h3>
              <p className="text-[#94A3B8] text-sm mt-1">Coding, Marketing, Writing, Video, AI Agents — and unlimited monthly prompts.</p>
            </div>
            <Link to="/dashboard" onClick={(e) => { e.preventDefault(); upgrade(); }} className="btn-primary rounded-full px-5 py-3 text-sm font-semibold inline-flex items-center gap-2" data-testid="marketplace-cta-upgrade">
              Go Pro <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
