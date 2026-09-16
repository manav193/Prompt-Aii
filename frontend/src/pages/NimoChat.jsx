import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";

const NIMO_URL = (process.env.REACT_APP_NIMO_CORE_URL || "https://nimo-core.manavagarwal193.workers.dev").replace(/\/$/, "");

export default function NimoChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "NIMO-CORE test console ready. Ask me something to verify the live connection." },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await fetch(`${NIMO_URL}/api/nimo/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `NIMO-CORE returned HTTP ${response.status}`);
      }
      setMessages((current) => [...current, { role: "assistant", content: payload.reply || "NIMO-CORE returned an empty reply." }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: `Connection error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050816] text-white px-4 pt-28 pb-10">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to PromptAI
        </Link>

        <section className="glass rounded-3xl overflow-hidden border border-cyan/20">
          <div className="px-5 sm:px-7 py-5 border-b border-white/10 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center bg-cyan/10 border border-cyan/25">
              <Sparkles className="h-5 w-5 text-cyan" />
            </span>
            <div>
              <h1 className="font-display text-xl">NIMO-CORE Chat</h1>
              <p className="text-xs text-[#64748B]">Temporary public integration test console</p>
            </div>
          </div>

          <div className="min-h-[420px] max-h-[60vh] overflow-y-auto p-5 sm:p-7 space-y-4">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${item.role === "user" ? "bg-cyan/15 border border-cyan/20" : "bg-white/5 border border-white/10 text-[#CBD5E1]"}`}>
                  {item.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-[#94A3B8] inline-flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> NIMO is thinking…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-4 sm:p-5 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Message NIMO-CORE…"
              className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-cyan/40"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="rounded-xl px-4 py-3 bg-cyan/15 border border-cyan/30 hover:bg-cyan/20 disabled:opacity-40 transition-colors" aria-label="Send message">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
