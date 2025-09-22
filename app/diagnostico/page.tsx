// app/diagnostico/page.tsx
import { Suspense } from "react";
import DiagnosticoContent from "./diagnostico-content";

// Forzar siempre render dinámico
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando cuestionario...</div>}>
      <DiagnosticoContent />
    </Suspense>
  );
}
