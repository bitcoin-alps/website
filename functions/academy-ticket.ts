import type { PagesFunction } from '@cloudflare/workers-types';[web:72]

interface CourseRegistrationRequest {
  eventName: string;
  eventDate: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  acceptTos: boolean;
}

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: CourseRegistrationRequest = await request.json();

    // Basic validation
    if (!body.firstname || !body.lastname || !body.email || !body.acceptTos) {
      return new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Ungültige Eingabe",
          status: 400,
          detail: "Bitte fülle alle Pflichtfelder aus.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    // Build message for Telegram
    const text = [
      "Neue Kursanmeldung:",
      `Kurs: ${body.eventName}`,
      `Datum: ${body.eventDate}`,
      `Vorname: ${body.firstname}`,
      `Nachname: ${body.lastname}`,
      `E-Mail: ${body.email}`,
      body.phone ? `Telefon: ${body.phone}` : "Telefon: –",
    ].join("\n");

    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    const tgResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!tgResponse.ok) {
      const errorBody = await tgResponse.text();
      console.error("Telegram error:", errorBody);
      return new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Fehler beim Versenden",
          status: 502,
          detail: "Die Anmeldung konnte nicht an Telegram gesendet werden.",
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    // Success response expected by your Svelte code
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(
      JSON.stringify({
        type: "about:blank",
        title: "Serverfehler",
        status: 500,
        detail: "Es ist ein unerwarteter Fehler aufgetreten.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }
};
