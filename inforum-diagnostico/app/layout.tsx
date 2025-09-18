import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inforum Diagnóstico",
  description: "Aplicación de diagnóstico de Inforum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* HEADER (sin menú) */}
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
            <span className="text-lg font-semibold">Diagnóstico</span>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1">{children}</main>

        {/* FOOTER (banda corporativa) */}
        <footer className="bg-[#082349] text-white">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo + Derechos */}
            <div>
              <Image
                src="/logo-inforum.png"
                alt="Inforum"
                width={160}
                height={40}
                className="h-10 w-auto object-contain mb-4"
              />
              <p className="text-sm">
                © {new Date().getFullYear()} Inforum. Todos los derechos
                reservados.
              </p>
            </div>

            {/* Guatemala */}
            <div>
              <h4 className="font-semibold mb-2">Guatemala</h4>
              <p className="text-sm">(+502) 2477 3400</p>
              <p className="text-sm">
                6a Av 7-39 zona 10, Edif. Las Brisas, Of. 302
              </p>
            </div>

            {/* El Salvador */}
            <div>
              <h4 className="font-semibold mb-2">El Salvador</h4>
              <p className="text-sm">(+503) 2264 0223</p>
              <p className="text-sm">
                Torre Corporativa Millennium Plaza, Col. Escalón
              </p>
            </div>
          </div>

          {/* Línea inferior */}
          <div className="border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between text-sm text-white/70">
              <span>Inforum</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white">LinkedIn</a>
                <a href="#" className="hover:text-white">Facebook</a>
                <a href="#" className="hover:text-white">YouTube</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
