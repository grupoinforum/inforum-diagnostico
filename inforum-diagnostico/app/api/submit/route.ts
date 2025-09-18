// app/api/submit/route.ts
export const runtime = "nodejs";         // necesario si usas Nodemailer
export const dynamic = "force-dynamic";  // evita cache SSR

import { NextResponse } from "next/server";

type Payload = {
  name: string;          // Nombre
  company?: string;      // Empresa
  email: string;         // Correo empresarial
  country?: string;      // País
  answers?: any;         // Resumen/resultado del cuestionario
};

const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;
const PD_API = process.env.PIPEDRIVE_API_KEY!;
const RESEND = process.env.RESEND_API_KEY;
const NOTIFY_TO = process.env.NOTIFY_TO || "ventas@tudominio.com";
const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_PASS = process.env.BREVO_SMTP_PASS;

async function pd(path: string, init?: RequestInit) {
  const url = `https://${PD_DOMAIN}.pipedrive.com/api/v1${path}${path.includes("?") ? "&" : "?"}api_token=${PD_API}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Pipedrive ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function sendEmail(data: Payload) {
  const html = `
    <h2>Nuevo lead de Diagnóstico</h2>
    <p><b>Nombre:</b> ${data.name}</p>
    ${data.company ? `<p><b>Empresa:</b> ${data.company}</p>` : ""}
    <p><b>Email:</b> ${data.email}</p>
    ${data.country ? `<p><b>País:</b> ${data.country}</p>` : ""}
    ${
      data.answers
        ? `<pre style="background:#f6f6f6;padding:12px;border-radius:8px">${JSON.stringify(data.answers, null, 2)}</pre>`
        : ""
    }
  `;

  // A) Resend (simple, sin dependencias)
  if (RESEND) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Inforum <no-reply@tudominio.com>",
        to: [NOTIFY_TO],
        subject: "Nuevo lead del cuestionario",
        html,
      }),
    });
    return;
  }

  // B) Brevo SMTP (requiere instalar nodemailer)
  if (BREVO_USER && BREVO_PASS) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: BREVO_USER, pass: BREVO_PASS },
    });
    await transporter.sendMail({
      from: "Inforum <no-reply@tudominio.com>",
      to: NOTIFY_TO,
      subject: "Nuevo lead del cuestionario",
      html,
    });
  }
}

export async function POST(req: Request) {
  try {
    if (!PD_DOMAIN || !PD_API) throw new Error("Faltan PIPEDRIVE_DOMAIN o PIPEDRIVE_API_KEY");
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

    // 4) Nota con país y respuestas (útil si aún no tienes campos personalizados)
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

    // 5) Email de notificación (si configuraste Resend o Brevo)
    await sendEmail(data);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/submit] Error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "No se logró enviar" }, { status: 500 });
  }
}
