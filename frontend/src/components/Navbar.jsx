import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, LogOut } from "lucide-react";

const links = [
  { to: "/#features", label: "Features" },
  { to: "/#how", label: "How it works" },
  { to: "/#models", label: "Models" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav("/");
  };

  return (
    <header className="fixed top-4 inset-x-0 z-40" data-testid="site-navbar">
      <nav className="mx-auto max-w-6xl px-4">
        <div className="glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            <span className="relative h-8 w-8 rounded-lg grid place-items-center"
                  style={{ background: "linear-gradient(180deg, rgba(0,229,255,0.25), rgba(59,130,246,0.15))", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Sparkles className="h-4 w-4 text-cyan" />
            </span>
            <span className="font-display text-lg tracking-tight">Prompt<span className="text-cyan">AI</span></span>
          </Link>

          <ul className="hidden md:flex items-center gap-7 text-sm text-[#94A3B8]">
            {links.map((l) => (
              <li key={l.to}>
                <a href={l.to} className="hover:text-white transition-colors" data-testid={`nav-${l.label.toLowerCase().replace(/\s/g,'-')}`}>{l.label}</a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <NavLink to="/dashboard" className="hidden sm:inline-flex btn-ghost-glass rounded-full px-4 py-2 text-sm" data-testid="navbar-dashboard">Dashboard</NavLink>
                <button onClick={handleLogout} className="btn-ghost-glass rounded-full px-3 py-2 text-sm inline-flex items-center gap-2" data-testid="navbar-logout">
                  <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
