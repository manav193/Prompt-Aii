import { Layers, Wand2, Gauge, Shield, GitBranch, Workflow } from "lucide-react";

const features = [
  { icon: Wand2, title: "One idea, every model", body: "Translate a single brief into model-specific prompts for ChatGPT, Claude, Gemini, Midjourney, Flux and more." },
  { icon: Layers, title: "Prompt library", body: "Save, fork and reuse winning prompts across teams. Tag by use-case, model and outcome." },
  { icon: Gauge, title: "A/B test in seconds", body: "Run two prompts side-by-side and ship the winner. No spreadsheets, no guesswork." },
  { icon: GitBranch, title: "Versioning that just works", body: "Every prompt is git-style versioned. Roll back, branch, and compare with a single click." },
  { icon: Workflow, title: "Workflows + chains", body: "Compose multi-step prompt pipelines that talk to multiple models. Production-ready." },
  { icon: Shield, title: "Enterprise grade", body: "SOC2-ready architecture, SSO, audit trails and data residency built in from day one." },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24" data-testid="features-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Features</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
            Built for prompt engineering at the speed of thought.
          </h2>
          <p className="mt-4 text-[#94A3B8] text-base sm:text-lg">
            Stop fighting tools. PromptAI is the connective tissue between your imagination and every frontier model.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, i) => (
            <article key={title} className="glass card-lift rounded-2xl p-7" data-testid={`feature-card-${i}`}>
              <div className="h-10 w-10 rounded-lg grid place-items-center mb-5"
                   style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.25)" }}>
                <Icon className="h-5 w-5 text-cyan" />
              </div>
              <h3 className="font-display text-xl tracking-tight">{title}</h3>
              <p className="mt-2 text-[#94A3B8] text-[15px] leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
