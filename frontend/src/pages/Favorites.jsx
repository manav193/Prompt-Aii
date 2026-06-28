import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import PromptletCard from "@/components/PromptletCard";
import { api } from "@/lib/api";

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/me/favorites");
      setItems(data.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <div data-testid="favorites-page">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Saved</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Your favorite Promptlets</h1>
          <p className="mt-2 text-[#94A3B8]">{items.length} saved.</p>
        </header>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass rounded-2xl h-72 animate-pulse-soft" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center" data-testid="favorites-empty">
            <p className="text-[#94A3B8]">No favorites yet.</p>
            <Link to="/marketplace" className="mt-4 inline-flex btn-primary rounded-full px-5 py-2.5 text-sm font-semibold" data-testid="favorites-browse">
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="favorites-grid">
            {items.map((it, i) => (
              <PromptletCard key={it.promptlet_id} item={it} index={i} onChange={load} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
