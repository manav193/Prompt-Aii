import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, ImagePlus, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { api, formatApiErrorDetail } from "@/lib/api";

const NIMO_CORE_URL = (process.env.REACT_APP_NIMO_CORE_URL || "").replace(/\/$/, "");
const REVERSE_PROMPT_COST = 3;
const TARGET_MODELS = [
  { value: "Midjourney", label: "Midjourney" },
  { value: "Stable Diffusion", label: "Stable Diffusion" },
  { value: "Flux", label: "Flux" },
  { value: "Adobe Firefly", label: "Adobe Firefly" },
];

export default function ReversePrompt() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [credits, setCredits] = useState(null);
  const [targetModel, setTargetModel] = useState("Midjourney");

  useEffect(() => {
    api.get("/me/usage").then(({ data }) => setCredits(data)).catch(() => {});
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const insufficient = credits?.plan === "free" && (credits?.balance ?? 0) < REVERSE_PROMPT_COST;

  const selectFile = (next) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10 MB or smaller.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setResult(null);
  };

  const analyze = async () => {
    if (!file) return toast.error("Upload an image first.");
    if (!NIMO_CORE_URL) return toast.error("NIMO-Core URL is not configured.");
    if (insufficient) return toast.error("Not enough credits.");

    setLoading(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("detail", "high");
      body.append("target_model", targetModel);
      const response = await fetch(`${NIMO_CORE_URL}/api/nimo/reverse-prompt`, {
        method: "POST",
        body,
        credentials: "omit",
        headers: { "X-Client": "prompt-ai" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || data.message || `Request failed (${response.status})`);
      setResult(data);
      api.get("/me/usage").then(({ data: usage }) => setCredits(usage)).catch(() => {});
      toast.success("Image analyzed. Reverse prompt generated.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message || "Reverse analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result?.prompt) return;
    await navigator.clipboard.writeText(result.prompt).catch(() => {});
    toast.success("Reverse prompt copied.");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto" data-testid="reverse-prompt-page">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/generate" className="btn-ghost-glass rounded-full p-2" aria-label="Back to generator">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Reverse Prompt Engineering</p>
            <h1 className="font-display mt-1 text-3xl sm:text-4xl font-semibold tracking-tighter">Turn an AI image back into a prompt.</h1>
            <p className="mt-2 text-[#94A3B8]">Upload an image and NIMO-Core will analyze its subject, composition, lighting, style and visual details.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <section className="glass-strong rounded-2xl p-6">
            <div
              className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] min-h-[360px] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-cyan/40 transition"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files?.[0]); }}
              data-testid="reverse-upload-zone"
            >
              {preview ? (
                <img src={preview} alt="Uploaded reference" className="max-h-[320px] max-w-full rounded-xl object-contain" />
              ) : (
                <>
                  <div className="h-14 w-14 rounded-2xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-4">
                    <ImagePlus className="h-7 w-7 text-cyan" />
                  </div>
                  <p className="font-medium">Drop an AI image here</p>
                  <p className="text-sm text-[#94A3B8] mt-1">or click to browse · PNG, JPG, WEBP · max 10 MB</p>
                </>
              )}
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => selectFile(e.target.files?.[0])} />
            </div>

            <div className="mt-5">
              <label htmlFor="reverse-target-model" className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Reconstruct for</label>
              <select
                id="reverse-target-model"
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50"
                data-testid="reverse-target-model"
              >
                {TARGET_MODELS.map((model) => <option key={model.value} value={model.value} className="bg-[#0F172A]">{model.label}</option>)}
              </select>
              <p className="text-[11px] text-[#64748B] mt-2">The reconstruction guidance is adapted to the selected image model.</p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-[#94A3B8] inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan" /> Cost: <span className="text-white font-medium">{REVERSE_PROMPT_COST} credits</span>
              </div>
              <button
                onClick={analyze}
                disabled={!file || loading || insufficient}
                className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="reverse-analyze"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? "Analyzing..." : insufficient ? "Not enough credits" : "Generate reverse prompt"}
              </button>
            </div>
          </section>

          <section className="glass rounded-2xl p-6" data-testid="reverse-output">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan" />
                <span className="text-xs uppercase tracking-wider text-[#94A3B8]">Reverse prompt</span>
              </div>
              {result?.prompt && (
                <button onClick={copy} className="btn-ghost-glass rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              )}
            </div>

            {result ? (
              <>
                <div className="mt-4 inline-flex items-center rounded-full border border-cyan/20 bg-cyan/5 px-2.5 py-1 text-[11px] text-cyan">Target: {result.target_model || targetModel}</div>
                <pre className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed font-mono-pa text-white/90">{result.prompt}</pre>
                {result.negative_prompt && (
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Negative prompt</p>
                    <pre className="whitespace-pre-wrap text-[13px] leading-relaxed font-mono-pa text-white/70">{result.negative_prompt}</pre>
                  </div>
                )}
                {result.analysis && (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {Object.entries(result.analysis).map(([key, value]) => (
                      <div key={key} className="rounded-xl bg-white/[0.035] border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{key.replaceAll("_", " ")}</p>
                        <p className="text-xs text-white/80 mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="min-h-[320px] flex flex-col items-center justify-center text-center text-[#94A3B8]">
                <Upload className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm">Your reconstructed prompt will appear here.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
