import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Checkmate", short_name: "Checkmate",
    description: "Your daily habits, one check at a time.",
    start_url: "/", scope: "/", display: "standalone",
    background_color: "#f7f8f2", theme_color: "#f7f8f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
