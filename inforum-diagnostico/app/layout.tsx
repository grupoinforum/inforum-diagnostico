// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Inforum · Diagnóstico",
  description: "Ir directo al cuestionario.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
              className="logo"
              priority
            />
          </div>
        </header>

        {/* CONTENIDO */}
        <main id="content" className="content-wrap">
          {children}
        </main>

        {/* FOOTER responsive */}
        <footer className="site-footer">
          <picture className="footer-picture">
            {/* móvil */}
            <source media="(max-width: 640px)" srcSet="/footer-mobile.jpg" />
            {/* tablet/desktop */}
            <img
              src="/footer-web.jpg"
              alt="Footer Inforum"
              className="footer-img"
              loading="eager"
            />
          </picture>
        </footer>
      </body>
    </html>
  );
}
