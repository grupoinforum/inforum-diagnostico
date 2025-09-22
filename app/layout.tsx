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
        {/* HEADER full-width con cintillo azul */}
        <header className="w-full bg-[#082a49]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center">
            <Image
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={40}
              priority
            />
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {children}
        </main>

        {/* FOOTER full-width */}
        <footer className="w-full">
          {/* Desktop */}
          <div className="hidden md:block">
            <Image
              src="/footer-web.jpg"
              alt="Footer Inforum"
              width={1920}
              height={300}
              className="w-full h-auto"
            />
          </div>
          {/* Mobile */}
          <div className="block md:hidden">
            <Image
              src="/footer-mobile.jpg"
              alt="Footer Inforum móvil"
              width={768}
              height={200}
              className="w-full h-auto"
            />
          </div>
        </footer>
      </body>
    </html>
  );
}
