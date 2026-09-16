import { useEffect, useMemo, useState } from "react";
import { Search, Crown, ArrowRight, SlidersHorizontal, Flame } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import PromptletCard from "@/components/PromptletCard";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MODELS = ["All", "ChatGPT", "Claude", "Gemini", "Midjourney", "Stable Diffusion", "Flux", "Adobe Firefly", "Cursor", "Lovable"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];
const SORTS = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "popular", label: "Popular" },
  { id: "newest", label: "Newest" },
  { id: "quality", label: "Top rated" },
];

export default function Marketplace() {
  const { user, fetchMe } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get("q") || "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeCategory = params.get("category") || "All";
  const activePlan = params.get("plan") || "all";
  const activeModel = params.get("model") || "All";
  const activeDifficulty = params.get("difficulty") || "All";
  const activeSort = params.get("sort") || "trending";
  const maxCredits = params.get("max_credits") || "";

  const setParam = (k, v, defaultVal) => {
    const next = new URLSearchParams(params);
    if (v == null || v === "" || v === defaultVal) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    const search = new URLSearchParams();
    if (activeCategory !== "All") search.set("category", activeCategory);
    if (activePlan !== "all") search.set("plan", activePlan);
    if (activeModel !== "All") search.set("model", activeModel);
    if (activeDifficulty !== "All") search.set("difficulty", activeDifficulty);
    if (activeSort) search.set("sort", activeSort);
    if (maxCredits) search.set("max_credits", maxCredits);
    if (q.trim()) search.set("q", q.trim());
    const t = setTimeout(() => {
      api.get(`/promptlets?${search.toString()}`).then(({ data }) => {
        setItems(data.items || []);
        if (!categories.length) setCategories(["All", ...(data.categories || [])]);
      }).finally(() => setLoading(false));
    }, q ? 200 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activePlan, activeModel, activeDifficulty, activeSort, maxCredits, q]);

  const counts = useMemo(() => ({ free: items.filter((i) => i.plan === "free").length, pro: items.filter((i) => i.plan === "pro").length }), [items]);
  const upgrade = async () => { await api.post("/me/subscription", { plan: "pro" }); await fetchMe(); };

  return (
    <DashboardLayout>
      <div data-testid="marketplace-page">
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div><p className="text-xs uppercase tracking-[0.25em] text-cyan">Promptlets</p><h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">The App Store for prompts.</h1><p className="mt-2 text-[#94A3B8]">{items.length} promptlets · {counts.free} free · {counts.pro} Pro · sorted by {SORTS.find(s => s.id === activeSort)?.label || "Trending"}.</p></div>
          {user?.subscription !== "pro" && <button onClick={upgrade} className="btn-primary rounded-full px-4 py-2.5 text-xs font-semibold inline-flex items-center gap-2" data-testid="marketplace-upgrade"><Crown className="h-3.5 w-3.5" /> Unlock all</button>}
        </header>
        <div className="glass rounded-2xl p-4 flex flex-col gap-3" data-testid="marketplace-filters">
          <div className="flex items-center gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search promptlets, categories, models..." className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 ring-focus" data-testid="marketplace-search" /></div><button onClick={() => setShowAdvanced(s => !s)} className="btn-ghost-glass rounded-xl px-3 py-2.5 text-xs inline-flex items-center gap-2" data-testid="marketplace-toggle-advanced"><SlidersHorizontal className="h-3.5 w-3.5" /> Advanced</button></div>
          <div className="flex items-center gap-2 flex-wrap">{categories.map((c) => <Chip key={c} active={activeCategory === c} onClick={() => setParam("category", c, "All")} testid={`filter-cat-${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{c}</Chip>)}</div>
          <div className="flex items-center gap-2 flex-wrap"><span className="text-[11px] uppercase tracking-wider text-[#94A3B8] mr-1">Plan</span>{[{ v: "all", label: "All" }, { v: "free", label: "Free" }, { v: "pro", label: "Pro" }].map((p) => <Chip key={p.v} small active={activePlan === p.v} onClick={() => setParam("plan", p.v, "all")} testid={`filter-plan-${p.v}`}>{p.label}</Chip>)}<span className="mx-2 h-5 w-px bg-white/10" /><span className="text-[11px] uppercase tracking-wider text-[#94A3B8] mr-1">Sort</span>{SORTS.map((s) => <Chip key={s.id} small active={activeSort === s.id} onClick={() => setParam("sort", s.id, "trending")} testid={`filter-sort-${s.id}`}>{s.icon ? <s.icon className="h-3 w-3 mr-1 -ml-0.5 inline" /> : null}{s.label}</Chip>)}</div>
          {showAdvanced && <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-white/5" data-testid="advanced-filters"><Select label="AI Model" value={activeModel} onChange={(v) => setParam("model", v, "All")} options={MODELS} testid="filter-model" /><Select label="Difficulty" value={activeDifficulty} onChange={(v) => setParam("difficulty", v, "All")} options={DIFFICULTIES} testid="filter-difficulty" /><label className="block" data-testid="filter-credits-field"><span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Max credits: <span className="text-white">{maxCredits || "any"}</span></span><input type="range" min={0} max={10} value={maxCredits || 10} onChange={(e) => setParam("max_credits", e.target.value === "10" ? "" : e.target.value, "")} className="w-full accent-[#00E5FF]" data-testid="filter-max-credits" /></label></div>}
        </div>
        <div className="mt-6">{loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-96 animate-pulse-soft" />)}</div> : items.length === 0 ? <div className="glass rounded-2xl p-10 text-center"><p className="text-[#94A3B8]">No promptlets match those filters.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="promptlet-grid">{items.map((it, i) => <PromptletCard key={it.promptlet_id} item={it} index={i} />)}</div>}</div>
        {user?.subscription !== "pro" && <div className="mt-12 glass-strong rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glow-cyan"><div><h3 className="font-display text-xl tracking-tight">Unlock 24+ Pro promptlets.</h3><p className="text-[#94A3B8] text-sm mt-1">Coding, Marketing, Writing, Video, AI Agents — and unlimited credits.</p></div><Link to="#" onClick={(e) => { e.preventDefault(); upgrade(); }} className="btn-primary rounded-full px-5 py-3 text-sm font-semibold inline-flex items-center gap-2" data-testid="marketplace-cta-upgrade">Go Pro <ArrowRight className="h-4 w-4" /></Link></div>}
      </div>
    </DashboardLayout>
  );
}

function Chip({ children, active, onClick, testid, small }) { return <button onClick={onClick} data-testid={testid} className={`${small ? "text-[11px] px-2.5 py-1" : "text-xs px-3 py-1.5"} rounded-full border transition inline-flex items-center ${active ? "bg-[#00E5FF] text-[#050816] border-transparent font-semibold" : "bg-white/[0.04] border-white/10 text-white/80 hover:border-[#00E5FF]/40"}`}>{children}</button>; }
function Select({ label, value, onChange, options, testid }) { return <label className="block" data-testid={testid}><span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white ring-focus appearance-none">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }
