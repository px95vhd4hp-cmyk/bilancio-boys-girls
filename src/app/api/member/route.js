import { supabase } from "@/lib/supabaseAdmin";

const isProgramAdmin = (adminCode) =>
  adminCode && adminCode === String(process.env.PROGRAM_ADMIN_CODE || "");

export async function POST(request) {
  try {
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const name = String(body.name || "").trim();
    const role = String(body.role || "member").trim().toLowerCase();
    const adminCode = String(body.adminCode || "").trim();

    if (!groupId || !name) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const allowElevated = Boolean(isProgramAdmin(adminCode));
    const isGroupAdmin = role === "admin" && allowElevated;
    const isProgram = role === "coadmin" && allowElevated;

    if ((role === "admin" || role === "coadmin") && !allowElevated) {
      return Response.json({ error: "Codice admin non valido." }, { status: 403 });
    }

    if (isGroupAdmin) {
      await supabase.from("members").update({ is_group_admin: false }).eq("group_id", groupId);
    }

    const { data: member, error } = await supabase
      .from("members")
      .insert({
        group_id: groupId,
        name,
        is_group_admin: isGroupAdmin,
        is_program_admin: isProgram,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: "Errore creazione utente." }, { status: 400 });
    }

    return Response.json({ success: true, memberId: member.id });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
