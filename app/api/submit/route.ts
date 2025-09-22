// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string;
  answers?: any;
};

const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;
const PD_API = process.env.PIPEDRIVE_API_KEY!;

const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_PASS = process.env.BREVO_SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

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
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${path.includes("?") ? "&" : "?"}api_token=${PD_API}`;
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Pipedrive ${path} → ${res.status} ${text}`);
  try { return JSON.parse(text); } catch { return text as any; }
}

async function sendConfirmation(data: Payload) {
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

  const text = `¡Gracias por completar tu diagnóstico!

Hemos recibido tus datos correctamente.
Rita Muralles de nuestro equipo se estará comunicando pronto contigo para darte seguimiento.

— Grupo Inforum`;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: data.email,
    subject: "Confirmación de recepción - Grupo Inforum",
    text,
  });
  console.log(`✅ Correo enviado a: ${data.email}`);
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;
    if (!data?.name || !data?.email) {
      return NextResponse.json({ ok: false, error: "Faltan nombre o email" }, { status: 400 });
    }

    const cc = countryToCode(data.country);
    const pipeline_id = PIPELINES[cc];
    const stage_id = STAGE_CAPA1[cc];

    // 1) Persona (buscar por email o crear)
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

    // 2) Organización opcional
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

    // 3) DEAL en Capa 1 del pipeline correcto (NO /leads)
    console.log(`[Deals] Creando deal → cc=${cc} pipeline=${pipeline_id} stage=${stage_id}`);
    const deal = await pd(`/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Diagnóstico – ${data.name}`,
        person_id: personId!,
        org_id: orgId,
        pipeline_id,
        stage_id,          // Capa 1
        value: 0,
        currency: "GTQ",   // cámbialo si quieres por país
      }),
    });
    const dealId = (deal as any)?.data?.id;
    console.log(`🟢 Deal creado #${dealId} en pipeline ${pipeline_id}, stage ${stage_id}`);

    // 4) Nota con contexto
    try {
      const content =
        `Formulario diagnóstico\n` +
        `• Nombre: ${data.name}\n` +
        (data.company ? `• Empresa: ${data.company}\n` : "") +
        `• Email: ${data.email}\n` +
        (data.country ? `• País: ${data.country}\n` : "") +
        (data.answers ? `\nRespuestas:\n${JSON.stringify(data.answers, null, 2)}` : "");
      await pd(`/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, deal_id: dealId, person_id: personId!, org_id: orgId }),
      });
    } catch (e) {
      console.error("[notes POST]", (e as Error).message);
    }

    // 5) Confirmación por correo (no bloqueante)
    try { await sendConfirmation(data); } catch (e) { console.error("[email]", (e as Error).message); }

    return NextResponse.json({ ok: true, message: "Deal creado en Capa 1 y correo enviado" });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "No se logró enviar" }, { status: 500 });
  }
}
