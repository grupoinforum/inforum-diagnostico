import "./globals.css";
import Image from "next/image";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400","500","600","700","800"],
});

export const metadata = {
  title: "Diagnóstico • Inforum",
  description: "Cuestionario de diagnóstico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`min-h-dvh antialiased bg-brand-bg text-slate-900 ${montserrat.className}`}>

        {/* HEADER: solo logo + título, sin menú */}
        <header className="sticky top-0 z-20 bg-brand-navy text-white border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-3">
            {/* Logo siempre completo: w auto / h fija y object-contain */}
            <div className="h-9 w-auto">
              <Image
                src="/logo-inforum.svg"
                alt="Inforum"
                width={160} height={36}
                priority
                className="h-9 w-auto object-contain"
                style={{ height: "2.25rem", width: "auto" }}
              />
            </div>
            <span className="sr-only">Inforum</span>
            <div className="ml-2 leading-tight">
              <h1 className="text-base font-semibold">Diagnóstico</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>

        {/* FOOTER: banda corporativa (mismo look del header que me mostraste) */}
        <footer className="mt-12 bg-brand-navy text-white">
          {/* Franja principal */}
          <div className="mx-auto max-w-6xl px-6 py-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Columna logo + copy */}
            <div className="space-y-3">
              <div className="h-8 w-auto">
                <Image
                  src="/logo-inforum.svg"
                  alt="Inforum"
                  width={180} height={40}
                  className="h-8 w-auto object-contain"
                  style={{ height: "2rem", width: "auto" }}
                />
              </div>
              <p className="text-white/70 text-sm">
                © {new Date().getFullYear()} Inforum. Todos los derechos reservados.
              </p>
            </div>

            {/* Columna Guatemala */}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-white/90">Guatemala</p>
              <p className="text-white/75">(+502) 2477 3400</p>
              <p className="text-white/70">6a Av 7-39 zona 10, Edif. Las Brisas, Of. 302</p>
            </div>

            {/* Columna El Salvador (agrega más países según necesites) */}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-white/90">El Salvador</p>
              <p className="text-white/75">(+503) 2264 0223</p>
              <p className="text-white/70">Torre Corporativa Millennium Plaza, Col. Escalón</p>
            </div>
          </div>

          {/* Franja inferior */}
          <div className="border-t border-white/10">
            <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between text-xs text-white/60">
              <span>Inforum</span>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-brand-orange">LinkedIn</a>
                <a href="#" className="hover:text-brand-orange">Facebook</a>
                <a href="#" className="hover:text-brand-orange">YouTube</a>
              </div>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}

