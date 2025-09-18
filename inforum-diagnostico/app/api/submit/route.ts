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
  if (!PD_DOMAIN || !PD_API) throw new Error("Faltan variables de Pipedrive (PIPEDRIVE_DOMAIN / PIPEDRIVE_API_KEY)");
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${path.includes("?") ? "&" : "?"}api_token=${PD_API}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Pipedrive ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
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
    to: data.email, // le llega directo al contacto
    subject: "Confirmación de recepción - Grupo Inforum",
    text, // mensaje en texto sencillo
  });
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;
    if (!data?.name || !data?.email) {
      return NextResponse.json({ ok: false, error: "Faltan nombre o email" }, { status: 400 });
    }

    // 1) Buscar/crear Persona
    let personId: number | null = null;
    try {
      const search = await pd(
        `/persons/search?term=${encodeURIComponent(data.email)}&fields=email&exact_match=true`
      );
      const item = search?.data?.items?.[0];
      if (item?.item?.id) personId = item.item.id;
    } catch {}
    if (!personId) {
      const created = await pd(`/persons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: [{ value: data.email, primary: true, label: "work" }],
        }),
      });
      personId = created?.data?.id;
    }

    // 2) Buscar/crear Organización
    let orgId: number | undefined;
    if (data.company) {
      try {
        const s = await pd(`/organizations/search?term=${encodeURIComponent(data.company)}&exact_match=true`);
        const it = s?.data?.items?.[0];
        orgId = it?.item?.id;
      } catch {}
      if (!orgId) {
        const o = await pd(`/organizations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.company }),
        });
        orgId = o?.data?.id;
      }
    }

    // 3) Crear Lead
    await pd(`/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Diagnóstico – ${data.name}`,
        person_id: personId!,
        org_id: orgId,
        value: 0,
        currency: "USD",
      }),
    });

    // 4) Nota con país y respuestas
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
    } catch {}

    // 5) Enviar correo de confirmación al contacto
    await sendConfirmation(data);

    return NextResponse.json({ ok: true, message: "Lead creado y correo enviado" });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "No se logró enviar" }, { status: 500 });
  }
}
