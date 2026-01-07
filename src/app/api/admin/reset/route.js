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

    const { data: expenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("group_id", groupId);

    const expenseIds = (expenses || []).map((expense) => expense.id);
    if (expenseIds.length) {
      const { error: sharesError } = await supabase
        .from("expense_shares")
        .delete()
        .in("expense_id", expenseIds);
      if (sharesError) {
        return Response.json({ error: "Errore reset quote." }, { status: 400 });
      }
    }

    const { error: expensesError } = await supabase
      .from("expenses")
      .delete()
      .eq("group_id", groupId);
    if (expensesError) {
      return Response.json({ error: "Errore reset spese." }, { status: 400 });
    }

    const { error: settlementsError } = await supabase
      .from("settlements")
      .delete()
      .eq("group_id", groupId);
    if (settlementsError) {
      return Response.json({ error: "Errore reset pagamenti." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
