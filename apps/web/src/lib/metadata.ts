import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
};

export function buildMetadata({
  title,
  description,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
