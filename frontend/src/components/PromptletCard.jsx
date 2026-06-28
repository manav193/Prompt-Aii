import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Copy, Lock, Check, Share2, Star, Eye, Download, Sparkles, Coins, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

const DIFF_COLORS = {
  Beginner: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#10B981" },
  Intermediate: { bg: "rgba(0,229,255,0.15)", border: "rgba(0,229,255,0.4)", text: "#00E5FF" },
  Advanced: { bg: "rgba(244,114,182,0.15)", border: "rgba(244,114,182,0.4)", text: "#F472B6" },
};

export default function PromptletCard({ item, onChange, index = 0 }) {
  const nav = useNavigate();
  const [favorited, setFavorited] = useState(!!item.favorited);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const gradient = item.gradient || ["#0EA5E9", "#3B82F6"];
  const isLocked = !!item.locked;
  const diff = DIFF_COLORS[item.difficulty] || DIFF_COLORS.Intermediate;

  const copyPrompt = async (e) => {
    e?.stopPropagation?.();
    if (isLocked) { toast.error("Upgrade to Pro to use this promptlet."); return; }
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
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      if (err.response?.status === 402) onChange?.({ type: "limit_hit" });
    } finally { setLoading(false); }
  };

  const toggleFav = async (e) => {
    e?.stopPropagation?.();
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

  const share = async (e) => {
    e?.stopPropagation?.();
    const url = `${window.location.origin}/promptlets/${item.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: item.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard.");
      }
    } catch { /* user dismissed */ }
  };

  const openDetails = (e) => {
    if (e?.defaultPrevented) return;
    nav(`/promptlets/${item.slug}`);
  };

  const popularity = Math.min(100, Math.round(((item.views || 0) / 8000) * 100));

  return (
    <article
      className="glass card-lift rounded-2xl overflow-hidden flex flex-col cursor-pointer"
      style={{ animationDelay: `${index * 30}ms` }}
      data-testid={`promptlet-card-${item.slug}`}
      onClick={openDetails}
    >
      {/* Large preview */}
      <div className="relative h-44 overflow-hidden" aria-hidden>
        {item.preview_image_url ? (
          <img
            src={item.preview_image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${gradient[0]}55 0%, ${gradient[1]}55 60%, rgba(5,8,22,0.85) 100%)` }} />
        <div className="absolute inset-0 opacity-25 bg-grid" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/45 backdrop-blur border border-white/15 text-white/90">
            {item.category}
          </span>
          {item.featured && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00E5FF] text-[#050816] font-semibold inline-flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Featured
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {item.plan === "pro" ? (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00E5FF] text-[#050816] font-semibold" data-testid={`badge-pro-${item.slug}`}>Pro</span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-semibold" data-testid={`badge-free-${item.slug}`}>Free</span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className="font-display text-lg tracking-tight text-white line-clamp-1 drop-shadow">{item.name}</h3>
          <div className="text-[11px] text-white/85 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur border border-white/10" data-testid={`card-credits-${item.slug}`}>
            <Coins className="h-3 w-3 text-cyan" /> {item.credits_cost} cr
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[13.5px] text-[#94A3B8] line-clamp-2">{item.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[11.5px]">
          <Meta label="Difficulty" testid={`card-diff-${item.slug}`}>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: diff.bg, border: `1px solid ${diff.border}`, color: diff.text }}>
              {item.difficulty}
            </span>
          </Meta>
          <Meta label="Quality" testid={`card-quality-${item.slug}`}>
            <span className="inline-flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < (item.quality || 4) ? "text-cyan fill-cyan" : "text-white/15"}`} />
              ))}
            </span>
          </Meta>
        </div>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap" data-testid={`card-models-${item.slug}`}>
          {(item.models || []).slice(0, 3).map((m) => (
            <span key={m} className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-white/80">{m}</span>
          ))}
          {(item.models || []).length > 3 && (
            <span className="text-[11px] text-[#94A3B8]">+{item.models.length - 3}</span>
          )}
        </div>

        {/* Popularity bar */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-[#94A3B8]" data-testid={`card-popularity-${item.slug}`}>
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {fmtCount(item.views)} views</span>
          <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> {fmtCount(item.downloads)} downloads</span>
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full" style={{ width: `${popularity}%`, background: "linear-gradient(90deg, #00E5FF, #3B82F6)", transition: "width .6s ease" }} />
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-1.5 pt-3 border-t border-white/5">
          <button
            onClick={copyPrompt}
            disabled={loading || isLocked}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${
              isLocked ? "btn-ghost-glass opacity-60 cursor-not-allowed" : copied ? "bg-[#10B981] text-[#050816]" : "btn-primary"
            }`}
            data-testid={`copy-${item.slug}`}
          >
            {isLocked ? (<><Lock className="h-3.5 w-3.5" /> Pro only</>) :
             copied ? (<><Check className="h-3.5 w-3.5" /> Copied</>) :
             (<><Copy className="h-3.5 w-3.5" /> {loading ? "..." : "Copy"}</>)}
          </button>
          <IconAction onClick={toggleFav} icon={Heart} active={favorited} label="Save" testid={`favorite-${item.slug}`} />
          <IconAction onClick={share} icon={Share2} label="Share" testid={`share-${item.slug}`} />
          <IconAction onClick={openDetails} icon={ExternalLink} label="Open" testid={`open-${item.slug}`} />
        </div>
      </div>
    </article>
  );
}

function Meta({ label, children, testid }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5" data-testid={testid}>
      <span className="uppercase tracking-wider text-[10px] text-[#94A3B8]">{label}</span>
      {children}
    </div>
  );
}

function IconAction({ icon: Icon, onClick, active, label, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`h-9 w-9 grid place-items-center rounded-full border transition ${
        active ? "border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
      }`}
      data-testid={testid}
    >
      <Icon className={`h-4 w-4 ${active && label === "Save" ? "fill-[#00E5FF]" : ""}`} />
    </button>
  );
}

function fmtCount(n) {
  n = Number(n || 0);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
