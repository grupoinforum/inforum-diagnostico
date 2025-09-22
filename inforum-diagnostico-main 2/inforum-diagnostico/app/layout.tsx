
export const metadata = {
  title: "Diagnóstico • Grupo Inforum",
  description: "Cuestionario de diagnóstico para Radiografía de Software de Gestión Empresarial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
