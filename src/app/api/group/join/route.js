import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const memberName = String(body.memberName || "").trim();
    const pin = String(body.pin || "").trim();
    const adminCode = String(body.adminCode || "").trim();

    if (!groupId || !memberName || !pin) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id,pin_hash")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return Response.json({ error: groupError?.message || "Gruppo non trovato." }, { status: 404 });
    }

    const isValid = await bcrypt.compare(pin, group.pin_hash);
    if (!isValid) {
      return Response.json({ error: "PIN non valido." }, { status: 401 });
    }

    const isProgramAdmin =
      adminCode && adminCode === String(process.env.PROGRAM_ADMIN_CODE || "");

    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        group_id: group.id,
        name: memberName,
        is_group_admin: false,
        is_program_admin: Boolean(isProgramAdmin),
      })
      .select()
      .single();

    if (memberError) {
      return Response.json(
        {
          error:
            memberError.message ||
            `${memberError.code || "ERR"} ${memberError.details || ""} ${memberError.hint || ""}`.trim() ||
            "Errore creazione utente.",
        },
        { status: 400 }
      );
    }

    return Response.json({
      groupId: group.id,
      memberId: member.id,
      memberName: member.name,
    });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
