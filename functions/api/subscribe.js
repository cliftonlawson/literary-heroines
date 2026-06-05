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
    return json({ error: "Please send a valid signup." }, 400);
  }

  const firstName = String(payload.firstName || "").trim();
  const email = String(payload.email || "").trim();
  const company = String(payload.company || "").trim();

  if (company) {
    return json({ ok: true });
  }

  if (!email) {
    return json({ error: "Please enter your email address." }, 400);
  }

  if (!isValidEmail(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: "The letter list is not configured yet." }, 500);
  }

  const to = env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
  const from = env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const subject = "Literary Heroines: New letter list signup";
  const text = [
    "New Literary Heroines letter list signup",
    "",
    `First name: ${firstName || "Not provided"}`,
    `Email: ${email}`,
  ].join("\n");

  const html = `
    <h2>New Literary Heroines letter list signup</h2>
    <p><strong>First name:</strong> ${escapeHtml(firstName || "Not provided")}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
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
    console.error("Resend subscribe email failed:", error);
    return json({ error: "The signup could not be sent." }, 502);
  }

  return json({ ok: true });
}

export function onRequestGet() {
  return json({ error: "Method not allowed." }, 405);
}
