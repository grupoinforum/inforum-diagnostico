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

const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN;
const PD_API = process.env.PIPEDRIVE_API_KEY;

const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_PASS = process.env.BREVO_SMTP_PASS;

const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

async function pd(path: string, init?: RequestInit) {
  if (!PD_DOMAIN || !PD_API) throw new Error("Faltan PIPEDRIVE_DOMAIN / PIPEDRIVE_API_KEY");
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${path.includes("?") ? "&" : "?"}api_token=${PD_API}`;
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    // Propaga el error legible para verlo en el Response del cliente
    throw new Error(`Pipedrive ${path} → ${res.status} ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    // por si alguna respuesta no es JSON
    return text as any;
  }
}

async function sendConfirmation(data: Payload) {
  if (!BREVO_USER || !BREVO_PASS) {
    console.warn("Brevo SMTP no configurado. No se envía correo de confirmación.");
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

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;
    if (!data?.name || !data?.email) {
      return NextResponse.json({ ok: false, error: "Faltan nombre o email" }, { status: 400 });
    }

    // 1) Buscar/crear Persona por email
    let personId: number | null = null;
    try {
      const search = await pd(`/persons/search?term=${encodeURIComponent(data.email)}&fields=email&exact_match=true`);
      const item = (search as any)?.data?.items?.[0];
      if (item?.item?.id) personId = item.item.id;
    } catch (e) {
      console.error("[persons/search] ", (e as Error).message);
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

    // 2) (Opcional) Buscar/crear Organización (NO la usaremos para el lead por ahora)
    let orgId: number | undefined;
    if (data.company) {
      try {
        const s = await pd(`/organizations/search?term=${encodeURIComponent(data.company)}&exact_match=true`);
        const it = (s as any)?.data?.items?.[0];
        orgId = it?.item?.id;
      } catch (e) {
        console.error("[organizations/search] ", (e as Error).message);
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
          console.error("[organizations POST] ", (e as Error).message);
        }
      }
    }

    // 3) Crear Lead con el payload mínimo válido (solo title + person_id)
    //    * Quitamos value / organization_id para evitar validaciones 400.
    await pd(`/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Diagnóstico – ${data.name}`,
        person_id: personId!, // numérico
      }),
    });

    // 4) Nota con país y respuestas (la dejamos vinculada a persona + org si existiera)
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
        body: JSON.stringify({ content, person_id: personId!, org_id: orgId }),
      });
    } catch (e) {
      console.error("[notes POST] ", (e as Error).message);
    }

    // 5) Enviar correo de confirmación al contacto (no bloquea el OK)
    try {
      await sendConfirmation(data);
    } catch (e) {
      console.error("[email] ", (e as Error).message);
    }

    return NextResponse.json({ ok: true, message: "Lead creado y correo enviado" });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    // Devuelve el error real para que lo veas en Network → Response
    return NextResponse.json({ ok: false, error: e?.message || "No se logró enviar" }, { status: 500 });
  }
}
