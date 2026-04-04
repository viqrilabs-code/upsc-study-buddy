export type SelectableFile = Pick<File, "name" | "size" | "type" | "lastModified">;

export function getFileSelectionKey(file: SelectableFile) {
  return [file.name, file.size, file.type, file.lastModified].join("|");
}

export function dedupeSelectedFiles<T extends SelectableFile>(files: T[]) {
  const seen = new Set<string>();

  return files.filter((file) => {
    const key = getFileSelectionKey(file);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function mergeSelectedFiles<T extends SelectableFile>(currentFiles: T[], nextFiles: T[]) {
  return dedupeSelectedFiles([...currentFiles, ...nextFiles]);
}
