import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Users, BookOpen, FolderTree, BarChart3, Sparkles, Plus, Trash2, Star, Save } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";

const TABS = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "promptlets", label: "Promptlets", icon: Sparkles },
  { id: "users", label: "Users", icon: Users },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "collections", label: "Collections", icon: BookOpen },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("analytics");

  if (!user) return null;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div data-testid="admin-page">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Admin</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter">Control panel</h1>
          <p className="mt-2 text-[#94A3B8]">Manage the catalogue, users and platform analytics.</p>
        </header>

        <div className="glass rounded-full p-1 inline-flex mb-6" data-testid="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 sm:px-4 py-1.5 text-xs rounded-full transition inline-flex items-center gap-1.5 ${tab === t.id ? "bg-white text-[#050816] font-semibold" : "text-white/85 hover:text-white"}`} data-testid={`admin-tab-${t.id}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "analytics" && <Analytics />}
        {tab === "promptlets" && <PromptletsAdmin />}
        {tab === "users" && <UsersAdmin />}
        {tab === "categories" && <CategoriesAdmin />}
        {tab === "collections" && <CollectionsAdmin />}
      </div>
    </DashboardLayout>
  );
}

function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics").then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="glass rounded-2xl h-72 animate-pulse-soft" />;
  const t = data.totals;
  return (
    <div className="grid gap-5" data-testid="admin-analytics">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Users" value={t.users} hint={`${t.pro_users} pro · ${t.verified_users} verified`} testid="kpi-users" />
        <KPI label="Promptlets" value={t.promptlets} hint={`${t.featured_promptlets} featured`} testid="kpi-promptlets" />
        <KPI label="Prompts (30d)" value={t.monthly_prompts} hint={`${t.prompts} all-time`} testid="kpi-prompts" />
        <KPI label="Credits used" value={t.credits_used} hint={`${t.waitlist} waitlist · ${t.contact_messages} contacts`} testid="kpi-credits" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top promptlets (by downloads)" testid="panel-top-promptlets">
          <ul className="divide-y divide-white/5">
            {data.top_promptlets.map((p) => (
              <li key={p.slug} className="py-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm truncate">{p.name}</div>
                  <div className="text-xs text-[#94A3B8]">{p.category}</div>
                </div>
                <div className="text-xs text-cyan whitespace-nowrap">{p.downloads?.toLocaleString?.()} dl · {p.views?.toLocaleString?.()} views</div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Top categories (by prompt activity)" testid="panel-top-categories">
          {data.top_categories.length === 0 ? <p className="text-sm text-[#94A3B8]">No activity yet.</p> : (
            <ul className="space-y-2">
              {data.top_categories.map((c) => {
                const max = data.top_categories[0].count;
                const w = Math.max(6, Math.round((c.count / max) * 100));
                return (
                  <li key={c.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{c.category}</span>
                      <span className="text-[#94A3B8] text-xs">{c.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full" style={{ width: `${w}%`, background: "linear-gradient(90deg, #00E5FF, #3B82F6)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Recent signups">
        <ul className="divide-y divide-white/5">
          {data.recent_users.map((u) => (
            <li key={u.user_id} className="py-2.5 flex items-center justify-between text-sm">
              <span className="truncate">{u.email}</span>
              <span className="text-xs text-[#94A3B8]">{u.subscription} · {new Date(u.created_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function PromptletsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankPromptlet());

  const load = () => { setLoading(true); api.get("/admin/promptlets").then(({ data }) => setItems(data.items || [])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/promptlets", { ...form, models: form.models.split(",").map(s => s.trim()).filter(Boolean) });
      toast.success("Promptlet created.");
      setOpen(false); setForm(blankPromptlet()); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message); }
  };

  const toggleFeature = async (slug) => {
    await api.post(`/admin/promptlets/${slug}/feature`);
    load();
  };

  const remove = async (slug) => {
    if (!window.confirm(`Delete ${slug}?`)) return;
    await api.delete(`/admin/promptlets/${slug}`);
    load();
  };

  return (
    <div data-testid="admin-promptlets">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#94A3B8]">{items.length} promptlets in catalogue.</p>
        <button onClick={() => setOpen(true)} className="btn-primary rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-2" data-testid="admin-new-promptlet">
          <Plus className="h-3.5 w-3.5" /> New promptlet
        </button>
      </div>

      {loading ? <div className="glass rounded-2xl h-64 animate-pulse-soft" /> : (
        <ul className="glass rounded-2xl divide-y divide-white/5" data-testid="admin-promptlet-list">
          {items.map((p) => (
            <li key={p.slug} className="px-5 py-3 flex items-center gap-4">
              <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${p.gradient?.[0] || "#0EA5E9"}, ${p.gradient?.[1] || "#3B82F6"})` }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm flex items-center gap-2">
                  <span className="truncate">{p.name}</span>
                  {p.featured && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#00E5FF] text-[#050816] font-semibold">Feat.</span>}
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#94A3B8]">{p.plan}</span>
                </div>
                <div className="text-[12px] text-[#94A3B8]">{p.category} · {p.credits_cost} cr · {p.views?.toLocaleString?.()} views</div>
              </div>
              <button onClick={() => toggleFeature(p.slug)} className="btn-ghost-glass rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5" data-testid={`admin-feature-${p.slug}`}>
                <Star className={`h-3.5 w-3.5 ${p.featured ? "text-cyan fill-cyan" : ""}`} /> Feature
              </button>
              <button onClick={() => remove(p.slug)} className="rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border border-red-500/30 bg-red-500/10 text-red-300" data-testid={`admin-delete-${p.slug}`}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur grid place-items-center p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="glass-strong rounded-2xl p-6 w-full max-w-xl grid gap-3" data-testid="admin-create-form">
            <h3 className="font-display text-xl tracking-tight">New promptlet</h3>
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="form-name" required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} testid="form-category" required />
              <Select label="Plan" value={form.plan} onChange={(v) => setForm({ ...form, plan: v })} options={["free", "pro"]} testid="form-plan" />
            </div>
            <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} testid="form-description" required />
            <Input label="Models (comma-separated)" value={form.models} onChange={(v) => setForm({ ...form, models: v })} testid="form-models" />
            <Textarea label="Prompt template" value={form.prompt} onChange={(v) => setForm({ ...form, prompt: v })} testid="form-prompt" required />
            <div className="grid grid-cols-3 gap-3">
              <Select label="Difficulty" value={form.difficulty} onChange={(v) => setForm({ ...form, difficulty: v })} options={["Beginner", "Intermediate", "Advanced"]} testid="form-difficulty" />
              <Input label="Credits" type="number" value={form.credits_cost} onChange={(v) => setForm({ ...form, credits_cost: Number(v) || 1 })} testid="form-credits" />
              <Input label="Quality (1-5)" type="number" value={form.quality} onChange={(v) => setForm({ ...form, quality: Number(v) || 4 })} testid="form-quality" />
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost-glass rounded-full px-4 py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"><Save className="h-3.5 w-3.5" /> Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function blankPromptlet() {
  return { name: "", category: "Writing", plan: "free", description: "", models: "ChatGPT, Claude", prompt: "", difficulty: "Beginner", credits_cost: 1, quality: 4, featured: false, how_to_use: "", expected_output: "" };
}

function UsersAdmin() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api.get(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(({ data }) => setItems(data.items || [])).finally(() => setLoading(false));
  };
  useEffect(load, [q]);

  const update = async (user_id, patch) => {
    await api.patch(`/admin/users/${user_id}`, patch);
    toast.success("Updated.");
    load();
  };

  return (
    <div data-testid="admin-users">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name..." className="mb-4 w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 ring-focus" data-testid="admin-users-search" />
      {loading ? <div className="glass rounded-2xl h-64 animate-pulse-soft" /> : (
        <ul className="glass rounded-2xl divide-y divide-white/5" data-testid="admin-users-list">
          {items.map((u) => (
            <li key={u.user_id} className="px-5 py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="text-sm truncate">{u.email}</div>
                <div className="text-[11px] text-[#94A3B8]">{u.name || "—"} · {u.provider} · {u.role || "user"}</div>
              </div>
              <select value={u.subscription} onChange={(e) => update(u.user_id, { subscription: e.target.value })} className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs ring-focus" data-testid={`admin-user-plan-${u.user_id}`}>
                <option value="free">free</option>
                <option value="pro">pro</option>
              </select>
              <select value={u.role || "user"} onChange={(e) => update(u.user_id, { role: e.target.value })} className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs ring-focus" data-testid={`admin-user-role-${u.user_id}`}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoriesAdmin() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const load = () => api.get("/admin/categories").then(({ data }) => setItems(data.items || []));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/admin/categories", { name: name.trim(), active: true });
    setName(""); load();
  };
  const remove = async (n) => { if (!window.confirm(`Delete ${n}?`)) return; await api.delete(`/admin/categories/${encodeURIComponent(n)}`); load(); };
  return (
    <div data-testid="admin-categories">
      <form onSubmit={add} className="flex items-center gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category..." className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2 text-sm text-white ring-focus" data-testid="admin-category-name" />
        <button className="btn-primary rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-2" data-testid="admin-category-add"><Plus className="h-3.5 w-3.5" /> Add</button>
      </form>
      <ul className="glass rounded-2xl divide-y divide-white/5">
        {items.map((c) => (
          <li key={c.name} className="px-5 py-3 flex items-center justify-between">
            <span>{c.name}</span>
            <button onClick={() => remove(c.name)} className="text-xs text-red-300 inline-flex items-center gap-1.5" data-testid={`admin-category-del-${c.name}`}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollectionsAdmin() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/collections").then(({ data }) => setItems(data.items || []));
  useEffect(() => { load(); }, []);
  return (
    <div data-testid="admin-collections">
      <ul className="glass rounded-2xl divide-y divide-white/5">
        {items.map((c) => (
          <li key={c.slug} className="px-5 py-3 flex items-center gap-4">
            <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${c.gradient?.[0] || "#0EA5E9"}, ${c.gradient?.[1] || "#3B82F6"})` }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm">{c.name}</div>
              <div className="text-[11px] text-[#94A3B8]">{c.subtitle}</div>
            </div>
            <span className="text-xs text-[#94A3B8]">{c.model || (c.categories || []).join(", ") || "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----- Small primitives ----- */
function KPI({ label, value, hint, testid }) {
  return (
    <div className="glass rounded-2xl p-5" data-testid={testid}>
      <div className="text-[11px] uppercase tracking-wider text-[#94A3B8]">{label}</div>
      <div className="mt-1 font-display text-3xl tracking-tighter">{Number(value || 0).toLocaleString()}</div>
      {hint && <div className="text-xs text-[#94A3B8] mt-1">{hint}</div>}
    </div>
  );
}
function Panel({ title, children, testid }) {
  return (
    <div className="glass rounded-2xl p-5" data-testid={testid}>
      <h3 className="font-display text-base tracking-tight mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, type = "text", required, testid }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-1.5">{label}</span>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white ring-focus" data-testid={testid} />
    </label>
  );
}
function Textarea({ label, value, onChange, testid, required }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-1.5">{label}</span>
      <textarea rows={4} value={value} required={required} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white ring-focus font-mono-pa" data-testid={testid} />
    </label>
  );
}
function Select({ label, value, onChange, options, testid }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white ring-focus appearance-none" data-testid={testid}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
