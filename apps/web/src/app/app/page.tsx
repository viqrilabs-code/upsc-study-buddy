import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ChatShell } from "@/components/chat-shell";
import { authOptions } from "@/lib/auth";
import { getOrCreateUserProfile } from "@/lib/app-db";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Workspace",
  description:
    "TamGam workspace for study chat, Mains practice, Prelims practice, current affairs, and saved performance reports.",
});

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  const profile = await getOrCreateUserProfile({
    id: session.user.id || session.user.email,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });

  return <ChatShell initialProfile={profile} />;
}
