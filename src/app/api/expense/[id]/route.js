import { supabase } from "@/lib/supabaseAdmin";
import { computeShares } from "@/lib/shares";

export async function PUT(request, { params }) {
  try {
    const expenseId = String(params.id || "").trim();
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const title = String(body.title || "").trim();
    const amountCents = Number(body.amountCents);
    const payerMemberId = String(body.payerMemberId || "").trim();
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (!expenseId || !groupId || !title || !payerMemberId || !Number.isInteger(amountCents)) {
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

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        title,
        amount_cents: amountCents,
        payer_member_id: payerMemberId,
      })
      .eq("id", expenseId)
      .eq("group_id", groupId);

    if (updateError) {
      return Response.json({ error: "Errore aggiornamento spesa." }, { status: 400 });
    }

    const { error: deleteSharesError } = await supabase
      .from("expense_shares")
      .delete()
      .eq("expense_id", expenseId);

    if (deleteSharesError) {
      return Response.json({ error: "Errore aggiornamento quote." }, { status: 400 });
    }

    const shareRows = Object.entries(shares).map(([memberId, shareCents]) => ({
      expense_id: expenseId,
      member_id: memberId,
      weight: weights[memberId],
      share_cents: shareCents,
    }));

    const { error: insertSharesError } = await supabase
      .from("expense_shares")
      .insert(shareRows);

    if (insertSharesError) {
      return Response.json({ error: "Errore aggiornamento quote." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const expenseId = String(params.id || "").trim();
    if (!expenseId) {
      return Response.json({ error: "ID spesa mancante." }, { status: 400 });
    }

    const { error: deleteSharesError } = await supabase
      .from("expense_shares")
      .delete()
      .eq("expense_id", expenseId);

    if (deleteSharesError) {
      return Response.json({ error: "Errore eliminazione quote." }, { status: 400 });
    }

    const { error: deleteExpenseError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (deleteExpenseError) {
      return Response.json({ error: "Errore eliminazione spesa." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
