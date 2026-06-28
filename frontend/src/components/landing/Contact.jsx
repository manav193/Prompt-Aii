import { useState } from "react";
import { Mail, MessageSquare, User, Send } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Message received. We'll get back within one business day.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="relative py-24" data-testid="contact-section">
      <div className="mx-auto max-w-5xl px-4 grid gap-12 md:grid-cols-2 items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Talk to us</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
            Have a question? Pitch us your weird idea.
          </h2>
          <p className="mt-4 text-[#94A3B8] text-base sm:text-lg">
            Whether you're a solo creator or a 5,000-person team, we read every message. Usually we reply same-day.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[#94A3B8]">
            <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-cyan" /> hello@promptai.app</li>
            <li className="flex items-center gap-3"><MessageSquare className="h-4 w-4 text-cyan" /> Live chat in-app, 9–6 GMT</li>
          </ul>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-2xl p-7 space-y-4" data-testid="contact-form">
          <Field icon={User} label="Your name" value={form.name} onChange={update("name")} placeholder="Ada Lovelace" testid="contact-name" />
          <Field icon={Mail} label="Email" type="email" value={form.email} onChange={update("email")} placeholder="ada@example.com" testid="contact-email" />

          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Message</span>
            <textarea
              value={form.message}
              onChange={update("message")}
              required
              minLength={5}
              rows={4}
              placeholder="Tell us what you're building..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-white/40 resize-none ring-focus"
              data-testid="contact-message"
            />
          </label>

          <button disabled={loading} className="btn-primary rounded-full px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="contact-submit">
            {loading ? "Sending..." : (<>Send message <Send className="h-4 w-4" /></>)}
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({ icon: Icon, label, type = "text", value, onChange, placeholder, testid }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          required
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-[15px] text-white placeholder:text-white/40 ring-focus"
          data-testid={testid}
        />
      </div>
    </label>
  );
}
