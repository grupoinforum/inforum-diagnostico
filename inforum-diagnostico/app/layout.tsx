// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Inforum · Diagnóstico",
  description: "Ir directo al cuestionario.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="page-shell">
        {/* HEADER mínimo (solo logo) */}
        <header className="topbar">
          <div className="topbar__inner">
            <Image
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={36}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
        </header>

        <main className="page-container">{children}</main>

        {/* FOOTER (el tuyo con imagen) */}
        <footer className="site-footer">
          <picture>
            <source media="(max-width: 640px)" srcSet="/footer-mobile.jpg" />
            <img
              src="/footer-web.jpg"
              alt="Footer Inforum"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </picture>
        </footer>
      </body>
    </html>
  );
}

