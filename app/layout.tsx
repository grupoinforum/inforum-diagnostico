// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Inforum · Diagnóstico",
  description: "Cuestionario de diagnóstico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
        {/* HEADER con logo */}
        <header className="max-w-5xl mx-auto w-full px-4 py-4 flex items-center gap-3">
          <Image
            src="/logo-inforum.png"
            alt="Inforum"
            width={160}
            height={40}
            priority
          />
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4">
          {children}
        </main>

        {/* FOOTER responsive */}
        <footer className="max-w-5xl mx-auto w-full px-4 py-8">
          {/* Desktop */}
          <div className="hidden md:block">
            <Image
              src="/footer-web.jpg"
              alt="Footer Inforum"
              width={1200}
              height={240}
              className="w-full h-auto rounded-2xl"
            />
          </div>
          {/* Mobile */}
          <div className="block md:hidden">
            <Image
              src="/footer-mobile.jpg"
              alt="Footer Inforum móvil"
              width={600}
              height={200}
              className="w-full h-auto rounded-2xl"
            />
          </div>
        </footer>
      </body>
    </html>
  );
}
