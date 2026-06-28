import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Heart, Share2, Star, Eye, Download, Coins, Lock, Wand2, ArrowRight, BadgeCheck, Send } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { api, formatApiErrorDetail } from "@/lib/api";

const DIFF_COLORS = {
  Beginner: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#10B981" },
  Intermediate: { bg: "rgba(0,229,255,0.15)", border: "rgba(0,229,255,0.4)", text: "#00E5FF" },
  Advanced: { bg: "rgba(244,114,182,0.15)", border: "rgba(244,114,182,0.4)", text: "#F472B6" },
};

export default function PromptDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [following, setFollowing] = useState(false);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/promptlets/${slug}/details`);
      setData(data);
      setFavorited(data.promptlet.favorited);
      setStars(data.my_rating?.stars || 0);
      setReview(data.my_rating?.review || "");
    } catch (err) {
      toast.error("Couldn't load this promptlet.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [slug]);
  useEffect(() => {
    api.get("/community/follows").then(({ data }) => {
      setFollowing(!!data.items?.find?.((f) => f.creator === "PromptAI Team"));
    }).catch(() => null);
  }, []);

  const p = data?.promptlet;
  const reviews = data?.reviews || [];
  const related = data?.related || [];
  const versions = data?.versions || [];
  const isLocked = !!p?.locked;
  const diff = p ? (DIFF_COLORS[p.difficulty] || DIFF_COLORS.Intermediate) : DIFF_COLORS.Intermediate;

  const copy = async () => {
    if (!p || isLocked) { toast.error("Upgrade to Pro to use this promptlet."); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/promptlets/${p.promptlet_id}/use`);
      await navigator.clipboard.writeText(data.prompt || "").catch(() => {});
      setCopied(true);
      toast.success(`Copied · −${data.cost} credits`);
      setTimeout(() => setCopied(false), 1800);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const toggleFav = async () => {
    if (!p) return;
    const next = !favorited;
    setFavorited(next);
    try { await api.post(`/promptlets/${p.promptlet_id}/favorite`, { favorite: next }); }
    catch (err) { setFavorited(!next); toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message); }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p?.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied."); }
    } catch { /* dismissed */ }
  };

  const toggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    try {
      if (next) await api.post("/community/follow", { creator: "PromptAI Team" });
      else await api.delete("/community/follow/PromptAI Team");
    } catch { setFollowing(!next); }
  };

  const submitReview = async () => {
    if (!p || !stars) return toast.error("Pick a star rating first.");
    try {
      await api.post(`/promptlets/${p.promptlet_id}/rate`, { stars, review });
      toast.success("Thanks — review posted.");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  if (loading || !p) {
    return (
      <DashboardLayout>
        <div className="glass rounded-2xl h-96 animate-pulse-soft" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="promptlet-detail">
        <button onClick={() => nav(-1)} className="mb-5 inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white" data-testid="detail-back">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-white/5" data-testid="detail-hero">
          {p.preview_image_url ? (
            <img src={p.preview_image_url} alt="" className="h-72 w-full object-cover" />
          ) : (
            <div className="h-72 w-full" style={{ background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(5,8,22,0.95), rgba(5,8,22,0.4) 50%, rgba(5,8,22,0.05))" }} />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 backdrop-blur border border-white/15">{p.category}</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: diff.bg, border: `1px solid ${diff.border}`, color: diff.text }}>{p.difficulty}</span>
              {p.plan === "pro" ? (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00E5FF] text-[#050816] font-semibold">Pro</span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-semibold">Free</span>
              )}
              {p.featured && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white inline-flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> Featured</span>}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tighter" data-testid="detail-name">{p.name}</h1>
            <p className="mt-3 text-[#cbd5e1] max-w-2xl">{p.description}</p>
            <div className="mt-4 flex items-center gap-4 flex-wrap text-sm">
              <Stat icon={Coins} label={`${p.credits_cost} credits`} testid="detail-cost" />
              <Stat icon={Eye} label={`${p.views?.toLocaleString?.()} views`} />
              <Stat icon={Download} label={`${p.downloads?.toLocaleString?.()} downloads`} />
              <Stat icon={Star} label={`${(p.rating_avg || 0).toFixed(1)} (${p.rating_count})`} />
            </div>
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <button onClick={copy} disabled={busy || isLocked} className={`rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 ${isLocked ? "btn-ghost-glass opacity-60 cursor-not-allowed" : copied ? "bg-[#10B981] text-[#050816]" : "btn-primary"}`} data-testid="detail-copy">
                {isLocked ? <><Lock className="h-3.5 w-3.5" /> Pro only</> : copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy prompt</>}
              </button>
              <button onClick={toggleFav} className={`rounded-full px-3 py-2.5 text-sm inline-flex items-center gap-2 border transition ${favorited ? "border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF]" : "bg-white/[0.04] border-white/10 text-white/85 hover:border-[#00E5FF]/40"}`} data-testid="detail-favorite">
                <Heart className={`h-4 w-4 ${favorited ? "fill-[#00E5FF]" : ""}`} /> {favorited ? "Saved" : "Save"}
              </button>
              <button onClick={share} className="btn-ghost-glass rounded-full px-3 py-2.5 text-sm inline-flex items-center gap-2" data-testid="detail-share">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <Link to="/convert" className="btn-ghost-glass rounded-full px-3 py-2.5 text-sm inline-flex items-center gap-2" data-testid="detail-convert">
                <Wand2 className="h-4 w-4" /> Convert
              </Link>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            {/* Prompt */}
            <Section title="Prompt">
              {isLocked ? (
                <div className="text-sm text-[#94A3B8] flex items-center gap-3">
                  <Lock className="h-4 w-4 text-cyan" /> Upgrade to Pro to view and use this prompt.
                  <Link to="/billing" className="ml-auto btn-primary rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-2">Upgrade <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-[14px] leading-relaxed font-mono-pa text-white/90" data-testid="detail-prompt-text">{p.prompt}</pre>
              )}
            </Section>

            <Section title="How to use">
              <p className="text-sm text-[#cbd5e1] leading-relaxed" data-testid="detail-how">{p.how_to_use}</p>
            </Section>

            <Section title="Expected output">
              <p className="text-sm text-[#cbd5e1] leading-relaxed" data-testid="detail-expected">{p.expected_output}</p>
            </Section>

            <Section title="Compatible AI models">
              <div className="flex items-center gap-2 flex-wrap" data-testid="detail-models">
                {p.models.map((m) => <span key={m} className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-white/85">{m}</span>)}
              </div>
            </Section>

            <Section title="Ratings & Reviews">
              <div className="flex items-center gap-3 flex-wrap" data-testid="detail-ratings">
                <div className="font-display text-3xl">{(p.rating_avg || 0).toFixed(1)}</div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(p.rating_avg || 0) ? "text-cyan fill-cyan" : "text-white/15"}`} />
                    ))}
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">{p.rating_count} review{p.rating_count === 1 ? "" : "s"}</div>
                </div>
              </div>

              {/* Submit review */}
              <div className="mt-5 glass-strong rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Rate this promptlet</div>
                <div className="flex items-center gap-1.5 mb-3" data-testid="rating-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} stars`} data-testid={`star-${n}`}>
                      <Star className={`h-5 w-5 ${n <= stars ? "text-cyan fill-cyan" : "text-white/20 hover:text-white/50"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={3}
                  placeholder="Optional: share how you used it..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/40 resize-none ring-focus"
                  data-testid="review-text"
                />
                <button onClick={submitReview} className="mt-3 btn-primary rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-2" data-testid="submit-review">
                  <Send className="h-3.5 w-3.5" /> Submit review
                </button>
              </div>

              {/* Reviews */}
              {reviews.length > 0 && (
                <ul className="mt-5 space-y-3" data-testid="reviews-list">
                  {reviews.map((r, i) => (
                    <li key={i} className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{r.user_name || "Anonymous"}</div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, k) => <Star key={k} className={`h-3 w-3 ${k < (r.stars || 0) ? "text-cyan fill-cyan" : "text-white/15"}`} />)}
                        </div>
                      </div>
                      <p className="mt-1.5 text-[13px] text-[#cbd5e1]">{r.review}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Version history">
              <ul className="space-y-2" data-testid="version-history">
                {versions.map((v, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span><span className="font-mono-pa text-cyan">v{v.version}</span> · {v.label}</span>
                    <span className="text-[#94A3B8] text-xs">{v.notes}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <Section title="Creator">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full grid place-items-center font-display text-xs" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.25), rgba(59,130,246,0.25))", border: "1px solid rgba(0,229,255,0.35)" }}>PT</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{p.creator}</div>
                  <div className="text-xs text-[#94A3B8]">Official PromptAI team</div>
                </div>
                <button onClick={toggleFollow} className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${following ? "border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]" : "btn-primary"}`} data-testid="detail-follow">
                  {following ? "Following" : "Follow"}
                </button>
              </div>
            </Section>

            <Section title="Related promptlets">
              {related.length === 0 ? (
                <div className="text-sm text-[#94A3B8]">No related promptlets yet.</div>
              ) : (
                <ul className="space-y-2" data-testid="related-list">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link to={`/promptlets/${r.slug}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 hover:border-[#00E5FF]/30 transition" data-testid={`related-${r.slug}`}>
                        <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${r.gradient[0]}, ${r.gradient[1]})` }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{r.name}</div>
                          <div className="text-[11px] text-[#94A3B8]">{r.category} · {r.credits_cost} cr</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-lg tracking-tight mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ icon: Icon, label, testid }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[#cbd5e1]" data-testid={testid}>
      <Icon className="h-3.5 w-3.5 text-cyan" /> {label}
    </span>
  );
}
