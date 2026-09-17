import { useEffect, useRef, useState } from "react";
import { Wand2, Copy, Check, Heart, Save, Download, Sparkles, Coins, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import PromptFeedback from "@/components/PromptFeedback";

const MODELS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "Stable Diffusion", "Flux", "Adobe Firefly", "Cursor", "Lovable"];
const CATEGORIES = ["Photo", "Website", "Coding", "App Development", "Marketing", "Writing", "Video", "Image Editing", "Business", "AI Agents"];
const OPTIMIZE_COST = 3;

export default function Generate() {
  const { user } = useAuth();
  const [model, setModel] = useState("ChatGPT");
  const [category, setCategory] = useState("Writing");
  const [idea, setIdea] = useState("");
  const [optimized, setOptimized] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const outputRef = useRef(null);

  const loadCredits = () => api.get("/me/usage").then(({ data }) => setCredits(data));
  const loadHistory = () => api.get("/me/history?limit=6").then(({ data }) => setHistory(data.items || []));

  useEffect(() => { loadCredits(); loadHistory(); }, []);

  const insufficient = credits?.plan === "free" && (credits?.balance ?? 0) < OPTIMIZE_COST;

  const optimize = async (e) => {
    e?.preventDefault?.();
    if (!idea.trim() || idea.trim().length < 3) {
      toast.error("Describe your idea in a few words first.");
      return;
    }
    setLoading(true);
    setOptimized("");
    setCopied(false); setFavorited(false); setSavedId(null);
    const feedbackRequestId = globalThis.crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setRequestId(feedbackRequestId);
    try {
      const { data } = await api.post("/generate/optimize", { idea, model, category, request_id: feedbackRequestId });
      setOptimized(data.prompt);
      setCredits(data.credits);
      toast.success(`Optimized for ${model} · −${data.cost} credits`);
      loadHistory();
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const copy = async () => {
    if (!optimized) return;
    await navigator.clipboard.writeText(optimized).catch(() => {});
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };

  const exportText = () => {
    if (!optimized) return;
    const blob = new Blob([optimized], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `promptai-${model.toLowerCase().replace(/\s/g, "-")}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    toast.success("Exported.");
  };

  const save = async () => {
    if (!optimized) return;
    try {
      const { data } = await api.post("/generate/save", {
        name: idea.split("\n")[0].slice(0, 80) || "Untitled prompt",
        prompt: optimized,
        model,
        category,
        idea,
      });
      setSavedId(data.saved_id);
      toast.success("Saved to your library.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const toggleFav = () => {
    if (!savedId) {
      save();
      setFavorited(true);
      return;
    }
    setFavorited((v) => !v);
  };

  return (
    <DashboardLayout>
      <div data-testid="generate-page">
        <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Prompt Generator</p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Turn an idea into a perfect prompt.</h1>
            <p className="mt-2 text-[#94A3B8]">PromptAI turns your idea into a model-native, production-ready prompt.</p>
          </div>
          <div className="glass rounded-2xl px-4 py-3 inline-flex items-center gap-3" data-testid="credits-pill">
            <Coins className="h-4 w-4 text-cyan" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Credits</div>
              <div className="font-display text-lg" data-testid="credits-balance">
                {credits?.plan === "pro" ? "∞" : (credits?.balance ?? "…")}
              </div>
            </div>
          </div>
        </header>

        <form onSubmit={optimize} className="glass-strong rounded-2xl p-6 grid gap-5" data-testid="generator-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="AI Model" testid="model-field">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white ring-focus appearance-none" data-testid="model-select">
                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Category" testid="category-field">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white ring-focus appearance-none" data-testid="category-select">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Your idea (plain English)" testid="idea-field">
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={5} placeholder="A cinematic founder portrait, Tokyo at dusk, neon reflections..." className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-white/40 resize-none ring-focus font-mono-pa" data-testid="idea-input" />
          </Field>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[#94A3B8] inline-flex items-center gap-2" data-testid="cost-display">
              <Coins className="h-3.5 w-3.5 text-cyan" />
              Cost: <span className="text-white font-medium">{OPTIMIZE_COST} credits</span>
              {credits?.plan === "free" && (<span className="text-[#94A3B8]">· Balance after: <span className="text-white">{Math.max(0, (credits?.balance ?? 0) - OPTIMIZE_COST)}</span></span>)}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setIdea(""); setOptimized(""); }} className="btn-ghost-glass rounded-full px-4 py-2.5 text-xs inline-flex items-center gap-2" data-testid="generator-reset"><RefreshCw className="h-3.5 w-3.5" /> Reset</button>
              <button type="submit" disabled={loading || insufficient} className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="generator-optimize"><Wand2 className="h-4 w-4" />{loading ? "Optimizing..." : insufficient ? "Not enough credits" : "Optimize prompt"}</button>
            </div>
          </div>
        </form>

        <div ref={outputRef} className="mt-6 glass rounded-2xl p-6" data-testid="generator-output">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan" /><span className="text-xs uppercase tracking-wider text-[#94A3B8]">Optimized prompt</span>{optimized && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#94A3B8]">{model}</span>}</div>
            {optimized && <div className="flex items-center gap-2"><IconBtn onClick={copy} icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} testid="output-copy" active={copied} /><IconBtn onClick={save} icon={Save} label={savedId ? "Saved" : "Save"} testid="output-save" active={!!savedId} /><IconBtn onClick={toggleFav} icon={Heart} label={favorited ? "Favorited" : "Favorite"} testid="output-favorite" active={favorited} /><IconBtn onClick={exportText} icon={Download} label="Export" testid="output-export" /></div>}
          </div>
          <pre className="mt-4 whitespace-pre-wrap text-[14.5px] leading-relaxed font-mono-pa text-white/90 min-h-[140px]" data-testid="output-text">{optimized || (loading ? "Generating..." : "Your optimized prompt will appear here.")}</pre>
          <PromptFeedback idea={idea} prompt={optimized} model={model} category={category} requestId={requestId} />
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-xl tracking-tight">Recent generations</h2><Link to="/history" className="text-xs text-[#94A3B8] hover:text-white inline-flex items-center gap-1" data-testid="generate-see-history">All history <ArrowRight className="h-3 w-3" /></Link></div>
          {history.length === 0 ? <div className="glass rounded-2xl px-5 py-8 text-center text-sm text-[#94A3B8]">No prompts yet.</div> : <ul className="grid gap-2" data-testid="generate-recent">{history.map((h) => <li key={h.history_id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm truncate">{h.promptlet_name || "Custom prompt"}</p><p className="text-[12px] text-[#94A3B8]">{h.category}{h.model ? ` · ${h.model}` : ""}{h.kind === "optimize" ? " · Generator" : ""}</p></div><span className="text-[11px] text-cyan whitespace-nowrap">−{h.cost ?? 1} cr</span></li>)}</ul>}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children, testid }) { return <label className="block" data-testid={testid}><span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span>{children}</label>; }
function IconBtn({ icon: Icon, label, onClick, testid, active }) { return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border transition ${active ? "bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF]" : "bg-white/[0.04] border-white/10 text-white/85 hover:border-[#00E5FF]/40"}`} data-testid={testid}><Icon className="h-3.5 w-3.5" /> {label}</button>; }
