import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Twitter, Github, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { data } = await api.post("/newsletter", { email });
      toast.success(data.duplicate ? "You're already on the list." : "Subscribed. Welcome aboard.");
      setEmail("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative mt-32 border-t border-white/5" data-testid="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-16 grid gap-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: "linear-gradient(180deg, rgba(0,229,255,0.25), rgba(59,130,246,0.15))", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Sparkles className="h-4 w-4 text-cyan" />
            </span>
            <span className="font-display text-xl tracking-tight">Prompt<span className="text-cyan">AI</span></span>
          </div>
          <p className="mt-4 text-[#94A3B8] max-w-sm">The operating layer for prompt engineering across every model that matters. Built for the next billion creators.</p>

          <form onSubmit={subscribe} className="mt-6 flex items-center gap-2 max-w-md" data-testid="newsletter-form">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 ring-focus"
              data-testid="newsletter-email"
            />
            <button disabled={loading} className="btn-primary rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60" data-testid="newsletter-submit">
              {loading ? "..." : "Subscribe"}
            </button>
          </form>
        </div>

        <FooterCol title="Product" links={[
          { label: "Features", href: "#features" },
          { label: "Models", href: "#models" },
          { label: "Pricing", href: "#pricing" },
          { label: "Dashboard", href: "/dashboard" },
        ]} />
        <FooterCol title="Resources" links={[
          { label: "How it works", href: "#how" },
          { label: "FAQ", href: "#faq" },
          { label: "Changelog", href: "#" },
          { label: "Docs", href: "#" },
        ]} />
        <FooterCol title="Company" links={[
          { label: "Contact", href: "#contact" },
          { label: "Careers", href: "#" },
          { label: "Privacy", href: "#" },
          { label: "Terms", href: "#" },
        ]} />
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between text-xs text-[#94A3B8]">
          <span data-testid="footer-copy">© {new Date().getFullYear()} PromptAI Labs. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Twitter" className="hover:text-white transition-colors"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="GitHub" className="hover:text-white transition-colors"><Github className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-white transition-colors"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="font-display text-sm text-white/90 mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-[#94A3B8]">
        {links.map((l) => (
          <li key={l.label}>
            {l.href.startsWith("/") ? (
              <Link to={l.href} className="hover:text-white transition-colors">{l.label}</Link>
            ) : (
              <a href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
