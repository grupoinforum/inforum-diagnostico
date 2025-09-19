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
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* HEADER */}
        <header className="bg-[#082349] text-white">
          <div className="container mx-auto flex items-center justify-between p-4">
            <Image
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={36}
              className="h-9 w-auto object-contain"
              priority
            />
            <h1 className="text-lg font-bold">Diagnóstico</h1>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-grow container mx-auto p-4">{children}</main>

        {/* FOOTER */}
        <footer className="w-full mt-auto">
          {/* Versión móvil */}
          <div className="relative w-full h-32 sm:hidden">
            <Image
              src="/footer-mobile.jpg"
              alt="Footer móvil Inforum"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>

          {/* Versión web */}
          <div className="relative w-full hidden sm:block h-44 md:h-52 lg:h-60">
            <Image
              src="/footer-web.jpg"
              alt="Footer web Inforum"
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

