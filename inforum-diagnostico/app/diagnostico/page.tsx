import { Suspense } from "react";
import DiagnosticoContent from "./diagnostico-content";

// ✅ Este config SÓLO funciona si el archivo es Server Component (sin "use client")
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando cuestionario...</div>}>
      <DiagnosticoContent />
    </Suspense>
  );
}
