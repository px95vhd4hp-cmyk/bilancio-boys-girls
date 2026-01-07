import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const fromMemberId = String(body.fromMemberId || "").trim();
    const toMemberId = String(body.toMemberId || "").trim();
    const amountCents = Number(body.amountCents);

    if (!groupId || !fromMemberId || !toMemberId || !Number.isInteger(amountCents)) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    if (amountCents <= 0 || fromMemberId === toMemberId) {
      return Response.json({ error: "Pagamento non valido." }, { status: 400 });
    }

    const { error } = await supabase.from("settlements").insert({
      group_id: groupId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      amount_cents: amountCents,
    });

    if (error) {
      return Response.json({ error: "Errore registrazione pagamento." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
