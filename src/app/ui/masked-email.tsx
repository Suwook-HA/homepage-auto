"use client";

import { useState } from "react";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function MaskedEmail({ email }: { email: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleClick() {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      className="masked-email"
      onClick={handleClick}
      title={revealed ? "Click to copy" : "Click to reveal email"}
    >
      {copied ? "Copied!" : revealed ? email : maskEmail(email)}
    </button>
  );
}
