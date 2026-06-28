import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    desc: "For curious creators getting started.",
    features: ["50 prompts / month", "Access to 5 models", "Personal prompt library", "Community support"],
    cta: "Start free",
    featured: false,
    testid: "pricing-free",
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "/ month",
    desc: "Everything you need to ship serious work.",
    features: ["Unlimited prompts", "All 15+ models", "Versioning + A/B testing", "Workflows & chains", "Priority support"],
    cta: "Upgrade to Pro",
    featured: true,
    testid: "pricing-pro",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    desc: "For teams that need scale, security and SSO.",
    features: ["SSO + SAML", "SOC2 + audit logs", "Dedicated success manager", "Custom model routing", "On-prem option"],
    cta: "Talk to sales",
    featured: false,
    testid: "pricing-enterprise",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24" data-testid="pricing-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Pricing</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
            Simple, generous, scales with you.
          </h2>
          <p className="mt-4 text-[#94A3B8] text-base sm:text-lg">
            Start free. Pay only when PromptAI is saving you hours.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl p-8 card-lift ${t.featured ? "glass-strong border-cyan glow-cyan" : "glass"}`}
              data-testid={t.testid}
            >
              {t.featured && (
                <span className="absolute -top-3 left-6 px-2.5 py-0.5 text-[11px] rounded-full bg-[#00E5FF] text-[#050816] font-semibold">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg tracking-tight text-white">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl tracking-tighter">{t.price}</span>
                {t.cadence && <span className="text-[#94A3B8] text-sm">{t.cadence}</span>}
              </div>
              <p className="mt-2 text-[#94A3B8] text-sm">{t.desc}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-white/85">
                    <span className="mt-0.5 h-4 w-4 rounded-full grid place-items-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
                      <Check className="h-3 w-3 text-[#10B981]" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={t.name === "Enterprise" ? "#contact" : "/signup"}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold ${
                  t.featured ? "btn-primary" : "btn-ghost-glass"
                }`}
                data-testid={`${t.testid}-cta`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
