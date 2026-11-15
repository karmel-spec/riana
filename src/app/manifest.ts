import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Greene Family Binder",
    short_name: "Greene Binder",
    description: "A private home for everything the Greene family needs to care for Rich and Diana.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4eee2",
    theme_color: "#2f5141",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
