import "./globals.css";
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
        {/* HEADER estilo 2 */}
        <header className="sticky top-0 z-20 bg-brand-navy text-white border-b border-white/10 shadow-header">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Reemplaza por tu logo real en /public/logo-inforum.svg */}
              <div className="size-9 rounded-xl bg-gradient-to-br from-brand-slate to-brand-navy" />
              <div className="leading-tight">
                <p className="text-[11px] uppercase tracking-widest text-white/60">Inforum</p>
                <h1 className="text-base font-semibold">Diagnóstico</h1>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="/" className="hover:text-brand-orange transition">Inicio</a>
              <a href="/diagnostico" className="hover:text-brand-orange transition">Formulario</a>
              <a href="https://www.linkedin.com/company/grupo-inforum" className="hover:text-brand-orange transition">LinkedIn</a>
            </nav>
            <a href="/diagnostico" className="btn-primary hidden sm:inline-flex">Comenzar</a>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>

        {/* FOOTER corporativo */}
        <footer className="mt-12 bg-brand-navy text-white">
          <div className="mx-auto max-w-6xl px-6 py-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-brand-slate" />
                <span className="text-lg font-semibold">inforum</span>
              </div>
              <p className="text-white/70 text-sm">
                © {new Date().getFullYear()} Inforum. Todos los derechos reservados.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-white/90">Guatemala</p>
              <p className="text-white/70">(+502) 2477 3400</p>
              <p className="text-white/70">6av 7-39 zona 10, Edif. Las Brisas, Of. 302</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-white/90">El Salvador</p>
              <p className="text-white/70">(+503) 2264 0223</p>
              <p className="text-white/70">Torre Corporativa Millennium Plaza, Col. Escalón</p>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between text-xs text-white/60">
              <span>Síguenos</span>
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
