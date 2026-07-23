import localFont from "next/font/local";

/**
 * فۆنتی کوردستان ٢٤ — بۆ هەموو سیستەم
 * Light + Bold (کێشی ناوەڕاست بۆ Bold دەچێت)
 */
export const kurdistan24 = localFont({
  src: [
    {
      path: "./kurdistan24/Kurdistan24-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./kurdistan24/Kurdistan24-Light.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./kurdistan24/Kurdistan24-Bold.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./kurdistan24/Kurdistan24-Bold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./kurdistan24/Kurdistan24-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./kurdistan24/Kurdistan24-Bold.ttf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-kurdistan24",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});
