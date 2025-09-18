// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string;
  answers?: any; // tus respuestas/resumen
};

const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN;          // ej: "inforum"
const PD_API = process.env.PIPEDRIVE_API_KEY;            // token de Pipedrive

// Brevo SMTP (usa la API key como password)
const BREVO_USER = process.env.BREVO_SMTP_USER || process.env.EMAIL_FROM; // normalmente tu remitente en Brevo
const BREVO_PASS = process.env.BREVO_SMTP_PASS || process.env.BREVO_API_KEY; // API key de Brevo
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <no-reply@tudominio.com>"; // remitente visible

async function pd(path: string, init?: RequestInit) {
  if (!PD_DOMAIN || !PD_API) throw new Error("Faltan PIPEDRIVE_DOMAIN / PIPEDRIVE_API_KEY");
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${path.includes("?") ? "&" : "?"}api_token=${PD_API}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Pipedrive ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Email SOLO al contacto que llenó el formulario
async function sendConfirmationToContact(data: Payload) {
  if (!BREVO_USER || !BREVO_PASS) {
    console.warn("Brevo SMTP no configurado (BREVO_SMTP_USER/BREVO_SMTP_PASS o BREVO_API_KEY). No se envía email.");
    return;
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: { user: BREVO_USER, pass: BREVO_PASS },
  });

  const subject = "Hemos recibido tu diagnóstico — Inforum";
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;">
      <h2>¡Gracias, ${data.name}!</h2>
      <p>Recibimos tus datos del diagnóstico${
        data.company ? ` para <b>${data.company}</b>` : ""
      } y fueron procesados con éxito.</p>
      <p>Pronto nos pondremos en contacto contigo${
        data.country ? ` en <b>${data.country}</b>` : ""
      } para comentarte los siguientes pasos.</p>
      ${
        data.answers
          ? `<p style="margin-top:16px;"><b>Resumen enviado:</b></p>
             <pre style="background:#f6f6f6;padding:12px;border-radius:8px;white-space:pre-wrap;">${JSON.stringify(
               data.answers,
               null,
               2
             )}</pre>`
          : ""
      }
      <p style="margin-top:16px;">Si deseas escribirnos directamente, puedes responder este correo.</p>
      <p style="margin-top:24px;">— Equipo Inforum</p>
    </div>
  `;
  const text =
    `Gracias, ${data.name}.\n` +
    `Recibimos tus datos del diagnóstico${data.company ? ` para ${data.company}` : ""} y fueron procesados con éxito.\n` +
    `Pronto nos pondremos en contacto contigo${data.country ? ` en ${data.country}` : ""}.\n` +
    (data.answers ? `\nResumen enviado:\n${JSON.stringify(data.answers, null, 2)}\n` : "") +
    `\n— Equipo Inforum`;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: data.email,         // 👈 SOLO al contacto
    subject,
    html,
    text,
    replyTo: EMAIL_FROM,    // si responde, llega a tu remitente
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

    // 2) Buscar/crear Organización por Empresa
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

    // 4) Dejar una nota con país y respuestas (útil si aún no tienes campos personalizados)
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

    // 5) Correo de confirmación al contacto
    await sendConfirmationToContact(data);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "No se logró enviar" }, { status: 500 });
  }
}
