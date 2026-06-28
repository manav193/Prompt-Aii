const steps = [
  { n: "01", title: "Describe the outcome", body: "Tell PromptAI what you want — a tweet, a hero image, a refactored function. Plain English, your voice." },
  { n: "02", title: "We engineer the prompt", body: "Our optimizer rewrites it into a production-grade prompt tuned for the model you’ve chosen." },
  { n: "03", title: "Ship, version, iterate", body: "Save winners to your library, branch off variants, and run A/B tests until output is undeniable." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative py-24" data-testid="how-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">How it works</p>
            <h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
              From idea to optimized prompt in three steps.
            </h2>
          </div>
          <p className="text-[#94A3B8] max-w-md">No prompt-engineering PhD required. We do the heavy lifting; you ship the result.</p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3 relative">
          <div aria-hidden className="hidden md:block absolute top-9 left-12 right-12 h-px hairline" />
          {steps.map((s, i) => (
            <li key={s.n} className="relative glass rounded-2xl p-7 card-lift" data-testid={`how-step-${i}`}>
              <div className="font-mono-pa text-[12px] text-cyan tracking-wider">{s.n}</div>
              <h3 className="font-display mt-3 text-xl tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[#94A3B8] leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
