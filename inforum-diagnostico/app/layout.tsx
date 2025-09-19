// app/layout.tsx
import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inforum Diagnóstico",
  description: "Ir directo al cuestionario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* HEADER */}
        <header className="bg-[#082349] text-white">
          <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-3">
            <Image
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
            <h1 className="text-lg font-semibold">Diagnóstico</h1>
          </div>
        </header>

        {/* CONTENIDO: añade padding-bottom para que el botón no choque con el footer */}
        <main className="flex-grow pb-24 sm:pb-28 md:pb-32">{children}</main>

        {/* FOOTER: altura responsive más baja en móvil */}
        <footer className="w-full mt-auto">
          {/* Contenedor con altura distinta por breakpoint */}
          <div className="relative w-full h-24 sm:h-36 md:h-48 lg:h-60">
            <Image
              src="/footer-web.jpg"
              alt="Footer Inforum"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        </footer>
      </body>
    </html>
  );
}

