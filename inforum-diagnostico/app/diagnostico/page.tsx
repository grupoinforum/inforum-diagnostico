"use client";
import { Suspense } from "react";
import DiagnosticoContent from "./diagnostico-content";

export default function PageWrapper() {
  return (
    <Suspense fallback={<div>Cargando cuestionario...</div>}>
      <DiagnosticoContent />
    </Suspense>
  );
}
