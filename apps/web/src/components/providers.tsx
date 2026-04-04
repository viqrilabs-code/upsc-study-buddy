"use client";

import { SessionProvider } from "next-auth/react";
import { GlobalStudyMaterialProvider } from "@/components/global-study-material-provider";
import { HostRedirector } from "@/components/host-redirector";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HostRedirector />
      <GlobalStudyMaterialProvider>{children}</GlobalStudyMaterialProvider>
    </SessionProvider>
  );
}
