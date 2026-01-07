export async function POST(request) {
  try {
    const body = await request.json();
    const adminCode = String(body.adminCode || "").trim();
    const expectedCode = String(process.env.PROGRAM_ADMIN_CODE || "");

    if (!adminCode) {
      return Response.json({ error: "Codice mancante." }, { status: 400 });
    }

    if (!expectedCode || adminCode !== expectedCode) {
      return Response.json({ error: "Codice admin non valido." }, { status: 403 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
