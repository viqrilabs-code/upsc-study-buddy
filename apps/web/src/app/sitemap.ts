import type { MetadataRoute } from "next";

const routes = [
  "",
  "/about",
  "/contact",
  "/current-affairs",
  "/dashboard",
  "/help",
  "/notes",
  "/pricing",
  "/privacy",
  "/pyqs",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://upsc-study-buddy.example${route}`,
    lastModified: new Date(),
  }));
}
