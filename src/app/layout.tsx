import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JBL Facilita",
  description: "Portal do Grupo JBL Incorporadora",
  icons: { icon: "/brand/logo-vertical.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
