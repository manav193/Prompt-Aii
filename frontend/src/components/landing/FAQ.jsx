import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Which AI models does PromptAI support?", a: "We support major frontier models and creative AI tools including ChatGPT, Claude, Gemini, Midjourney, Stable Diffusion, Flux, Adobe Firefly, Cursor, Lovable, Sora and ElevenLabs — with more added over time." },
  { q: "Do I need to know prompt engineering?", a: "No. Describe the outcome in plain English and PromptAI rewrites it into a model-specific, production-grade prompt. You can still edit anything by hand." },
  { q: "Is there a free plan?", a: "Yes. 50 prompts per month, 5 models, personal library and community support — free forever. Upgrade only when you need to scale." },
  { q: "How does versioning work?", a: "Every save creates a new version. Branch, fork, diff and roll back like git — but for prompts. Teams can collaborate in real time." },
  { q: "Is my data secure?", a: "We never train on your prompts. PromptAI is SOC2-ready with optional SSO, audit logs and data residency for Enterprise customers." },
  { q: "Can I cancel anytime?", a: "Yes. Pro is month-to-month and you can downgrade to free at any time. We keep your library forever." },
];

export default function FAQ() {
  return (
    <section id="faq" className="relative py-24" data-testid="faq-section">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center"><p className="text-xs uppercase tracking-[0.25em] text-cyan">Questions</p><h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">Frequently asked.</h2></div>
        <Accordion type="single" collapsible className="mt-10 divide-y divide-white/5" data-testid="faq-accordion">
          {faqs.map((f, i) => <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/5"><AccordionTrigger className="text-left text-base sm:text-lg font-display tracking-tight hover:no-underline" data-testid={`faq-q-${i}`}>{f.q}</AccordionTrigger><AccordionContent className="text-[#94A3B8] text-[15px] leading-relaxed" data-testid={`faq-a-${i}`}>{f.a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </div>
    </section>
  );
}
