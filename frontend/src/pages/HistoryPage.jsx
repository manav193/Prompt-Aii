import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/me/history?limit=100").then(({ data }) => setItems(data.items || [])).finally(() => setLoading(false));
  }, []);

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <DashboardLayout>
      <div data-testid="history-page">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Activity</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Recent prompts</h1>
          <p className="mt-2 text-[#94A3B8]">{items.length} prompt{items.length === 1 ? "" : "s"} generated.</p>
        </header>
        {loading ? (
          <div className="glass rounded-2xl h-72 animate-pulse-soft" />
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-[#94A3B8]">No prompts yet.</p>
            <Link to="/marketplace" className="mt-4 inline-flex btn-primary rounded-full px-5 py-2.5 text-sm font-semibold" data-testid="history-browse">
              Browse marketplace
            </Link>
          </div>
        ) : (
          <ul className="glass rounded-2xl divide-y divide-white/5" data-testid="history-list">
            {items.map((h) => (
              <li key={h.history_id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm truncate">{h.promptlet_name}</p>
                  <p className="text-[12px] text-[#94A3B8]">{h.category}</p>
                </div>
                <span className="text-xs text-[#94A3B8] whitespace-nowrap">{fmt(h.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
