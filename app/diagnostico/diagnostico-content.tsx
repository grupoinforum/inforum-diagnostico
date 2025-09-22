// app/diagnostico/diagnostico-content.tsx
"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/* =========================
   CONFIGURACIÓN DEL TEST (7)
   ========================= */
const QUESTIONS = [
  {
    id: "industria",
    label: "¿En qué industria opera la compañía?",
    type: "single" as const,
    options: [
      { value: "produccion", label: "Producción", score: 2 },
      { value: "distribucion", label: "Distribución", score: 2 },
      { value: "retail", label: "Retail", score: 2 },
      { value: "servicios", label: "Servicios", score: 2 },
      { value: "otro", label: "Otro (especificar)", score: 1, requiresText: true },
    ],
    required: true,
  },
  {
    id: "erp",
    label: "¿Qué sistema empresarial (ERP) utiliza actualmente su empresa?",
    type: "single" as const,
    options: [
      { value: "sapb1", label: "SAP Business One", score: 2 },
      { value: "odoo", label: "Odoo", score: 2 },
      { value: "oracle", label: "Oracle", score: 2 },
      { value: "msdynamics", label: "Microsoft Dynamics", score: 2 },
      { value: "sistema_propio", label: "Sistema Propio", score: 2 },
      { value: "erp_otro", label: "Otro (especificar)", score: 2, requiresText: true },
    ],
    required: true,
  },
  {
    id: "personas",
    label: "¿Cuántas personas dependen del sistema para su trabajo diario?",
    type: "single" as const,
    options: [
      { value: ">20", label: "+20 personas", score: 2 },
      { value: "<=20", label: "-20 personas", score: 1 },
    ],
    required: true,
  },
  {
    id: "paises",
    label: "¿La compañía opera en 1 o varios países?",
    type: "single" as const,
    options: [
      { value: "1", label: "1 país", score: 1 },
      { value: ">1", label: "Varios países", score: 2 },
    ],
    required: true,
  },
  {
    id: "lineas",
    label: "¿Cuántas líneas de negocio tiene la compañía?",
    type: "single" as const,
    options: [
      { value: "1", label: "1 línea de negocio", score: 1 },
      { value: ">1", label: "Múltiples líneas de negocio", score: 2 },
    ],
    required: true,
  },
  {
    id: "satisfaccion",
    label: "¿Nivel de satisfacción con el sistema actual?",
    type: "single" as const,
    options: [
      { value: "1-3", label: "1-3 (insatisfecho)", score: 2 },
      { value: "4-6", label: "4-6 (puede mejorar)", score: 2 },
      { value: "7-10", label: "7-10 (cumple)", score: 1 },
    ],
    required: true,
  },
  {
    id: "pro_tecnologia",
    label: "¿La empresa es pro-tecnología?",
