import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TamGam",
    short_name: "TamGam",
    description:
      "TamGam is a UPSC preparation platform for current affairs, notes, practice, reports, and weakness-aware study loops.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7efe4",
    theme_color: "#1a1d33",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
