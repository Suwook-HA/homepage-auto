"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "homepage-lang";

type LangMode = "ko" | "en" | "bi";

export function LanguageToggle() {
  const [lang, setLang] = useState<LangMode>("bi");

  useEffect(() => {
    document.documentElement.dataset.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  return (
    <div className="lang-toggle" role="group" aria-label="Language mode">
      {[
        { id: "ko" as const, label: "KO" },
        { id: "en" as const, label: "EN" },
        { id: "bi" as const, label: "BI" },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          className={`lang-toggle-button${lang === item.id ? " active" : ""}`}
          onClick={() => setLang(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
