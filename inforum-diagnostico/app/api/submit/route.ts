// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// ---- Tipos ---------------------------------------------------
type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string;          // acepta código (GT) o nombre ("Guatemala")
  answers?: any;             // { items: [...], utms: {...} } o lo que envíes
};

// ---- Env -----------------------------------------------------
const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;
const PD_API = process.env.PIPEDRIVE_API_KEY!;

const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";
const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_PASS = process.env.BREVO_SMTP_PASS;

// Pipelines por país
const PD_PIPELINE = {
  GT: Number(process.env.PD_PIPELINE_GT || 1),
  SV: Number(process.env.PD_PIPELINE_SV || 2),
  HN: Number(process.env.PD_PIPELINE_HN || 3),
  DO: Number(process.env.PD_PIPELINE_DO || 4),
  EC: Number(process.env.PD_PIPELINE_EC || 5),
  PA: Number(process.env.PD_PIPELINE_PA || 6),
};

// Stage “Capa 1” por país
const PD_STAGE_CAPA1 = {
  GT: Number(process.env.PD_STAGE_GT_CAPA1 || 6),
  SV: Number(process.env.PD_STAGE_SV_CAPA1 || 7),
  HN: Number(process.env.PD_STAGE_HN_CAPA1 || 13),
  DO: Number(process.env.PD_STAGE_DO_CAPA1 || 19),
  EC: Number(process.env.PD_STAGE_EC_CAPA1 || 25),
  PA: Number(process.env.PD_STAGE_PA_CAPA1 || 31),
};

// ---- Helpers -------------------------------------------------
async function pd(path: string, init?: RequestInit) {
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${
    path.includes("?") ? "&" : "?"
  }api_token=${PD_API}`;

  const res = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Pipedrive ${path} → ${res.status} ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text as any;
  }
}

/** Normaliza el país recibido a código de 2 letras que esperamos en ENV */
function normalizeCountry(input?: string): keyof typeof PD_PIPELINE {
  if (!input) return "GT"; // default
  const x = input.trim().toUpperCase();

  // ya viene como código
  if (["GT", "SV", "HN", "PA", "DO", "EC"].includes(x)) return x as any;

  // viene como nombre
  const map: Record<string, keyof typeof PD_PIPELINE> = {
    GUATEMALA: "GT",
    "EL SALVADOR": "SV",
    SALVADOR: "SV",
    HONDURAS: "HN",
    PANAMÁ: "PA",
    PANAMA: "PA",
    "REPÚBLICA DOMINICANA": "DO",
    REPUBLICA DOMINICANA: "DO",
    ECUADOR: "EC",
  };
  return map[x] ?? "GT";
}

async function sendConfirmation(data: Payload) {
  if (!BREVO_USER || !BREVO_PASS) {
    console.warn("[email] Brevo SMTP no configurado. Se omite envío.");
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
}

// ---- Handler -------------------------------------------------
export async function POST(req: Request) {
  try {
    if (!PD_DOMAIN || !PD_API) {
      throw new Error("Faltan PIPEDRIVE_DOMAIN o PIPEDRIVE_API_KEY");
    }

    const data = (await req.json()) as Payload;
    if (!data?.name || !data?.email) {
      return NextResponse.json(
        { ok: false, error: "Faltan nombre o email" },
        { status: 400 }
      );
    }

    // 1) Buscar/crear Persona por email
    let personId: number | null = null;
    try {
      const search = await pd(
        `/persons/search?term=${encodeURIComponent(
          data.email
        )}&fields=email&exact_match=true`
      );
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

    // 2) (Opcional) Buscar/crear Organización
    let orgId: number | undefined;
    if (data.company) {
      try {
        const s = await pd(
          `/organizations/search?term=${encodeURIComponent(
            data.company
          )}&exact_match=true`
        );
        const it = (s as any)?.data?.items?.[0];
        orgId = it?.item?.id;
      } catch (e) {
        console.error("[organizations/search]", (e as Error).message);
      }
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

    // 3) Resolver pipeline/stage según país
    const cc = normalizeCountry(data.country);
    const pipeline_id = PD_PIPELINE[cc];
    const stage_id = PD_STAGE_CAPA1[cc];

    // 4) Crear DEAL directamente en “Capa 1” del pipeline correspondiente
    const dealRes = await pd(`/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Diagnóstico – ${data.name}`,
        person_id: personId!,
        org_id: orgId,
        pipeline_id,
        stage_id,
        value: 0,
        currency: "USD",
        visible_to: 3, // 3=entera la compañía (opcional)
      }),
    });
    const dealId = (dealRes as any)?.data?.id;

    // 5) Nota con país y respuestas (la ligamos al deal si existe)
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
        body: JSON.stringify({
          content,
          person_id: personId!,
          org_id: orgId,
          deal_id: dealId,
        }),
      });
    } catch (e) {
      console.error("[notes POST]", (e as Error).message);
    }

    // 6) Enviar correo de confirmación (no bloquea el OK)
    try {
      await sendConfirmation(data);
    } catch (e) {
      console.error("[email]", (e as Error).message);
    }

    return NextResponse.json({
      ok: true,
      message: "Deal creado en Capa 1 y correo enviado",
      countryCode: cc,
      pipeline_id,
      stage_id,
    });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se logró enviar" },
      { status: 500 }
    );
  }
}
