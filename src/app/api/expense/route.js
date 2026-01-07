import { supabase } from "@/lib/supabaseAdmin";
import { computeShares } from "@/lib/shares";

export async function POST(request) {
  try {
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const title = String(body.title || "").trim();
    const amountCents = Number(body.amountCents);
    const payerMemberId = String(body.payerMemberId || "").trim();
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (!groupId || !title || !payerMemberId || !Number.isInteger(amountCents)) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const weights = {};
    participants.forEach((participant) => {
      const memberId = String(participant.memberId || "").trim();
      const weight = Number(participant.weight || 0);
      if (!memberId) return;
      if (weight < 0 || weight > 100) return;
      weights[memberId] = weight;
    });

    if (!Object.keys(weights).length) {
      return Response.json({ error: "Partecipanti non validi." }, { status: 400 });
    }

    if (!weights[payerMemberId]) {
      weights[payerMemberId] = 100;
    }

    const shares = computeShares(amountCents, weights);

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        title,
        amount_cents: amountCents,
        payer_member_id: payerMemberId,
      })
      .select()
      .single();

    if (expenseError) {
      return Response.json({ error: "Errore salvataggio spesa." }, { status: 400 });
    }

    const shareRows = Object.entries(shares).map(([memberId, shareCents]) => ({
      expense_id: expense.id,
      member_id: memberId,
      weight: weights[memberId],
      share_cents: shareCents,
    }));

    const { error: sharesError } = await supabase
      .from("expense_shares")
      .insert(shareRows);

    if (sharesError) {
      return Response.json({ error: "Errore salvataggio quote." }, { status: 400 });
    }

    return Response.json({ success: true, expenseId: expense.id });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
