"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value.trim(),
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim(),
      _hp: (form.elements.namedItem("_hp") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMsg(json.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot — hidden from real users */}
      <input type="text" name="_hp" className="form-hp" tabIndex={-1} autoComplete="off" />

      <div className="form-row">
        <label className="form-field">
          <span className="form-label">Name *</span>
          <input
            name="name"
            type="text"
            className="form-input"
            required
            minLength={2}
            maxLength={100}
            placeholder="Your name"
          />
        </label>
        <label className="form-field">
          <span className="form-label">Email *</span>
          <input
            name="email"
            type="email"
            className="form-input"
            required
            maxLength={200}
            placeholder="your@email.com"
          />
        </label>
      </div>

      <label className="form-field">
        <span className="form-label">Subject</span>
        <input
          name="subject"
          type="text"
          className="form-input"
          maxLength={200}
          placeholder="What is this about?"
        />
      </label>

      <label className="form-field">
        <span className="form-label">Message *</span>
        <textarea
          name="message"
          className="form-textarea"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Your message..."
        />
      </label>

      {status === "success" && (
        <p className="form-success">Message sent! I will get back to you soon.</p>
      )}
      {status === "error" && <p className="error">{errorMsg}</p>}

      <button
        type="submit"
        className="button"
        disabled={status === "sending" || status === "success"}
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
