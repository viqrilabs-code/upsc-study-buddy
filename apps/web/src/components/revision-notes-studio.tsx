"use client";

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { BookCopy, Download, FileUp, LoaderCircle, Map, ScrollText } from "lucide-react";
import {
  gsSubjectOptions,
  optionalSubjectOptions,
  type RevisionTrack,
} from "@/lib/upsc-syllabus";

type RevisionNotesResponse = {
  html?: string;
  message?: string;
  model?: string;
  title?: string;
  subjectLabel?: string;
  trackLabel?: string;
};

export function RevisionNotesStudio() {
  const [track, setTrack] = useState<RevisionTrack>("gs");
  const [subject, setSubject] = useState<string>(gsSubjectOptions[0]);
  const [optionalSubject, setOptionalSubject] = useState<string>(optionalSubjectOptions[0]);
  const [topic, setTopic] = useState("");
  const [customization, setCustomization] = useState("");
  const [studyMaterialFiles, setStudyMaterialFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");

  const activeSubjectLabel = useMemo(
    () => (track === "gs" ? subject : optionalSubject.trim() || "Optional"),
    [optionalSubject, subject, track],
  );

  function setStudyFiles(fileList: FileList | null) {
    setStudyMaterialFiles(fileList ? Array.from(fileList) : []);
  }

  function downloadNotes() {
    if (!html) {
      return;
    }

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${(title || "revision-notes").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studyMaterialFiles.length) {
      setError("Upload a source document before generating notes.");
      return;
    }

    setPending(true);
    setError("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("track", track);
        formData.set("subject", subject);
        formData.set("optionalSubject", optionalSubject);
        formData.set("topic", topic);
        formData.set("customization", customization);

        studyMaterialFiles.forEach((file) => {
          formData.append("studyMaterial", file);
        });

        const response = await fetch("/api/revision-notes", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as RevisionNotesResponse;

        if (!response.ok) {
          throw new Error(data.message || "Unable to generate notes right now.");
        }

        setHtml(data.html || "");
        setTitle(data.title || "");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while generating revision notes.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <section className="container-shell py-6 md:py-8">
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <aside className="glass-panel rounded-[2rem] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-sand">
              <BookCopy size={22} />
            </div>
            <div>
              <div className="text-lg font-semibold text-navy">1-pager revision notes</div>
              <div className="text-sm text-copy">Upload-led only</div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-border-subtle bg-white/78 p-4 text-sm leading-7 text-copy">
            This section is the only place where notes are generated. Study chat will teach and evaluate, but it will not create notes.
          </div>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-5">
            <div className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Track</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "gs", label: "General Studies" },
                  { value: "optional", label: "Optional" },
                ].map((option) => {
                  const active = track === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTrack(option.value as RevisionTrack)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "bg-navy text-[#fff9ef]"
                          : "border border-border-subtle bg-white/88 text-navy hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {track === "gs" ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-navy">GS subject</span>
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                >
                  {gsSubjectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-navy">Optional subject</span>
                <input
                  list="optional-subjects"
                  value={optionalSubject}
                  onChange={(event) => setOptionalSubject(event.target.value)}
                  className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                  placeholder="PSIR, Sociology, Anthropology..."
                />
                <datalist id="optional-subjects">
                  {optionalSubjectOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
            )}

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Topic or chapter</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                placeholder="Example: Panchayati Raj Institutions"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Customization</span>
              <textarea
                value={customization}
                onChange={(event) => setCustomization(event.target.value)}
                rows={3}
                className="rounded-[1.5rem] border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                placeholder="Optional: Ask for a prelims-heavy or mains-heavy lens, add focus areas, or request sharper answer framing."
              />
            </label>

            <label className="grid gap-2 rounded-[1.5rem] border border-border-subtle bg-white/78 p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                <FileUp size={16} />
                Upload source content
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.md,.markdown,.json,.html,.xml"
                onChange={(event) => setStudyFiles(event.target.files)}
                className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff9ef]"
              />
              <span className="text-xs text-copy">
                Upload the source PDF or text you want compressed into a revision-ready 1-pager.
              </span>
            </label>

            {studyMaterialFiles.length ? (
              <div className="rounded-[1.5rem] bg-sand/90 px-4 py-3 text-xs text-copy">
                {studyMaterialFiles.map((file) => (
                  <div key={file.name}>{file.name}</div>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[1.5rem] border border-rose/25 bg-rose/8 px-4 py-3 text-sm text-rose">
                {error}
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" size={18} /> : <ScrollText size={18} />}
              Generate 1-pager revision notes
            </button>

            <Link href="/app" className="button-secondary w-full">
              Back to workspace
            </Link>
          </form>
        </aside>

        <div className="glass-panel flex min-h-[70vh] flex-col rounded-[2rem]">
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-6">
            <div>
              <div className="text-lg font-semibold text-navy">Template preview</div>
              <div className="text-sm text-copy">
                {activeSubjectLabel} | {track === "gs" ? "General Studies" : "Optional"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={downloadNotes} className="button-primary" disabled={!html}>
                <Download size={16} />
                Download notes
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 md:p-6">
            {html ? (
              <iframe
                title={title || "Revision notes preview"}
                srcDoc={html}
                scrolling="yes"
                className="h-[78vh] w-full rounded-[1.5rem] border border-border-subtle bg-white"
              />
            ) : (
              <div className="grid h-full gap-4 md:grid-cols-2">
                {[
                  {
                    icon: BookCopy,
                    title: "What the note will contain",
                    lines: [
                      "Important keywords",
                      "Mind map",
                      "Crisp 1-page revision sheet",
                      "1 mains question with answer",
                    ],
                  },
                  {
                    icon: Map,
                    title: "Guardrails",
                    lines: [
                      "GS or Optional is chosen first",
                      "Upload is mandatory",
                      "Study chat cannot generate notes",
                      "Notes are built directly from your uploaded source",
                    ],
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="surface-panel rounded-[1.75rem] p-5">
                      <Icon className="text-navy" size={22} />
                      <h2 className="mt-4 text-xl font-semibold text-navy">{item.title}</h2>
                      <ul className="mt-3 grid gap-2 text-sm leading-7 text-copy">
                        {item.lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
