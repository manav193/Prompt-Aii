const items = [
  {
    quote: "PromptAI is the layer I didn't know my agency needed. We shipped 3x more campaigns last month — same team.",
    name: "Mara Lindgren",
    role: "Founder, Northbound Studio",
    initials: "ML",
  },
  {
    quote: "We replaced six tools and a Notion graveyard with one PromptAI workspace. Engineers actually use it.",
    name: "Daniel Okafor",
    role: "Head of AI, Helix Health",
    initials: "DO",
  },
  {
    quote: "The model-to-model translation is genuinely magical. Same idea, perfect prompt for Claude and Midjourney.",
    name: "Yuki Tanaka",
    role: "Creative Director, Loop Tokyo",
    initials: "YT",
  },
  {
    quote: "Versioning and A/B testing on prompts. That alone is worth it. Everything else is gravy.",
    name: "Priya Raman",
    role: "Staff Eng, Marlin Labs",
    initials: "PR",
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-24" data-testid="testimonials-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Loved by builders</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
            What the people shipping with PromptAI are saying.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {items.map((t, i) => (
            <figure key={i} className="glass card-lift rounded-2xl p-8" data-testid={`testimonial-${i}`}>
              <blockquote className="text-[17px] leading-relaxed text-white/90">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full grid place-items-center font-display text-sm"
                     style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.25), rgba(59,130,246,0.25))", border: "1px solid rgba(0,229,255,0.35)" }}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm text-white">{t.name}</div>
                  <div className="text-xs text-[#94A3B8]">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
