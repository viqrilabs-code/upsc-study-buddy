import { RevisionNotesStudio } from "@/components/revision-notes-studio";
import { buildMetadata } from "@/lib/metadata";
import { pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "1-Pager Revision Notes",
  description: pageDescriptions.notes,
});

export default function NotesPage() {
  return <RevisionNotesStudio />;
}
