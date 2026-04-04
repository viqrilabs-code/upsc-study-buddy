"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { dedupeSelectedFiles, mergeSelectedFiles } from "@/lib/file-selection";

type GlobalStudyMaterialContextValue = {
  files: File[];
  setFiles: (files: File[]) => void;
  appendFiles: (files: File[]) => void;
  clearFiles: () => void;
};

const GlobalStudyMaterialContext = createContext<GlobalStudyMaterialContextValue | null>(null);

export function GlobalStudyMaterialProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [files, setFilesState] = useState<File[]>([]);

  const value = useMemo<GlobalStudyMaterialContextValue>(
    () => ({
      files,
      setFiles: (nextFiles) => setFilesState(dedupeSelectedFiles(nextFiles)),
      appendFiles: (nextFiles) =>
        setFilesState((currentFiles) => mergeSelectedFiles(currentFiles, nextFiles)),
      clearFiles: () => setFilesState([]),
    }),
    [files],
  );

  return (
    <GlobalStudyMaterialContext.Provider value={value}>
      {children}
    </GlobalStudyMaterialContext.Provider>
  );
}

export function useGlobalStudyMaterial() {
  const context = useContext(GlobalStudyMaterialContext);

  if (!context) {
    throw new Error("useGlobalStudyMaterial must be used inside GlobalStudyMaterialProvider.");
  }

  return context;
}
