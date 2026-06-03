import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = (process.env.MAIL_PASS || "").replace(/\s+/g, "");
const FROM_ADDRESS = process.env.MAIL_FROM || (MAIL_USER ? `Prisme <${MAIL_USER}>` : "Prisme <support@prisme.app>");
const REPLY_TO = process.env.MAIL_REPLY_TO || MAIL_USER || "support@prisme.app";

let transporter = null;

function getTransporter() {
  if (!MAIL_USER || !MAIL_PASS) {
    throw new Error("MAIL_USER et MAIL_PASS doivent etre configures dans .env pour envoyer les e-mails.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });
  }

  return transporter;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeUrl(url) {
  return String(url || APP_URL);
}

function renderEmail({
  preview,
  badge,
  title,
  intro,
  details,
  ctaLabel,
  ctaUrl,
  note,
  accent = "#a3ff12",
}) {
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(preview);
  const safeCtaUrl = normalizeUrl(ctaUrl);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#08090b;font-family:Arial,Helvetica,sans-serif;color:#f7f4ec;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">
    ${safePreview}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#08090b;padding:34px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;">
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:42px;height:42px;border-radius:10px;background:${accent};color:#11140a;text-align:center;font-size:24px;font-weight:900;line-height:42px;">&#9651;</td>
                  <td style="padding-left:12px;color:#f7f4ec;font-size:24px;font-weight:800;">Prisme</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#151820;border:1px solid #2a2f3a;border-radius:20px;overflow:hidden;">
              <div style="height:6px;background:${accent};"></div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:36px 32px 30px;">
                    <p style="margin:0 0 14px;color:${accent};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(badge)}</p>
                    <h1 style="margin:0 0 16px;color:#ffffff;font-size:30px;line-height:1.18;font-weight:800;">${safeTitle}</h1>
                    <div style="margin:0 0 22px;color:#cbd2dc;font-size:16px;line-height:1.7;">${intro}</div>
                    ${details ? `<div style="margin:0 0 28px;padding:16px 18px;background:#10131a;border:1px solid #29303b;border-radius:14px;color:#b8c0cc;font-size:14px;line-height:1.65;">${details}</div>` : ""}
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                      <tr>
                        <td style="border-radius:12px;background:${accent};">
                          <a href="${safeCtaUrl}" style="display:inline-block;padding:15px 24px;color:#11140a;text-decoration:none;font-size:15px;font-weight:800;">${escapeHtml(ctaLabel)}</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0;color:#9099a6;font-size:13px;line-height:1.6;">${note}</p>
                    <p style="margin:22px 0 0;color:#747d89;font-size:12px;line-height:1.6;">
                      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                      <a href="${safeCtaUrl}" style="color:${accent};word-break:break-all;text-decoration:none;">${safeCtaUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 12px 0;color:#6f7783;font-size:12px;line-height:1.55;">
              Vous recevez cet e-mail parce qu'une action a ete demandee sur Prisme.<br>
              <a href="${APP_URL}" style="color:#9aa3af;text-decoration:none;">${APP_URL}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendTransactionalMail({ to, subject, html, text }) {
  return getTransporter().sendMail({
    from: FROM_ADDRESS,
    replyTo: REPLY_TO,
    to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `prisme-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  });
}

export async function sendVerificationEmail(toEmail, toName, verificationLink) {
  const safeName = escapeHtml(toName || "Bienvenue");
  const html = renderEmail({
    preview: "Confirmez votre adresse e-mail pour activer votre compte Prisme.",
    badge: "Activation du compte",
    title: "Verifiez votre adresse e-mail",
    intro: `<p style="margin:0;">Bonjour <strong style="color:#ffffff;">${safeName}</strong>, bienvenue sur Prisme. Confirmez votre adresse e-mail pour activer votre compte et commencer a publier vos Angles.</p>`,
    details: "Cette verification protege votre compte et nous aide a garder Prisme fiable pour toute la communaute.",
    ctaLabel: "Verifier mon e-mail",
    ctaUrl: verificationLink,
    note: "Ce lien expire dans 24 heures. Si vous n'avez pas cree de compte sur Prisme, vous pouvez ignorer cet e-mail.",
  });

  await sendTransactionalMail({
    to: toEmail,
    subject: "Verifiez votre e-mail pour Prisme",
    html,
    text: `Bonjour ${toName || ""}, confirmez votre e-mail Prisme avec ce lien : ${verificationLink}\nCe lien expire dans 24 heures.`,
  });
}

export async function sendPasswordResetEmail(toEmail, toName, resetLink) {
  const safeName = escapeHtml(toName || "Bonjour");
  const html = renderEmail({
    preview: "Choisissez un nouveau mot de passe Prisme.",
    badge: "Securite du compte",
    title: "Reinitialisez votre mot de passe",
    intro: `<p style="margin:0;">Bonjour <strong style="color:#ffffff;">${safeName}</strong>, utilisez le lien ci-dessous pour choisir un nouveau mot de passe.</p>`,
    details: "Pour votre securite, ce lien est temporaire et ne doit pas etre partage.",
    ctaLabel: "Reinitialiser mon mot de passe",
    ctaUrl: resetLink,
    note: "Ce lien expire dans 1 heure. Si vous n'etes pas a l'origine de cette demande, ignorez cet e-mail.",
    accent: "#ff6b4a",
  });

  await sendTransactionalMail({
    to: toEmail,
    subject: "Reinitialisation de mot de passe - Prisme",
    html,
    text: `Bonjour ${toName || ""}, reinitialisez votre mot de passe Prisme avec ce lien : ${resetLink}\nCe lien expire dans 1 heure.`,
  });
}

export async function sendWelcomeEmail(toEmail, toName) {
  const safeName = escapeHtml(toName || "");
  const html = renderEmail({
    preview: "Votre compte Prisme est actif.",
    badge: "Compte active",
    title: "Bienvenue sur Prisme",
    intro: `<p style="margin:0;">Bonjour <strong style="color:#ffffff;">${safeName}</strong>, votre compte est pret. Vous pouvez maintenant partager vos perspectives et suivre les discussions qui vous interessent.</p>`,
    details: "Votre profil, vos publications et vos conversations sont maintenant accessibles depuis l'application.",
    ctaLabel: "Ouvrir Prisme",
    ctaUrl: APP_URL,
    note: "Cet e-mail confirme l'activation de votre compte.",
    accent: "#48d6d2",
  });

  await sendTransactionalMail({
    to: toEmail,
    subject: "Bienvenue sur Prisme",
    html,
    text: `Bienvenue sur Prisme, ${toName || ""}. Ouvrir l'application : ${APP_URL}`,
  });
}
