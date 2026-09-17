import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, Check, Download, Coins, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { api, formatApiErrorDetail } from "@/lib/api";

const MODELS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "Adobe Firefly", "Flux", "Stable Diffusion", "Cursor", "Lovable"];
const CONVERT_COST = 3;
const MAX_TARGETS = 4;

export default function Convert() {
  const [source, setSource] = useState("ChatGPT");
  const [targets, setTargets] = useState(["Midjourney"]);
  const [prompt, setPrompt] = useState("");
  const [converted, setConverted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => { api.get("/me/usage").then(({ data }) => setCredits(data)); }, []);

  const swap = () => {
    const nextSource = targets[0] || "Midjourney";
    setTargets([source]);
    setSource(nextSource);
  };

  const toggleTarget = (model) => {
    if (model === source) return toast.error("The source model cannot also be a target.");
    setTargets((current) => current.includes(model)
      ? current.filter((item) => item !== model)
      : current.length < MAX_TARGETS ? [...current, model] : current);
  };

  const totalCost = targets.length * CONVERT_COST;
  const insufficient = credits?.plan === "free" && (credits?.balance ?? 0) < totalCost;

  const convert = async (e) => {
    e?.preventDefault?.();
    if (!targets.length) return toast.error("Pick at least one target model.");
    if (prompt.trim().length < 3) return toast.error("Paste a prompt first.");
    if (insufficient) return toast.error(`You need ${totalCost} credits for ${targets.length} model variants.`);
    setLoading(true); setConverted([]); setCopied(null);
    try {
      const results = await Promise.all(targets.map(async (target) => {
        const { data } = await api.post("/convert", { prompt, source_model: source, target_model: target });
        return { target, prompt: data.prompt };
      }));
      setConverted(results);
      const { data } = await api.get("/me/usage");
      setCredits(data);
      toast.success(`Generated ${results.length} model-specific variants.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const copy = async (item, index) => {
    await navigator.clipboard.writeText(item.prompt).catch(() => {});
    setCopied(index);
    toast.success(`Copied ${item.target} prompt.`);
    setTimeout(() => setCopied(null), 1500);
  };

  const exportText = () => {
    if (!converted.length) return;
    const body = converted.map(({ target, prompt: text }) => `=== ${target} ===\n${text}`).join("\n\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "promptai-multi-model-prompts.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  };

  const availableTargets = useMemo(() => MODELS.filter((model) => model !== source), [source]);

  return (
    <DashboardLayout>
      <div data-testid="convert-page">
        <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Prompt Converter</p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">One prompt. Multiple model variants.</h1>
            <p className="mt-2 text-[#94A3B8]">Generate model-specific conversions from the same intent in one pass.</p>
          </div>
          <div className="glass rounded-2xl px-4 py-3 inline-flex items-center gap-3">
            <Coins className="h-4 w-4 text-cyan" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Credits</div>
              <div className="font-display text-lg" data-testid="convert-balance">{credits?.plan === "pro" ? "∞" : (credits?.balance ?? "…")}</div>
            </div>
          </div>
        </header>

        <form onSubmit={convert} className="glass-strong rounded-2xl p-6 grid gap-5" data-testid="convert-form">
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <Picker label="From" value={source} onChange={setSource} testid="convert-source" />
            <button type="button" onClick={swap} aria-label="Swap" className="self-end sm:self-auto h-10 w-10 rounded-full grid place-items-center btn-ghost-glass" data-testid="convert-swap">
              <Repeat className="h-4 w-4" />
            </button>
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">To models</span>
              <div className="flex flex-wrap gap-2" data-testid="convert-targets">
                {availableTargets.map((model) => {
                  const selected = targets.includes(model);
                  return (
                    <button key={model} type="button" onClick={() => toggleTarget(model)} className={`rounded-full px-3 py-2 text-xs border transition ${selected ? "bg-cyan/15 border-cyan/40 text-white" : "bg-white/[0.04] border-white/10 text-[#94A3B8]"}`} data-testid={`convert-target-${model.toLowerCase().replace(/\s/g, "-")}`} aria-pressed={selected}>
                      {model}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-[#64748B]">Choose up to {MAX_TARGETS} targets · {targets.length} selected</p>
            </div>
          </div>

          <label className="block" data-testid="convert-prompt-field">
            <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Original prompt</span>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} placeholder="Paste your prompt here..." className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[14.5px] text-white placeholder:text-white/40 resize-none ring-focus font-mono-pa" data-testid="convert-prompt" />
          </label>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[#94A3B8] inline-flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-cyan" />
              Cost: <span className="text-white font-medium">{totalCost} credits</span>
              {credits?.plan === "free" && (<span>· Balance after: <span className="text-white">{Math.max(0, (credits?.balance ?? 0) - totalCost)}</span></span>)}
            </div>
            <button type="submit" disabled={loading || insufficient || !targets.length} className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="convert-submit">
              {loading ? "Generating variants..." : insufficient ? "Not enough credits" : <>Convert <Sparkles className="h-4 w-4" /></>}
            </button>
          </div>
        </form>

        <div className="mt-6 glass rounded-2xl p-6" data-testid="convert-output">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#94A3B8]">Model-specific results</span>
              <p className="mt-1 text-xs text-[#64748B]">Each variant is optimized for its selected target model.</p>
            </div>
            {converted.length > 0 && <button onClick={exportText} className="rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-white/85" data-testid="convert-export"><Download className="h-3.5 w-3.5" /> Export all</button>}
          </div>

          <div className="mt-4 grid gap-4">
            {converted.length ? converted.map((item, index) => (
              <article key={item.target} className="rounded-xl border border-white/10 bg-white/[0.025] p-4" data-testid={`convert-result-${index}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#94A3B8]">{item.target}</span>
                  <button onClick={() => copy(item, index)} className="rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-white/85" data-testid={`convert-copy-${index}`}>
                    {copied === index ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-[14.5px] leading-relaxed font-mono-pa text-white/90">{item.prompt}</pre>
              </article>
            )) : (
              <pre className="whitespace-pre-wrap text-[14.5px] leading-relaxed font-mono-pa text-white/90 min-h-[140px]" data-testid="convert-output-text">{loading ? "Generating model-specific variants..." : "Your model-specific prompts will appear here."}</pre>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Picker({ label, value, onChange, testid }) {
  return (
    <label className="block" data-testid={`${testid}-field`}>
      <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white ring-focus appearance-none" data-testid={testid}>
        {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </label>
  );
}
