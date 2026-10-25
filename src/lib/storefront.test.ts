import { describe, expect, it } from "vitest";
import { availableSizes, matchesSearch, orderLink, type PublicProduct } from "./storefront";

const product: PublicProduct = {
  code: "V-014",
  name: "Vestido floral",
  price: 18,
  wholesalePrice: 12,
  wholesaleMin: 6,
  image: "",
  sizes: [{ size: "S", stock: 0 }, { size: "M", stock: 3 }],
};

describe("tienda pública", () => {
  it("solo ofrece tallas con stock", () => {
    expect(availableSizes(product)).toEqual([{ size: "M", stock: 3 }]);
  });

  it("busca por nombre o código sin importar mayúsculas", () => {
    expect(matchesSearch(product, "flor")).toBe(true);
    expect(matchesSearch(product, "v-014")).toBe(true);
    expect(matchesSearch(product, "jean")).toBe(false);
    expect(matchesSearch(product, "  ")).toBe(true);
  });

  it("arma el enlace de pedido o devuelve null sin WhatsApp válido", () => {
    const url = orderLink("099 123 4567", product, "M", false)!;
    expect(url.startsWith("https://wa.me/593991234567?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("V-014 Vestido floral en talla M");
    expect(decodeURIComponent(orderLink("0991234567", product, "M", true)!)).toContain("por mayor");
    expect(orderLink("", product, "M", false)).toBeNull();
  });
});
