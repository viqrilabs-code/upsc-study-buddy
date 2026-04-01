"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";

type FormState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: "",
};

export function ContactForm() {
  const [state, setState] = useState<FormState>(initialState);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setState({ status: "loading", message: "" });

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      topic: String(formData.get("topic") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Unable to send your message.");
      }

      form.reset();
      setState({
        status: "success",
        message: data.message || "Your message has been received. We will get back within one business day.",
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while sending your message.",
      });
    }
  }

  return (
    <form className="glass-panel rounded-[2rem] p-6 md:p-8" onSubmit={onSubmit}>
      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-navy">Name</span>
          <input
            name="name"
            required
            className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
            placeholder="Your full name"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-navy">Email</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
            placeholder="you@example.com"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-navy">Topic</span>
          <select
            name="topic"
            required
            defaultValue=""
            className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
          >
            <option value="" disabled>
              Select a topic
            </option>
            <option value="sales">Sales or pricing</option>
            <option value="support">Product support</option>
            <option value="partnership">Partnership</option>
            <option value="feedback">Feature feedback</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-navy">Message</span>
          <textarea
            name="message"
            required
            minLength={20}
            rows={5}
            className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
            placeholder="Tell us how we can help."
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col items-start gap-3">
        <button type="submit" className="button-primary" disabled={state.status === "loading"}>
          {state.status === "loading" ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
          Send message
        </button>
        {state.message ? (
          <p
            className={`text-sm ${
              state.status === "success" ? "text-pine" : state.status === "error" ? "text-rose" : "text-copy"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
