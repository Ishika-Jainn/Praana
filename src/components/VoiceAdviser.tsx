"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSpeaking, speakText, stopSpeaking, type VoiceScript } from "@/lib/voice";
import { useI18n } from "./providers";
import type { Lang } from "@/lib/types";

export default function VoiceAdviser({
  text,
  label,
  className = "btn-line",
  style,
}: {
  text: string | VoiceScript | ((lang: Lang) => string | VoiceScript);
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { lang } = useI18n();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    function onSpeech(e: Event) {
      const ce = e as CustomEvent<{ active: boolean }>;
      if (ce.detail && !ce.detail.active) {
        setPlaying(false);
      }
    }
    window.addEventListener("praana:speech", onSpeech);
    return () => {
      window.removeEventListener("praana:speech", onSpeech);
    };
  }, []);

  function toggle() {
    if (playing || isSpeaking()) {
      stopSpeaking();
      setPlaying(false);
    } else {
      setPlaying(true);
      const content = typeof text === "function" ? text(lang) : text;
      const ok = speakText(content, lang, () => setPlaying(false));
      if (!ok) setPlaying(false);
    }
  }

  const defaultLabel =
    lang === "hi"
      ? playing
        ? "आवाज रोकें"
        : "सलाह सुनें (ऑडियो)"
      : lang === "mr"
        ? playing
          ? "थांबवा"
          : "सूचना ऐका (ऑडिओ)"
        : playing
          ? "Stop Audio"
          : "Listen Aloud";

  return (
    <button
      type="button"
      className={`${className} ${playing ? "active-audio" : ""}`}
      onClick={toggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        ...style,
      }}
      title="Listen to this advisory aloud in your selected language"
    >
      {playing ? <VolumeX size={16} /> : <Volume2 size={16} />}
      <span>{label || defaultLabel}</span>
    </button>
  );
}
