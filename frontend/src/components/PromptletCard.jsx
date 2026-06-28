import { useState } from "react";
import { Heart, Copy, Lock, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function PromptletCard({ item, onChange, index = 0 }) {
  const [favorited, setFavorited] = useState(!!item.favorited);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const gradient = item.gradient || ["#0EA5E9", "#3B82F6"];
  const isLocked = !!item.locked;

  const copyPrompt = async () => {
    if (isLocked) {
      toast.error("Upgrade to Pro to use this promptlet.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/promptlets/${item.promptlet_id}/use`);
      await navigator.clipboard.writeText(data.prompt || "").catch(() => {});
      setCopied(true);
      const cr = data.credits;
      const tail = cr?.plan === "pro" ? "Unlimited credits" : `${cr?.balance ?? "?"} credits left`;
      toast.success(`Prompt copied · ${tail}`);
      setTimeout(() => setCopied(false), 1800);
      onChange?.({ type: "used", credits: cr });
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      toast.error(msg);
      if (err.response?.status === 402) onChange?.({ type: "limit_hit" });
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = async () => {
    const next = !favorited;
    setFavorited(next);
    try {
      await api.post(`/promptlets/${item.promptlet_id}/favorite`, { favorite: next });
      onChange?.({ type: "favorite", promptlet_id: item.promptlet_id, favorited: next });
    } catch (err) {
      setFavorited(!next);
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <article
      className="glass card-lift rounded-2xl overflow-hidden flex flex-col"
      style={{ animationDelay: `${index * 30}ms` }}
      data-testid={`promptlet-card-${item.slug}`}
    >
      {/* Preview */}
      <div className="relative h-32 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)` }}
        />
        <div className="absolute inset-0 opacity-30 bg-grid" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-9 w-9 text-white/85 drop-shadow" strokeWidth={1.4} />
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 backdrop-blur border border-white/15 text-white/90">
            {item.category}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {item.plan === "pro" ? (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00E5FF] text-[#050816] font-semibold inline-flex items-center gap-1" data-testid={`badge-pro-${item.slug}`}>
              Pro
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-semibold" data-testid={`badge-free-${item.slug}`}>
              Free
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display text-lg tracking-tight line-clamp-1">{item.name}</h3>
        <p className="mt-1.5 text-[13.5px] text-[#94A3B8] line-clamp-2">{item.description}</p>

        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          {(item.models || []).slice(0, 3).map((m) => (
            <span key={m} className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-white/80">
              {m}
            </span>
          ))}
          {(item.models || []).length > 3 && (
            <span className="text-[11px] text-[#94A3B8]">+{item.models.length - 3}</span>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 pt-3 border-t border-white/5">
          <button
            onClick={copyPrompt}
            disabled={loading || isLocked}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center justify-center gap-2 transition ${
              isLocked ? "btn-ghost-glass opacity-60 cursor-not-allowed" : copied ? "bg-[#10B981] text-[#050816]" : "btn-primary"
            }`}
            data-testid={`copy-${item.slug}`}
          >
            {isLocked ? (<><Lock className="h-3.5 w-3.5" /> Pro only</>) :
             copied ? (<><Check className="h-3.5 w-3.5" /> Copied</>) :
             (<><Copy className="h-3.5 w-3.5" /> {loading ? "..." : "Copy prompt"}</>)}
          </button>
          <button
            onClick={toggleFav}
            aria-label="Favorite"
            className={`h-9 w-9 grid place-items-center rounded-full border transition ${
              favorited ? "border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
            }`}
            data-testid={`favorite-${item.slug}`}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-[#00E5FF]" : ""}`} />
          </button>
        </div>
      </div>
    </article>
  );
}
