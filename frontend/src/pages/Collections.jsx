import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

export default function Collections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/collections").then(({ data }) => setItems(data.items || [])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div data-testid="collections-page">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Collections</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Hand-picked sets for the way you work.</h1>
          <p className="mt-2 text-[#94A3B8]">{items.length} collections · curated by the PromptAI team.</p>
        </header>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-56 animate-pulse-soft" />)}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="collections-grid">
            {items.map((c) => (
              <Link key={c.slug} to={`/collections/${c.slug}`} className="glass card-lift rounded-2xl overflow-hidden block" data-testid={`collection-${c.slug}`}>
                <div className="relative h-36">
                  {c.cover ? <img src={c.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> :
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c.gradient?.[0] || "#0EA5E9"}, ${c.gradient?.[1] || "#3B82F6"})` }} />}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(5,8,22,0.85), rgba(5,8,22,0.15))" }} />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/45 backdrop-blur border border-white/15 text-white/90 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-cyan" /> {c.count} prompts
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg tracking-tight">{c.name}</h3>
                  <p className="mt-1 text-sm text-[#94A3B8] line-clamp-2">{c.subtitle}</p>
                  <div className="mt-3 text-xs text-cyan inline-flex items-center gap-1">Explore <ArrowRight className="h-3 w-3" /></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
