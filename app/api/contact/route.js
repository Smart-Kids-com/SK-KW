// app/api/contact/route.js
export const runtime = "nodejs"; // ensure Node runtime (for nodemailer)

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const required = [
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CONTACT_TO"
];

function missingEnv() {
  return required.filter(k => !process.env[k]);
}

export async function POST(req) {
  try {
    const { name, email, subject, message, locale } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const miss = missingEnv();
    if (miss.length) {
      return NextResponse.json(
        { error: `Missing env: ${miss.join(", ")}` },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.CONTACT_FROM || process.env.SMTP_USER;
    const to = process.env.CONTACT_TO;

    const subj =
      `[Contact] ${subject?.trim() || "(no subject)"} - ${name}`;

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Locale:</b> ${escapeHtml(locale || "en")}</p>
        <p><b>Message:</b><br>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: subj,
      text: `Name: ${name}\nEmail: ${email}\nLocale: ${locale || "en"}\n\n${message}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

// tiny HTML escaper
function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
