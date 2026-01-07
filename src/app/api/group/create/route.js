import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const groupName = String(body.groupName || "").trim();
    const memberName = String(body.memberName || "").trim();
    const pin = String(body.pin || "").trim();
    const adminCode = String(body.adminCode || "").trim();

    if (!groupName || !memberName || !pin) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ name: groupName, pin_hash: pinHash })
      .select()
      .single();

    if (groupError) {
      return Response.json({ error: "Errore creazione gruppo." }, { status: 400 });
    }

    const isProgramAdmin =
      adminCode && adminCode === String(process.env.PROGRAM_ADMIN_CODE || "");

    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        group_id: group.id,
        name: memberName,
        is_group_admin: true,
        is_program_admin: isProgramAdmin,
      })
      .select()
      .single();

    if (memberError) {
      return Response.json({ error: "Errore creazione utente." }, { status: 400 });
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
