import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const adminCode = String(body.adminCode || "").trim();
    const expectedCode = String(process.env.ADMIN_RESET_CODE || "");

    if (!groupId || !adminCode) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    if (!expectedCode || adminCode !== expectedCode) {
      return Response.json({ error: "Codice admin non valido." }, { status: 403 });
    }

    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) {
      return Response.json({ error: "Errore eliminazione gruppo." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
