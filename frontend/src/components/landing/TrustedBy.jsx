const brands = ["Vercel", "Linear", "Stripe", "Loom", "Notion", "Arc", "Framer", "Cursor", "Lovable", "Anthropic", "OpenAI", "Figma"];

export default function TrustedBy() {
  const row = [...brands, ...brands];
  return (
    <section className="relative py-16" data-testid="trusted-section">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-[#94A3B8]" data-testid="trusted-eyebrow">
          Trusted by 12,000+ creators at teams like
        </p>
        <div className="relative mt-8 overflow-hidden mask-fade">
          <div className="flex marquee-track animate-marquee gap-12 pr-12">
            {row.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors whitespace-nowrap" data-testid={`brand-${b.toLowerCase()}-${i}`}>
                <span className="h-2 w-2 rounded-sm rotate-45 bg-white/30" />
                <span className="font-display text-xl tracking-tight">{b}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24" style={{ background: "linear-gradient(90deg, #050816, transparent)" }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24" style={{ background: "linear-gradient(-90deg, #050816, transparent)" }} />
        </div>
      </div>
    </section>
  );
}
