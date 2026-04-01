export type RevisionNoteDocument = {
  title: string;
  strapline: string;
  trackLabel: string;
  subjectLabel: string;
  topicLabel: string;
  sourceNames: string[];
  keywords: string[];
  mindMapNodes: string[];
  onePageRevision: string;
  mainsQuestion: string;
  mainsAnswerLines: string[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function toListItems(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

export function renderRevisionNoteHtml(note: RevisionNoteDocument) {
  const keywords = note.keywords
    .map((keyword) => `<span class="tag">${escapeHtml(keyword)}</span>`)
    .join("");

  const mindMap = note.mindMapNodes
    .map(
      (node, index) => `
        <div class="flow-box ${index === 0 ? "dark" : index % 2 === 0 ? "mid" : ""}">${escapeHtml(node)}</div>
        ${index < note.mindMapNodes.length - 1 ? '<div class="flow-arrow">&rarr;</div>' : ""}
      `,
    )
    .join("");

  const revisionParagraphs = toParagraphs(note.onePageRevision)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");

  const sourceLabel = note.sourceNames.length
    ? escapeHtml(note.sourceNames.join(", "))
    : "Uploaded syllabus material";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(note.title)} - 1-pager revision notes</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  :root { --gold:#C9A84C; --gold-light:#F0D98A; --gold-pale:#FDF5DC; --navy:#0D1B3E; --navy-mid:#1A2F5A; --navy-light:#2A4080; --cream:#FEFBF3; --muted:#8B8070; --red:#8B1A1A; --border:#E2D5B0; --green:#1F5A3A; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--cream); color: var(--navy); font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.35; position: relative; overflow: auto; min-height: 100vh; }
  .page { max-width: 1100px; margin: 0 auto; padding: 8px 14px 6px; position: relative; z-index: 1; }
  .watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0; transform: rotate(-18deg); opacity: 0.1; user-select: none; }
  .watermark-word { font-family: Georgia, "Times New Roman", serif; font-size: 108px; font-weight: 700; letter-spacing: 1px; }
  .watermark-tam { color: #000000; }
  .watermark-gam { color: #F28C28; }
  .header { border-top: 4px solid var(--navy); border-bottom: 2px solid var(--gold); padding: 10px 0 7px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .header-title { font-family: Georgia, "Times New Roman", serif; font-size: 30px; font-weight: 700; color: var(--navy); letter-spacing: -0.5px; }
  .header-sub { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.4px; font-weight: 700; }
  .header-tag { background: var(--navy); color: var(--gold-light); font-size: 10px; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; }
  .header-meta { font-size: 10px; color: var(--muted); margin-top: 4px; max-width: 320px; text-align: right; }
  .grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 10px; margin-bottom: 10px; }
  .grid-bottom { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 10px; }
  .card { background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; }
  .card-navy { background: var(--navy); border-color: var(--navy); }
  .card-navy .card-title, .card-navy p, .card-navy li { color: #E3DDCF; }
  .card-title { font-family: Georgia, "Times New Roman", serif; font-size: 13px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1.5px solid var(--gold); padding-bottom: 4px; margin-bottom: 6px; }
  .card-navy .card-title { color: var(--gold-light); border-bottom-color: var(--gold); }
  .tag { display: inline-block; background: var(--gold-pale); border: 1px solid var(--gold); color: var(--navy); border-radius: 2px; font-size: 10px; font-weight: 700; padding: 2px 6px; margin: 2px 3px 2px 0; }
  .small-head { font-size: 10px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; margin: 6px 0 3px; }
  .flow { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin: 6px 0; }
  .flow-box { background: var(--gold-pale); border: 1px solid var(--gold); border-radius: 3px; padding: 5px 8px; font-size: 11px; font-weight: 700; color: var(--navy); text-align: center; min-width: 96px; }
  .flow-box.dark { background: var(--navy-mid); color: var(--gold-light); border-color: var(--navy-light); }
  .flow-box.mid { background: #EAF2FF; border-color: #3366CC; color: #1A3D8F; }
  .flow-arrow { color: var(--gold); font-size: 14px; font-weight: 700; }
  .highlight { background: var(--gold-pale); border-left: 3px solid var(--gold); padding: 5px 8px; border-radius: 0 3px 3px 0; font-size: 11px; margin: 5px 0; font-style: italic; color: var(--navy-mid); }
  .summary p { font-size: 12px; margin-top: 6px; }
  .summary p:first-child { margin-top: 0; }
  ul { list-style: none; }
  ul li { padding: 2px 0 2px 14px; position: relative; font-size: 11px; }
  ul li::before { content: ">"; position: absolute; left: 0; color: var(--gold); font-size: 10px; top: 3px; }
  .answer-box { background: #FBFAF3; border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; margin-top: 6px; }
  .answer-head { font-size: 11px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; }
  .source-line { font-size: 10px; color: var(--muted); margin-top: 6px; }
  .footer { margin-top: 8px; border-top: 2px solid var(--navy); padding-top: 4px; display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: var(--muted); }
  .footer b { color: var(--navy); }
</style>
</head>
<body>
  <div class="watermark" aria-hidden="true">
    <span class="watermark-word watermark-tam">Tam</span><span class="watermark-word watermark-gam">Gam</span>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <div class="header-title">${escapeHtml(note.title)}</div>
        <div class="header-sub">${escapeHtml(note.trackLabel)} | ${escapeHtml(note.subjectLabel)} | ${escapeHtml(note.topicLabel)}</div>
      </div>
      <div>
        <div class="header-tag">1-pager revision notes</div>
        <div class="header-meta">${escapeHtml(note.strapline)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Crisp 1-page revision</div>
        <div class="summary">${revisionParagraphs}</div>
        <div class="highlight">Read this once, then reproduce the chain from memory before moving to the mains answer.</div>
      </div>

      <div class="card card-navy">
        <div class="card-title">Important keywords</div>
        <div>${keywords}</div>
        <div class="small-head">Source anchor</div>
        <p>Built from your uploaded source material and compressed into quick-recall language.</p>
      </div>
    </div>

    <div class="grid-bottom">
      <div class="card">
        <div class="card-title">Mind map</div>
        <div class="flow">${mindMap}</div>
        <div class="source-line"><b>Source file(s):</b> ${sourceLabel}</div>
      </div>

      <div class="card">
        <div class="card-title">1 mains question and answer</div>
        <div class="answer-box">
          <div class="answer-head">${escapeHtml(note.mainsQuestion)}</div>
          <ul>${toListItems(note.mainsAnswerLines)}</ul>
        </div>
      </div>
    </div>

    <div class="footer">
      <div><b>Format:</b> Template-driven HTML revision sheet for quick print and repeat revision</div>
      <div><b>Use:</b> Read -> Recall -> Reproduce -> Write</div>
    </div>
  </div>
</body>
</html>`;
}
