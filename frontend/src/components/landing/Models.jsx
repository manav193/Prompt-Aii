const models = [
  { name: "ChatGPT", tag: "OpenAI · GPT-5.2", dot: "#10A37F" },
  { name: "Claude", tag: "Anthropic · 4.6", dot: "#D97757" },
  { name: "Gemini", tag: "Google · 3 Pro", dot: "#4285F4" },
  { name: "Midjourney", tag: "Image · v7", dot: "#FFFFFF" },
  { name: "Stable Diffusion", tag: "Stability · XL", dot: "#9333EA" },
  { name: "Flux", tag: "Black Forest Labs", dot: "#F472B6" },
  { name: "Adobe Firefly", tag: "Image · Vector", dot: "#FF0000" },
  { name: "Cursor", tag: "Code · Agent", dot: "#06B6D4" },
  { name: "Lovable", tag: "Build · Web", dot: "#FB923C" },
  { name: "Sora", tag: "Video · 2", dot: "#FFFFFF" },
  { name: "ElevenLabs", tag: "Voice · v3", dot: "#22D3EE" },
];

export default function Models() {
  return (
    <section id="models" className="relative py-24" data-testid="models-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Models supported</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
            Every major model. One unified prompt layer.
          </h2>
          <p className="mt-4 text-[#94A3B8] text-base sm:text-lg">
            We keep up with the frontier so you don’t have to. Switch models without rewriting a single prompt.
          </p>
        </div>

        <div className="mt-12 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {models.map((m, i) => (
            <div key={m.name} className="glass card-lift rounded-xl p-4 flex items-center gap-3" data-testid={`model-card-${i}`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.dot, boxShadow: `0 0 18px ${m.dot}` }} />
              <div className="min-w-0">
                <div className="font-display text-[15px] tracking-tight truncate">{m.name}</div>
                <div className="text-[12px] text-[#94A3B8] truncate">{m.tag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
