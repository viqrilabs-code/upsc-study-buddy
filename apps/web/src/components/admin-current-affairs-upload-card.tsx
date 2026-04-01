"use client";

import { LoaderCircle, Newspaper, UploadCloud } from "lucide-react";
import { startTransition, useMemo, useState } from "react";

type PackDocument = {
  name: string;
  filteredText: string;
};

type StoredCurrentAffairsPack = {
  uploadedAt: string;
  uploadedByEmail: string;
  newspaperCount: number;
  magazineCount: number;
  newspapers: PackDocument[];
  magazines: PackDocument[];
};

type UploadResponse = {
  message?: string;
  pack?: StoredCurrentAffairsPack | null;
};

function formatDate(value: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminCurrentAffairsUploadCard({
  initialPack,
}: {
  initialPack: StoredCurrentAffairsPack | null;
}) {
  const [pack, setPack] = useState<StoredCurrentAffairsPack | null>(initialPack);
  const [newspaperFiles, setNewspaperFiles] = useState<File[]>([]);
  const [magazineFiles, setMagazineFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const uploadSummary = useMemo(() => {
    return [
      ...newspaperFiles.map((file) => `Newspaper: ${file.name}`),
      ...magazineFiles.map((file) => `Magazine: ${file.name}`),
    ];
  }, [magazineFiles, newspaperFiles]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newspaperFiles.length && !magazineFiles.length) {
      setError("Upload at least one newspaper or magazine file.");
      return;
    }

    setPending(true);
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const formData = new FormData();

        newspaperFiles.forEach((file) => {
          formData.append("newspaper", file);
        });

        magazineFiles.forEach((file) => {
          formData.append("magazine", file);
        });

        const response = await fetch("/api/admin/support/current-affairs-upload", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as UploadResponse;

        if (!response.ok) {
          throw new Error(data.message || "Unable to save the admin current affairs pack.");
        }

        setPack(data.pack || null);
        setSuccess(data.message || "Admin pack updated.");
        setNewspaperFiles([]);
        setMagazineFiles([]);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to save the admin current affairs pack.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="text-lg font-semibold text-ink">Daily current affairs source pack</div>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-copy">
        Upload the daily newspaper and UPSC magazine here. These admin sources stay hidden from
        users and are added automatically to Diya&apos;s current affairs answers.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 rounded-[1.35rem] border border-border-subtle bg-white/80 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Newspaper size={16} />
              Daily newspaper upload
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.markdown,.html,.xml"
              onChange={(event) =>
                setNewspaperFiles(event.target.files ? Array.from(event.target.files).slice(0, 3) : [])
              }
              className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-[#f07b17] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff7ef]"
            />
          </label>

          <label className="grid gap-2 rounded-[1.35rem] border border-border-subtle bg-white/80 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <UploadCloud size={16} />
              UPSC magazine upload
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.markdown,.csv,.json,.html,.xml"
              onChange={(event) =>
                setMagazineFiles(event.target.files ? Array.from(event.target.files).slice(0, 5) : [])
              }
              className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-[#18130f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff7ef]"
            />
          </label>
        </div>

        {uploadSummary.length ? (
          <div className="rounded-[1.35rem] bg-[#fff4ea] px-4 py-3 text-xs text-copy">
            {uploadSummary.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        ) : null}

        <div>
          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            Save admin current affairs pack
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.4rem] border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-[1.4rem] border border-pine/20 bg-pine/8 px-4 py-3 text-sm text-pine">
          {success}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
        <div className="text-sm font-semibold text-ink">Latest saved admin pack</div>
        {pack ? (
          <div className="mt-3 grid gap-3 text-sm text-copy">
            <div>Uploaded: {formatDate(pack.uploadedAt)}</div>
            <div>Uploaded by: {pack.uploadedByEmail}</div>
            <div>Newspapers: {pack.newspaperCount}</div>
            <div>Magazines: {pack.magazineCount}</div>
            <div className="grid gap-2 pt-2">
              {pack.newspapers.map((doc) => (
                <div key={`news-${doc.name}`} className="rounded-[1rem] bg-sand/55 px-3 py-2">
                  Newspaper: {doc.name}
                </div>
              ))}
              {pack.magazines.map((doc) => (
                <div key={`mag-${doc.name}`} className="rounded-[1rem] bg-sand/55 px-3 py-2">
                  Magazine: {doc.name}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-copy">No admin current affairs pack has been uploaded yet.</div>
        )}
      </div>
    </section>
  );
}
