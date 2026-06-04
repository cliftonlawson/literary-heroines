const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_TO_EMAIL = "hello@literaryheroines.com";
const DEFAULT_FROM_EMAIL = "Literary Heroines <letters@literaryheroines.com>";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function onRequestPost({ request, env }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Please send a valid message." }, 400);
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const reason = String(payload.reason || "").trim();
  const message = String(payload.message || "").trim();
  const company = String(payload.company || "").trim();

  if (company) {
    return json({ ok: true });
  }

  if (!name || !email || !reason || !message) {
    return json({ error: "Please complete every field." }, 400);
  }

  if (!isValidEmail(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: "The contact form is not configured yet." }, 500);
  }

  const to = env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
  const from = env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const subject = `Literary Heroines: ${reason}`;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Reason: ${reason}`,
    "",
    message,
  ].join("\n");

  const html = `
    <h2>New Literary Heroines letter</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <hr />
    <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend contact email failed:", error);
    return json({ error: "The letter could not be sent." }, 502);
  }

  return json({ ok: true });
}

export function onRequestGet() {
  return json({ error: "Method not allowed." }, 405);
}
