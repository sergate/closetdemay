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
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
