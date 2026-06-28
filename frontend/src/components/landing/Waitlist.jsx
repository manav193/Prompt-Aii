import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MessageCircle, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { data } = await api.post("/newsletter", { email });
      setJoined(true);
      toast.success(data.duplicate ? "You're already on the list." : "You're in. Welcome to early access.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-28" data-testid="waitlist-section">
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative glass-strong rounded-3xl p-8 sm:p-12 glow-cyan overflow-hidden">
          {/* Decorative orbs */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full"
               style={{ background: "radial-gradient(closest-side, rgba(0,229,255,0.30), transparent 70%)", filter: "blur(30px)" }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full"
               style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.30), transparent 70%)", filter: "blur(30px)" }} />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs font-medium text-white/85" data-testid="waitlist-badge">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] animate-pulse-soft" />
              Early Access Program
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
            </div>

            <h2 className="font-display mt-5 text-3xl sm:text-5xl font-semibold tracking-tighter leading-[1.05]" data-testid="waitlist-heading">
              Join the <span className="text-gradient">Waitlist</span>.
            </h2>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#94A3B8]" data-testid="waitlist-subheading">
              PromptAI is rolling out in waves. Be among the first users to shape the product —
              direct line to the team, early features, and a permanent founding-member discount when we launch billing.
            </p>

            <div className="mt-10 grid gap-6 lg:grid-cols-2 items-stretch">
              {/* Email signup */}
              <div className="glass rounded-2xl p-6 flex flex-col" data-testid="waitlist-card-email">
                <div className="h-10 w-10 rounded-lg grid place-items-center"
                     style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.25)" }}>
                  <Mail className="h-4 w-4 text-cyan" />
                </div>
                <h3 className="font-display mt-4 text-xl tracking-tight">Get on the list</h3>
                <p className="mt-1.5 text-sm text-[#94A3B8]">
                  Drop your email and we'll send your invite when your wave opens.
                </p>

                {joined ? (
                  <div className="mt-5 rounded-xl border border-[#10B981]/30 bg-[#10B981]/[0.08] px-4 py-4 flex items-start gap-3" data-testid="waitlist-joined">
                    <span className="h-7 w-7 grid place-items-center rounded-full bg-[#10B981]/15 border border-[#10B981]/40 shrink-0">
                      <Check className="h-3.5 w-3.5 text-[#10B981]" />
                    </span>
                    <div className="text-sm">
                      <div className="text-white">You're on the list.</div>
                      <div className="text-[12px] text-[#94A3B8] mt-0.5">We'll be in touch as soon as your wave opens.</div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} className="mt-5 flex items-center gap-2" data-testid="waitlist-form">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 ring-focus"
                      data-testid="waitlist-email"
                    />
                    <button disabled={loading} className="btn-primary rounded-full px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="waitlist-submit">
                      {loading ? "..." : (<>Join <ArrowRight className="h-3.5 w-3.5" /></>)}
                    </button>
                  </form>
                )}

                <ul className="mt-5 space-y-2 text-[13px] text-[#94A3B8]">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
                      <Check className="h-2.5 w-2.5 text-[#10B981]" />
                    </span>
                    Priority invites as new waves open
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
                      <Check className="h-2.5 w-2.5 text-[#10B981]" />
                    </span>
                    Direct line to the team for feedback
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
                      <Check className="h-2.5 w-2.5 text-[#10B981]" />
                    </span>
                    Founding-member pricing on launch
                  </li>
                </ul>
              </div>

              {/* Discord */}
              <div className="glass rounded-2xl p-6 flex flex-col" data-testid="waitlist-card-discord">
                <div className="h-10 w-10 rounded-lg grid place-items-center"
                     style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.30)" }}>
                  <MessageCircle className="h-4 w-4 text-[#60A5FA]" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="font-display text-xl tracking-tight">Community Discord</h3>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#94A3B8]" data-testid="discord-coming-soon">
                    Coming soon
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[#94A3B8]">
                  A space for early users to swap promptlets, request features, and chat with the founding team.
                </p>

                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-5 btn-ghost-glass rounded-full px-4 py-2.5 text-sm inline-flex items-center justify-center gap-2 opacity-70 cursor-not-allowed self-start"
                  data-testid="discord-cta"
                >
                  <MessageCircle className="h-4 w-4" /> Notify me when it opens
                </button>

                <div className="mt-auto pt-6 text-[12px] text-[#94A3B8]">
                  Waitlist members get the invite first.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
