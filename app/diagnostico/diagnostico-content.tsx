// app/diagnostico/diagnostico-content.tsx
"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/* =========================
   PREGUNTAS (7)
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
      { value: "servicios", label: "Servicios", score: 1 },
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
      { value: "msdynamics", label: "Microsoft Dynamics", score: 1 },
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
    id: "protecnologia",
    label: "¿La empresa es pro-tecnología?",
    type: "single" as const,
    options: [
      { value: "si", label: "Sí", score: 2 },
      { value: "no", label: "No", score: 1 },
    ],
    required: true,
  },
] as const;

type Answer = { id: string; value: string; score: 1 | 2; extraText?: string };

const COUNTRIES = [
  { value: "GT", label: "Guatemala" },
  { value: "SV", label: "El Salvador" },
  { value: "HN", label: "Honduras" },
  { value: "PA", label: "Panamá" },
  { value: "DO", label: "República Dominicana" },
  { value: "EC", label: "Ecuador" },
] as const;

type CountryValue = typeof COUNTRIES[number]["value"];

const FREE_EMAIL_DOMAINS = [
  "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com","proton.me","aol.com","live.com","msn.com"
];

function isCorporateEmail(email: string) {
  const domain = email.split("@").pop()?.toLowerCase().trim();
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

/* =========================
   EVALUACIÓN
   ========================= */
const SUCCESS_TEXT = `¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30min para presentarnos y realizar unas últimas dudas para guiarte de mejor manera. Acabamos de enviarte un correo con esta información.`;
const FULL_TEXT = `¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. Acabamos de enviar un correo a tu bandeja de entrada para compartirte más información sobre nosotros. Te estaremos contactando al liberar espacio.`;

function evaluate(finalAnswers: Answer[]) {
  const score1Count = finalAnswers.filter(a => a.score === 1).length;
  const qualifies = score1Count <= 3;
  const resultText = qualifies ? "Si califica" : "No hay cupo";
  const uiText = qualifies ? SUCCESS_TEXT : FULL_TEXT;
  return { qualifies, resultText, uiText };
}

/* =========================
   API HELPER
   ========================= */
async function submitDiagnostico(payload: any) {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `Error ${res.status}`);
  return json;
}

/* =========================
   COMPONENTE
   ========================= */
export default function DiagnosticoContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>({});
  const [form, setForm] = useState<{ name: string; company: string; email: string; country: CountryValue; consent: boolean; }>({ name: "", company: "", email: "", country: "GT", consent: false });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultUI, setResultUI] = useState<null | { qualifies: boolean; title: string; message: string }>(null);

  const utms = useMemo(() => {
    const keys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;
    const x: Record<string,string> = {};
    keys.forEach(k => { const v = searchParams.get(k); if (v) x[k] = v; });
    return x;
  }, [searchParams]);

  const progressPct = useMemo(() => (step / 3) * 100, [step]);

  const handleSelect = (qid: string, optionValue: string) => {
    const q = QUESTIONS.find(q => q.id === qid)!;
    const opt = q.options.find(o => o.value === optionValue)!;
    setAnswers(prev => ({ ...prev, [qid]: { id: qid, value: optionValue, score: (opt.score as 1|2) } }));
  };

  const canContinueQuestions = useMemo(() => QUESTIONS.every(q => !!answers[q.id]), [answers]);
  const canContinueData = useMemo(() =>
    form.name.trim().length > 1 && form.company.trim().length > 1 && /.+@.+\..+/.test(form.email) && isCorporateEmail(form.email),
    [form]
  );

  const onSubmit = async () => {
    setErrorMsg(null);
    if (!form.consent) { setErrorMsg("Debes aceptar el consentimiento para continuar."); return; }
    setLoading(true);

    try {
      const finalAnswers = Object.values(answers).filter(Boolean) as Answer[];
      const { qualifies, resultText, uiText } = evaluate(finalAnswers);
      const countryLabel = COUNTRIES.find(c => c.value === form.country)?.label || form.country;

      await submitDiagnostico({
        name: form.name,
        company: form.company,
        email: form.email,
        country: countryLabel,
        answers: { utms, items: finalAnswers },
        qualifies,
        resultText,
      });

      setResultUI({ qualifies, title: resultText, message: uiText });
    } catch (e: any) {
      setErrorMsg(e?.message || "No se logró enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RESULTADO
     ========================= */
  if (resultUI) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="w-full h-2 bg-gray-200 rounded mb-6">
          <div className="h-2 bg-blue-500 rounded" style={{ width: "100%" }} />
        </div>

        <h1 className="text-2xl font-semibold mb-3">{resultUI.title}</h1>
        <p className="whitespace-pre-line text-gray-800 leading-relaxed">{resultUI.message}</p>

        {/* Botones responsivos */}
        <div className="mt-6 flex flex-col sm:flex-row sm:space-x-4 gap-3">
          <a
            href="https://www.grupoinforum.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-5 py-3 rounded-2xl bg-[#082a49] text-white"
          >
            Visita nuestro website
          </a>

          {resultUI.qualifies && (
            <a
              href="https://wa.me/50242170962?text=Hola%2C%20vengo%20del%20diagn%C3%B3stico"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-5 py-3 rounded-2xl bg-blue-600 text-white"
            >
              Ir a WhatsApp
            </a>
          )}
        </div>
      </main>
    );
  }

  /* =========================
     FORMULARIO
     ========================= */
  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Barra de progreso */}
      <div className="w-full h-2 bg-gray-200 rounded mb-6">
        <div className="h-2 bg-blue-500 rounded transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <h1 className="text-2xl font-semibold mb-4">Diagnóstico para Radiografía de Software de Gestión Empresarial</h1>
      <p className="text-gray-600 mb-4">Completa el cuestionario y conoce tu resultado al instante.</p>
      {errorMsg && <p className="text-sm text-red-600 mb-4">{errorMsg}</p>}

      {/* Paso 1 */}
      {step === 1 && (
        <section className="space-y-6">
          {QUESTIONS.map(q => (
            <div key={q.id} className="p-4 rounded-2xl border border-gray-200">
              <label className="font-medium block mb-3">{q.label}</label>
              <div className="space-y-2">
                {q.options.map(o => (
                  <div key={o.value} className="flex items-center gap-3">
                    <input
                      type="radio"
                      id={`${q.id}_${o.value}`}
                      name={q.id}
                      onChange={() => handleSelect(q.id, o.value)}
                      checked={answers[q.id]?.value === o.value}
                    />
                    <label htmlFor={`${q.id}_${o.value}`} className="cursor-pointer">{o.label}</label>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canContinueQuestions}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <section className="space-y-4">
          <div>
            <label className="block mb-1">Nombre</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1">Empresa</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1">Correo empresarial</label>
            <input className="w-full border rounded-xl px-3 py-2" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            {form.email && !isCorporateEmail(form.email) && (
              <p className="text-sm text-red-600">Usa un correo corporativo.</p>
            )}
          </div>
          <div>
            <label className="block mb-1">País</label>
            <select className="w-full border rounded-xl px-3 py-2" value={form.country} onChange={e => setForm({ ...form, country: e.target.value as CountryValue })}>
              {COUNTRIES.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-2xl border">Atrás</button>
            <button onClick={() => setStep(3)} disabled={!canContinueData} className="px-5 py-3 rounded-2xl bg-blue-600 text-white disabled:opacity-50">Siguiente</button>
          </div>
        </section>
      )}

      {/* Paso 3 */}
      {step === 3 && (
        <section className="space-y-4">
          <div className="p-4 rounded-2xl border border-gray-200">
            <label className="flex gap-3">
              <input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} />
              <span>
                Autorizo a Grupo Inforum a contactarme respecto a esta evaluación y servicios relacionados.{" "}
                <span className="font-medium">Política de Privacidad</span>
              </span>
            </label>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-5 py-3 rounded-2xl border">Atrás</button>
            <button onClick={onSubmit} disabled={loading || !form.consent} className="px-5 py-3 rounded-2xl bg-blue-600 text-white disabled:opacity-50">
              {loading ? "Enviando..." : "Haz clic para conocer tu resultado"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
