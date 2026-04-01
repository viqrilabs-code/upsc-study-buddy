"use client";

import { SessionProvider } from "next-auth/react";
import { GlobalStudyMaterialProvider } from "@/components/global-study-material-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalStudyMaterialProvider>{children}</GlobalStudyMaterialProvider>
    </SessionProvider>
  );
}
