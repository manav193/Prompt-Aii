export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-70" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full"
           style={{ background: "radial-gradient(closest-side, rgba(0,229,255,0.35), transparent 70%)", filter: "blur(20px)" }} />
      <div className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full animate-orb-float"
           style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.30), transparent 70%)", filter: "blur(30px)" }} />
      <div className="absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full animate-orb-float"
           style={{ background: "radial-gradient(closest-side, rgba(0,229,255,0.18), transparent 70%)", filter: "blur(40px)", animationDelay: "3s" }} />
      <div className="absolute inset-x-0 top-0 h-px hairline" />
    </div>
  );
}
