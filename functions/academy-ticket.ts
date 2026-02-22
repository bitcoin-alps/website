export const onRequest = async (context: any) => {
  // Reject non-POST requests explicitly
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { request, env } = context;

  try {
    const body = await request.json();

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

    console.log('Form submission received:', body); // Debug log

    const text = [
      "🆕 Neue Kursanmeldung:",
      `📋 Kurs: ${body.eventName}`,
      `📅 Datum: ${body.eventDate}`,
      `👤 Vorname: ${body.firstname}`,
      `👤 Nachname: ${body.lastname}`,
      `📧 E-Mail: ${body.email}`,
      body.phone ? `📞 Telefon: ${body.phone}` : "📞 Telefon: –",
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
          title: "Telegram Fehler",
          status: 502,
          detail: `Fehler beim Senden: ${errorBody.substring(0, 100)}`,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    console.log('Telegram message sent successfully');
    return new Response(null, { status: 204 });
  } catch (err: any) {
    console.error("Handler error:", err);
    return new Response(
      JSON.stringify({
        type: "about:blank",
        title: "Serverfehler",
        status: 500,
        detail: err.message || "Unbekannter Fehler",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }
};
