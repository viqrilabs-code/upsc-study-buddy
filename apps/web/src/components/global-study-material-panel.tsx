"use client";

import { Camera, FileUp, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useGlobalStudyMaterial } from "@/components/global-study-material-provider";
import { LiveCameraCaptureDialog } from "@/components/live-camera-capture-dialog";

export function GlobalStudyMaterialPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { files, appendFiles, clearFiles } = useGlobalStudyMaterial();
  const [cameraOpen, setCameraOpen] = useState(false);

  const fileSummary = useMemo(() => files.map((file) => file.name), [files]);

  function addFiles(fileList: FileList | null) {
    appendFiles(fileList ? Array.from(fileList) : []);
  }

  return (
    <>
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

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 rounded-[1.35rem] border border-border-subtle bg-white/80 p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <FileUp size={16} />
                  Upload files or saved images
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.markdown,.csv,.json,.html,.xml,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                  className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-[#18130f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff7ef]"
                />
                <span className="text-xs text-copy">
                  Supported: PDF, TXT, MD, CSV, JSON, HTML, XML, JPG, PNG, WEBP
                </span>
              </label>

              <div className="grid gap-2 rounded-[1.35rem] border border-dashed border-[#f07b17]/35 bg-[#fff9f2] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Camera size={16} />
                  Capture pages with camera
                </div>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f07b17] px-4 py-2 text-sm font-semibold text-[#fffaf4]"
                >
                  <Camera size={16} />
                  Open camera
                </button>
                <span className="text-xs text-copy">
                  This opens a live camera preview so you can snap notes, class pages, or handwritten
                  material directly into this session.
                </span>
              </div>
            </div>

            {fileSummary.length ? (
              <div className="mt-4 rounded-[1.35rem] bg-[#fff4ea] px-4 py-3 text-xs text-copy">
                {fileSummary.map((name, index) => (
                  <div key={`${name}-${index}`} className="flex items-center gap-2">
                    <FileUp size={14} className="shrink-0 text-[#d96200]" />
                    <span>{name}</span>
                  </div>
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

      <LiveCameraCaptureDialog
        open={cameraOpen}
        title="Camera capture"
        description="Point the camera at your study page and click capture. Each photo is added to global study material immediately."
        fileNamePrefix="camera-page"
        capturedItemLabel="page"
        onCapture={(file) => appendFiles([file])}
        onClose={() => setCameraOpen(false)}
      />
    </>
  );
}
