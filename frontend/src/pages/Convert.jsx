import { useEffect, useState } from "react";
import { ArrowRight, Copy, Check, Download, Coins, Repeat } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { api, formatApiErrorDetail } from "@/lib/api";

const MODELS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "Adobe Firefly", "Flux", "Stable Diffusion", "Cursor", "Lovable", "Emergent"];
const CONVERT_COST = 3;

export default function Convert() {
  const [source, setSource] = useState("ChatGPT");
  const [target, setTarget] = useState("Midjourney");
  const [prompt, setPrompt] = useState("");
  const [converted, setConverted] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { api.get("/me/usage").then(({ data }) => setCredits(data)); }, []);

  const swap = () => { setSource(target); setTarget(source); };

  const convert = async (e) => {
    e?.preventDefault?.();
    if (source === target) return toast.error("Pick a different target model.");
    if (prompt.trim().length < 3) return toast.error("Paste a prompt first.");
    setLoading(true); setConverted(""); setCopied(false);
    try {
      const { data } = await api.post("/convert", { prompt, source_model: source, target_model: target });
      setConverted(data.prompt);
      setCredits(data.credits);
      toast.success(`Converted ${source} → ${target} · −${data.cost} credits`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const copy = async () => {
    if (!converted) return;
    await navigator.clipboard.writeText(converted).catch(() => {});
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };
  const exportText = () => {
    if (!converted) return;
    const blob = new Blob([converted], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `promptai-convert-${target.toLowerCase().replace(/\s/g, "-")}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const insufficient = credits?.plan === "free" && (credits?.balance ?? 0) < CONVERT_COST;

  return (
    <DashboardLayout>
      <div data-testid="convert-page">
        <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Prompt Converter</p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Move prompts between models.</h1>
            <p className="mt-2 text-[#94A3B8]">Claude Sonnet 4.6 rewrites your prompt in the target model's native idiom.</p>
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
            <Picker label="To" value={target} onChange={setTarget} testid="convert-target" />
          </div>

          <label className="block" data-testid="convert-prompt-field">
            <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Original prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder="Paste your prompt here..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[14.5px] text-white placeholder:text-white/40 resize-none ring-focus font-mono-pa"
              data-testid="convert-prompt"
            />
          </label>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[#94A3B8] inline-flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-cyan" />
              Cost: <span className="text-white font-medium">{CONVERT_COST} credits</span>
              {credits?.plan === "free" && (<span>· Balance after: <span className="text-white">{Math.max(0, (credits?.balance ?? 0) - CONVERT_COST)}</span></span>)}
            </div>
            <button type="submit" disabled={loading || insufficient} className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="convert-submit">
              {loading ? "Converting..." : insufficient ? "Not enough credits" : <>Convert <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>

        <div className="mt-6 glass rounded-2xl p-6" data-testid="convert-output">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#94A3B8]">Converted for</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#94A3B8]">{target}</span>
            </div>
            {converted && (
              <div className="flex items-center gap-2">
                <button onClick={copy} className={`rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border transition ${copied ? "border-[#10B981]/40 text-[#10B981]" : "bg-white/[0.04] border-white/10 text-white/85"}`} data-testid="convert-copy">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
                <button onClick={exportText} className="rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-white/85" data-testid="convert-export">
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              </div>
            )}
          </div>
          <pre className="mt-4 whitespace-pre-wrap text-[14.5px] leading-relaxed font-mono-pa text-white/90 min-h-[140px]" data-testid="convert-output-text">
            {converted || (loading ? "Converting..." : "Your converted prompt will appear here.")}
          </pre>
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
