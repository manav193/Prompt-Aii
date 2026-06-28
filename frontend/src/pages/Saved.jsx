import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import PromptletCard from "@/components/PromptletCard";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function Saved() {
  const [tab, setTab] = useState("generated"); // generated | favorites
  const [generated, setGenerated] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [g, f] = await Promise.all([
        api.get("/me/saved-prompts"),
        api.get("/me/favorites"),
      ]);
      setGenerated(g.data.items || []);
      setFavorites(f.data.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const copy = async (text) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Copied to clipboard.");
  };

  const remove = async (saved_id) => {
    try {
      await api.delete(`/me/saved-prompts/${saved_id}`);
      setGenerated((rows) => rows.filter((r) => r.saved_id !== saved_id));
      toast.success("Removed.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  return (
    <DashboardLayout>
      <div data-testid="saved-page">
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Library</p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Saved Promptlets</h1>
            <p className="mt-2 text-[#94A3B8]">{generated.length} generations · {favorites.length} marketplace favorites.</p>
          </div>
          <div className="glass rounded-full p-1 inline-flex" data-testid="saved-tabs">
            {[
              { id: "generated", label: `Generations (${generated.length})` },
              { id: "favorites", label: `Marketplace (${favorites.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 text-xs rounded-full transition ${tab === t.id ? "bg-white text-[#050816] font-semibold" : "text-white/80 hover:text-white"}`}
                data-testid={`tab-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {tab === "generated" ? (
          loading ? <Skeleton /> : generated.length === 0 ? (
            <EmptyState ctaText="Generate a prompt" ctaTo="/generate" msg="Nothing saved yet. Optimize a prompt in the Generator and tap Save." />
          ) : (
            <ul className="grid gap-3" data-testid="generated-list">
              {generated.map((g) => (
                <li key={g.saved_id} className="glass card-lift rounded-2xl p-5" data-testid={`saved-row-${g.saved_id}`}>
                  <div className="flex items-start gap-4">
                    <span className="h-10 w-10 shrink-0 rounded-lg grid place-items-center" style={{ background: "linear-gradient(135deg, #00E5FF22, #3B82F622)", border: "1px solid rgba(0,229,255,0.25)" }}>
                      <Sparkles className="h-4 w-4 text-cyan" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="font-display text-base tracking-tight truncate">{g.name}</h3>
                        <div className="text-[11px] text-[#94A3B8]">{g.category} · {g.model}</div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap text-[13px] text-white/85 font-mono-pa line-clamp-4">{g.prompt}</pre>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => copy(g.prompt)} className="btn-primary rounded-full px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5" data-testid={`saved-copy-${g.saved_id}`}>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                        <button onClick={() => remove(g.saved_id)} className="btn-ghost-glass rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5" data-testid={`saved-remove-${g.saved_id}`}>
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          loading ? <Skeleton /> : favorites.length === 0 ? (
            <EmptyState ctaText="Browse marketplace" ctaTo="/marketplace" msg="No marketplace favorites yet. Tap the heart on any promptlet card." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="favorites-list">
              {favorites.map((it, i) => <PromptletCard key={it.promptlet_id} item={it} index={i} onChange={load} />)}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass rounded-2xl h-56 animate-pulse-soft" />)}
    </div>
  );
}

function EmptyState({ ctaText, ctaTo, msg }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <p className="text-[#94A3B8]">{msg}</p>
      <Link to={ctaTo} className="mt-4 inline-flex btn-primary rounded-full px-5 py-2.5 text-sm font-semibold">{ctaText}</Link>
    </div>
  );
}
