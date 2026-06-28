import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Hero() {
  return (
    <section className="relative pt-36 sm:pt-40 pb-24 overflow-hidden" data-testid="hero-section">
      <AnimatedBackground />
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs font-medium text-white/80"
          data-testid="hero-badge"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] animate-pulse-soft" />
          New · Multi-model prompt orchestration is live
          <Sparkles className="h-3.5 w-3.5 text-cyan" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display mt-6 text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tighter leading-[1.02]"
          data-testid="hero-headline"
        >
          Engineer prompts that ship.
          <br />
          <span className="text-gradient">For every model that matters.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 mx-auto max-w-2xl text-base sm:text-lg text-[#94A3B8]"
          data-testid="hero-subheadline"
        >
          PromptAI turns one idea into production-grade prompts for ChatGPT, Claude, Gemini,
          Midjourney, Flux, Cursor, and ten more — optimized, versioned, and ready to deploy.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-9 flex items-center justify-center gap-3 flex-wrap"
        >
          <Link to="/signup" className="btn-primary rounded-full px-6 py-3 text-sm font-semibold inline-flex items-center gap-2" data-testid="hero-cta-primary">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how" className="btn-ghost-glass rounded-full px-5 py-3 text-sm inline-flex items-center gap-2" data-testid="hero-cta-secondary">
            <Play className="h-4 w-4 text-cyan" /> Watch the 90s tour
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="glass-strong rounded-2xl p-3 sm:p-4 glow-cyan">
            <div className="rounded-xl bg-[#050816]/70 border border-white/5 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-xs text-[#94A3B8] font-mono-pa">promptai · console</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 text-left">
                <div className="p-5 text-sm">
                  <div className="text-[#94A3B8] mb-2 text-xs uppercase tracking-wider">Input</div>
                  <p className="text-white/90">Write me a cinematic founder story photo for a fintech startup launching in Tokyo, dusk, neon.</p>
                </div>
                <div className="p-5 text-sm">
                  <div className="text-[#94A3B8] mb-2 text-xs uppercase tracking-wider">Optimized for Midjourney</div>
                  <pre className="font-mono-pa text-[12.5px] leading-relaxed text-white/85 whitespace-pre-wrap">
{`/imagine cinematic founder portrait,
  Tokyo skyline at dusk, neon reflections,
  35mm anamorphic, soft rim light,
  Fujifilm Pro 400H, --ar 16:9 --v 6.1`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
