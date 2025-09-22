// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type AnswerItem = {
  id: string;
  value: string;
  label?: string;
  score: 1 | 2;
  extraText?: string;
};

type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string; // etiqueta legible (ej. "Guatemala") o código (GT)
  answers?: {
    utms?: Record<string, string>;
    items?: AnswerItem[];
  };
  score1Count?: number;           // cuántas respuestas tienen score === 1
  qualifies?: boolean;            // true si ≤3
  resultText?: string;            // "Sí califica" | "No hay cupo (exhaustivo)"
};

const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;
const PD_API = process.env.PIPEDRIVE_API_KEY!;

const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_PASS = process.env.BREVO_SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "Inforum <info@inforumsol.com>";

// Pipelines por país (IDs que ya pusiste en Vercel)
const PIPELINES = {
  GT: Number(process.env.PD_PIPELINE_GT ?? 1),
  SV: Number(process.env.PD_PIPELINE_SV ?? 2),
  HN: Number(process.env.PD_PIPELINE_HN ?? 3),
  DO: Number(process.env.PD_PIPELINE_DO ?? 4),
  EC: Number(process.env.PD_PIPELINE_EC ?? 5),
  PA: Number(process.env.PD_PIPELINE_PA ?? 6),
} as const;

// Etapa “Capa 1” por país (IDs que ya pusiste en Vercel)
const STAGE_CAPA1 = {
  GT: Number(process.env.PD_STAGE_GT_CAPA1 ?? 6),
  SV: Number(process.env.PD_STAGE_SV_CAPA1 ?? 7),
  HN: Number(process.env.PD_STAGE_HN_CAPA1 ?? 13),
  DO: Number(process.env.PD_STAGE_DO_CAPA1 ?? 19),
  EC: Number(process.env.PD_STAGE_EC_CAPA1 ?? 25),
  PA: Number(process.env.PD_STAGE_PA_CAPA1 ?? 31),
} as const;

// (opcional) Moneda por país
const CURRENCY_BY_CC: Record<keyof typeof PIPELINES, string> = {
  GT: "GTQ",
  SV: "USD",
  HN: "HNL",
  DO: "DOP",
  EC: "USD",
  PA: "USD",
};

// Normaliza etiqueta país -> código ISO que usamos en los mapas
function countryToCode(label?: string): keyof typeof PIPELINES {
  if (!label) return "GT";
  const x = label.trim().toUpperCase();
  if (["GT", "SV", "HN", "DO", "EC", "PA"].includes(x)) return x as any;

  const MAP: Record<string, keyof typeof PIPELINES> = {
    "GUATEMALA": "GT",
    "EL SALVADOR": "SV",
    "HONDURAS": "HN",
    "PANAMÁ": "PA",
    "PANAMA": "PA",
    "REPÚBLICA DOMINICANA": "DO",
    "REPUBLICA DOMINICANA": "DO",
    "ECUADOR": "EC",
  };
  return MAP[x] ?? "GT";
}

async function pd(path: string, init?: RequestInit) {
  if (!PD_DOMAIN || !PD_API) {
    throw new Error("Pipedrive no configurado (PIPEDRIVE_DOMAIN / PIPEDRIVE_API_KEY).");
  }
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${path.includes("?") ? "&" : "?"}api_token=${PD_API}`;
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Pipedrive ${path} → ${res.status} ${text}`);
  try { return JSON.parse(text); } catch { return text as any; }
}

/* =========================
   EMAILS (Brevo via SMTP)
   ========================= */
function emailBody(qualifies: boolean) {
  if (qualifies) {
    return `¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. 
Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30min para presentarnos y realizar unas últimas dudas para guiarte de mejor manera. 
Acabamos de enviarte un correo con esta información.

Visítanos: www.grupoinforum.com`;
  }
  return `¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. 
Acabamos de enviarte un correo a tu bandeja de entrada para compartirte más información sobre nosotros. 
Te estaremos contactando al liberar espacio.

Visítanos: www.grupoinforum.com`;
}

function emailSubject(qualifies: boolean) {
  return qualifies
    ? "¡Estás a 1 paso de tu asesoría sin costo! – Grupo Inforum"
    : "Gracias por tu diagnóstico – Grupo Inforum";
}

async function sendConfirmation(toEmail: string, qualifies: boolean) {
  if (!BREVO_USER || !BREVO_PASS) {
    console.warn("Brevo SMTP no configurado. No se envía correo.");
    return;
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: { user: BREVO_USER, pass: BREVO_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    to: toEmail,
    subject: emailSubject(qualifies),
    text: emailBody(qualifies),
  });
  console.log(`✅ Correo enviado a: ${toEmail} (qualifies=${qualifies})`);
}

/* =========================
   HANDLER
   ========================= */
export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;

    if (!data?.name || !data?.email) {
      return NextResponse.json({ ok: false, error: "Faltan nombre o email" }, { status: 400 });
    }

    // Derivados
    const cc = countryToCode(data.country);
    const pipeline_id = PIPELINES[cc];
    const stage_id = STAGE_CAPA1[cc];
    const currency = CURRENCY_BY_CC[cc] || "USD";

    // Si el front no mandó estos campos (edge case), los calculamos rápido
    let qualifies = !!data.qualifies;
    let score1Count = data.score1Count ?? 0;
    let resultText = data.resultText;
    if (!data.qualifies || data.score1Count == null || !data.resultText) {
      const items = data.answers?.items || [];
      score1Count = items.filter((a: any) => a?.score === 1).length;
      qualifies = score1Count <= 3;
      resultText = qualifies ? "Sí califica" : "No hay cupo (exhaustivo)";
    }

    /* 1) Persona (buscar por email o crear) */
    let personId: number | null = null;
    try {
      const search = await pd(`/persons/search?term=${encodeURIComponent(data.email)}&fields=email&exact_match=true`);
      const item = (search as any)?.data?.items?.[0];
      if (item?.item?.id) personId = item.item.id;
    } catch (e) {
      console.error("[persons/search]", (e as Error).message);
    }
    if (!personId) {
      const created = await pd(`/persons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: [{ value: data.email, primary: true, label: "work" }],
        }),
      });
      personId = (created as any)?.data?.id;
    }

    /* 2) Organización opcional */
    let orgId: number | undefined;
    if (data.company) {
      try {
        const s = await pd(`/organizations/search?term=${encodeURIComponent(data.company)}&exact_match=true`);
        const it = (s as any)?.data?.items?.[0];
        orgId = it?.item?.id;
      } catch {}
      if (!orgId) {
        try {
          const o = await pd(`/organizations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.company }),
          });
          orgId = (o as any)?.data?.id;
        } catch (e) {
          console.error("[organizations POST]", (e as Error).message);
        }
      }
    }

    /* 3) DEAL en Capa 1 del pipeline correcto (NO /leads) */
    console.log(`[Deals] Creando deal → cc=${cc} pipeline=${pipeline_id} stage=${stage_id} qualifies=${qualifies}`);
    const deal = await pd(`/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Diagnóstico – ${data.name}`,
        person_id: personId!,
        org_id: orgId,
        pipeline_id,
        stage_id,       // Capa 1
        value: 0,
        currency,
        status: "open",
      }),
    });
    const dealId = (deal as any)?.data?.id;
    console.log(`🟢 Deal #${dealId} creado`);

    /* 4) Nota con contexto completo */
    try {
      const utms = data.answers?.utms || {};
      const items = data.answers?.items || [];
      const answersPretty =
        items.length > 0
          ? items
              .map((i: AnswerItem, idx: number) =>
                `  ${idx + 1}. ${i.id}${i.label ? ` (${i.label})` : ""} → value=${i.value}, score=${i.score}${i.extraText ? `, extra="${i.extraText}"` : ""}`
              )
              .join("\n")
          : "  (sin items)";

      const utmsPretty =
        Object.keys(utms).length > 0
          ? Object.entries(utms).map(([k, v]) => `  ${k}: ${v}`).join("\n")
          : "  (sin utms)";

      const content =
        `Formulario diagnóstico\n` +
        `• Nombre: ${data.name}\n` +
        (data.company ? `• Empresa: ${data.company}\n` : "") +
        `• Email: ${data.email}\n` +
        (data.country ? `• País: ${data.country}\n` : "") +
        `• score1Count: ${score1Count}\n` +
        `• qualifies: ${qualifies}\n` +
        `• resultText: ${resultText}\n` +
        `\nUTMs:\n${utmsPretty}\n` +
        `\nRespuestas:\n${answersPretty}\n`;

      await pd(`/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, deal_id: dealId, person_id: personId!, org_id: orgId }),
      });
    } catch (e) {
      console.error("[notes POST]", (e as Error).message);
    }

    /* 5) Confirmación por correo (según califique o no) */
    try {
      await sendConfirmation(data.email, qualifies);
    } catch (e) {
      console.error("[email]", (e as Error).message);
    }

    return NextResponse.json({
      ok: true,
      message: "Deal creado en Capa 1 y correo enviado",
      dealId,
      qualifies,
      score1Count,
      resultText,
    });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "No se logró enviar" }, { status: 500 });
  }
}
