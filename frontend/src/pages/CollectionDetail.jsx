import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PromptletCard from "@/components/PromptletCard";
import { api } from "@/lib/api";

export default function CollectionDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/collections/${slug}`).then(({ data }) => setData(data)).finally(() => setLoading(false));
  };
  useEffect(load, [slug]);

  return (
    <DashboardLayout>
      <div data-testid="collection-detail">
        <Link to="/collections" className="mb-5 inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white" data-testid="collection-back">
          <ArrowLeft className="h-3.5 w-3.5" /> All collections
        </Link>

        {data && (
          <div className="relative rounded-2xl overflow-hidden mb-6">
            {data.cover ? <img src={data.cover} alt="" className="h-56 w-full object-cover" /> :
              <div className="h-56 w-full" style={{ background: `linear-gradient(135deg, ${data.gradient?.[0] || "#0EA5E9"}, ${data.gradient?.[1] || "#3B82F6"})` }} />}
            <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(5,8,22,0.92), rgba(5,8,22,0.2))" }} />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan">Collection</p>
              <h1 className="font-display mt-1 text-3xl sm:text-4xl font-semibold tracking-tighter">{data.name}</h1>
              <p className="mt-2 text-[#cbd5e1] max-w-2xl">{data.subtitle}</p>
              <div className="mt-2 text-xs text-[#94A3B8]">{data.count} promptlets</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-96 animate-pulse-soft" />)}</div>
        ) : data?.items?.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-[#94A3B8]">No promptlets in this collection yet.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="collection-grid">
            {data?.items?.map((it, i) => <PromptletCard key={it.promptlet_id} item={it} index={i} onChange={load} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
