"use client";

import { useEffect, useState } from "react";
import { Volume2, X } from "lucide-react";
import { stopSpeaking } from "@/lib/voice";

export default function VoiceCaptionBar() {
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    function onSpeech(e: Event) {
      const ce = e as CustomEvent<{ active: boolean; text: string; lang: string }>;
      if (ce.detail) {
        setActive(Boolean(ce.detail.active));
        setText(ce.detail.text || "");
        setLang(ce.detail.lang || "en");
      }
    }

    window.addEventListener("praana:speech", onSpeech);
    return () => {
      window.removeEventListener("praana:speech", onSpeech);
    };
  }, []);

  if (!active || !text) return null;

  const langLabel = lang === "hi" ? "हिंदी" : lang === "mr" ? "मराठी" : "English";

  return (
    <aside
      className="voice-caption-banner"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "rgba(16, 36, 31, 0.94)",
        color: "#f3fbf8",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(196, 98, 45, 0.45)",
        borderRadius: 12,
        padding: "12px 18px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: "min(680px, 92vw)",
        fontSize: "0.88rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(196, 98, 45, 0.3)",
          color: "#e6c27c",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: "0.76rem",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <Volume2 size={14} className="pulse-icon" />
        <span>{langLabel}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, lineHeight: 1.45, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
          {text}
        </p>
      </div>

      <button
        type="button"
        onClick={() => stopSpeaking()}
        style={{
          background: "transparent",
          border: "none",
          color: "#9ca3af",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          flexShrink: 0,
        }}
        title="Stop Voice"
        aria-label="Stop Voice"
      >
        <X size={16} />
      </button>
    </aside>
  );
}
