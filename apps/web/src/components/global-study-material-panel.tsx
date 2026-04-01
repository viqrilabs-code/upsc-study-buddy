"use client";

import { FileUp, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useGlobalStudyMaterial } from "@/components/global-study-material-provider";

export function GlobalStudyMaterialPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { files, setFiles, clearFiles } = useGlobalStudyMaterial();

  const fileSummary = useMemo(() => files.map((file) => file.name), [files]);

  function updateFiles(fileList: FileList | null) {
    setFiles(fileList ? Array.from(fileList) : []);
  }

  return (
    <section className="glass-panel rounded-[2rem] p-5 md:p-6">
      <div className={`grid gap-4 ${compact ? "xl:grid-cols-[1.15fr_0.85fr]" : "xl:grid-cols-[1.25fr_0.75fr]"}`}>
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <FileUp size={20} />
            Global study material
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-copy">
            Upload your study material once here. TamGam will attach it across Study, Mains,
            Prelims, and Current Affairs during this live session.
          </p>

          <label className="mt-4 grid gap-2 rounded-[1.35rem] border border-border-subtle bg-white/80 p-4">
            <span className="text-sm font-semibold text-ink">Upload files for the whole workspace</span>
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.markdown,.csv,.json,.html,.xml"
              onChange={(event) => updateFiles(event.target.files)}
              className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-[#18130f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff7ef]"
            />
            <span className="text-xs text-copy">
              Supported: PDF, TXT, MD, CSV, JSON, HTML, XML
            </span>
          </label>

          {fileSummary.length ? (
            <div className="mt-4 rounded-[1.35rem] bg-[#fff4ea] px-4 py-3 text-xs text-copy">
              {fileSummary.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.35rem] border border-dashed border-border-subtle bg-white/72 px-4 py-3 text-sm text-copy">
              No global study material attached yet.
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-rose/20 bg-rose/8 px-4 py-4 text-sm leading-7 text-rose">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert size={16} />
              We do not save your study material
            </div>
            <p className="mt-2">
              To avoid piracy, uploaded study material is not stored in the database, not kept as a
              permanent server file, and not treated as a user library.
            </p>
            <p className="mt-2">
              It is used temporarily during your active session and must be uploaded again after a
              fresh reload or a new session.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border-subtle bg-white/84 px-4 py-4 text-sm leading-7 text-copy">
            <div className="font-semibold text-ink">Where this gets used</div>
            <div className="mt-2">Study chat for guided teaching</div>
            <div>Mains for question framing and review context</div>
            <div>Prelims for quiz generation context</div>
            <div>Current Affairs as extra support context alongside news sources</div>
          </div>

          <div>
            <button
              type="button"
              onClick={clearFiles}
              disabled={!files.length}
              className="button-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={18} />
              Clear global study material
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

