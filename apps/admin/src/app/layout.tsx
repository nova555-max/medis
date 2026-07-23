import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { kurdistan24 } from "@/fonts";
import { ckb } from "@/lib/ckb";
import "./globals.css";

export const metadata: Metadata = {
  title: ckb.appName,
  description: ckb.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ckb" dir="rtl" suppressHydrationWarning>
      <body className={`${kurdistan24.variable} ${kurdistan24.className} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
