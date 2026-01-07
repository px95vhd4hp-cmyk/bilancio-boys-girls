import { supabase } from "@/lib/supabaseAdmin";

const isProgramAdmin = (adminCode) =>
  adminCode && adminCode === String(process.env.PROGRAM_ADMIN_CODE || "");

export async function PUT(request, { params }) {
  try {
    const memberId = String(params.id || "").trim();
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const role = String(body.role || "").trim().toLowerCase();
    const adminCode = String(body.adminCode || "").trim();

    if (!memberId || !groupId || !role) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    if (!isProgramAdmin(adminCode)) {
      return Response.json({ error: "Codice admin non valido." }, { status: 403 });
    }

    if (role === "admin") {
      await supabase.from("members").update({ is_group_admin: false }).eq("group_id", groupId);
      const { error } = await supabase
        .from("members")
        .update({ is_group_admin: true })
        .eq("id", memberId)
        .eq("group_id", groupId);
      if (error) {
        return Response.json({ error: "Errore aggiornamento ruolo." }, { status: 400 });
      }
    } else if (role === "coadmin") {
      const { error } = await supabase
        .from("members")
        .update({ is_group_admin: false, is_program_admin: true })
        .eq("id", memberId)
        .eq("group_id", groupId);
      if (error) {
        return Response.json({ error: "Errore aggiornamento ruolo." }, { status: 400 });
      }
    } else if (role === "member") {
      const { data: admins, error: adminsError } = await supabase
        .from("members")
        .select("id")
        .eq("group_id", groupId)
        .eq("is_group_admin", true);
      if (adminsError) {
        return Response.json({ error: "Errore verifica admin." }, { status: 400 });
      }
      const adminCount = (admins || []).filter((admin) => admin.id !== memberId).length;
      if (adminCount === 0) {
        return Response.json(
          { error: "Il gruppo deve avere almeno un amministratore." },
          { status: 400 }
        );
      }
      const { error } = await supabase
        .from("members")
        .update({ is_group_admin: false, is_program_admin: false })
        .eq("id", memberId)
        .eq("group_id", groupId);
      if (error) {
        return Response.json({ error: "Errore aggiornamento ruolo." }, { status: 400 });
      }
    } else {
      return Response.json({ error: "Ruolo non valido." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
