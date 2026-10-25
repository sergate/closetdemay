import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "El Closet de May",
    short_name: "Closet de May",
    description: "Panel de ventas en vivo",
    start_url: "/vivo",
    display: "standalone",
    background_color: "#fbf6f7",
    theme_color: "#b0245a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
