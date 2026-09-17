import { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function PromptFeedback({ idea, prompt, model, category, requestId }) {
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async (type, reason = null) => {
    if (!idea || !prompt || sending) return;
    setSending(true);
    try {
      await api.post("/feedback/prompt", {
        request_id: requestId || null,
        feedback: type,
        reason,
        idea,
        prompt,
        model,
        category,
      });
      if (type === "like" || type === "dislike") setFeedback(type);
      toast.success(type === "like" ? "Thanks — this helps PromptAI learn." : "Thanks — we'll use this to improve.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Feedback could not be saved.");
    } finally { setSending(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(prompt).catch(() => {});
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    const data = { title: "PromptAI prompt", text: prompt };
    if (navigator.share) {
      await navigator.share(data).catch(() => {});
    } else {
      await navigator.clipboard.writeText(prompt).catch(() => {});
      toast.success("Share isn't available here — prompt copied instead.");
    }
    void send("share");
  };

  return (
    <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2" data-testid="prompt-feedback">
      <span className="text-[11px] text-[#94A3B8] mr-1">Was this prompt useful?</span>
      <FeedbackButton icon={ThumbsUp} label="Like" active={feedback === "like"} disabled={sending} onClick={() => send("like")} testid="feedback-like" />
      <FeedbackButton icon={ThumbsDown} label="Dislike" active={feedback === "dislike"} disabled={sending} onClick={() => send("dislike")} testid="feedback-dislike" />
      <FeedbackButton icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} disabled={sending} onClick={copy} testid="feedback-copy" />
      <FeedbackButton icon={Share2} label="Share" disabled={sending} onClick={share} testid="feedback-share" />
    </div>
  );
}

function FeedbackButton({ icon: Icon, label, active, disabled, onClick, testid }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={`rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border transition disabled:opacity-50 ${active ? "bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF]" : "bg-white/[0.04] border-white/10 text-white/80 hover:border-[#00E5FF]/40"}`} data-testid={testid}><Icon className="h-3.5 w-3.5" />{label}</button>;
}
