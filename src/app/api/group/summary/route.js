import { supabase } from "@/lib/supabaseAdmin";

const buildTransactions = (netMap, members) => {
  const debtors = [];
  const creditors = [];

  Object.entries(netMap).forEach(([memberId, amount]) => {
    if (amount < 0) {
      debtors.push({ memberId, amount: -amount });
    } else if (amount > 0) {
      creditors.push({ memberId, amount });
    }
  });

  debtors.sort((a, b) => a.memberId.localeCompare(b.memberId));
  creditors.sort((a, b) => a.memberId.localeCompare(b.memberId));

  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const transactions = [];

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = Math.min(debtor.amount, creditor.amount);
    if (pay > 0) {
      transactions.push({
        from_id: debtor.memberId,
        to_id: creditor.memberId,
        amount_cents: pay,
        from_name: memberMap.get(debtor.memberId) || debtor.memberId,
        to_name: memberMap.get(creditor.memberId) || creditor.memberId,
      });
    }
    debtor.amount -= pay;
    creditor.amount -= pay;
    if (debtor.amount === 0) i += 1;
    if (creditor.amount === 0) j += 1;
  }

  return transactions;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = String(searchParams.get("groupId") || "").trim();

    if (!groupId) {
      return Response.json({ error: "ID gruppo mancante." }, { status: 400 });
    }

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id,name")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return Response.json({ error: "Gruppo non trovato." }, { status: 404 });
    }

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id,name,is_group_admin,is_program_admin")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (membersError) {
      return Response.json({ error: "Errore caricamento membri." }, { status: 400 });
    }

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select(
        "id,title,amount_cents,payer_member_id,created_at,expense_shares(member_id,weight,share_cents)"
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (expensesError) {
      return Response.json({ error: "Errore caricamento spese." }, { status: 400 });
    }

    const { data: settlements, error: settlementsError } = await supabase
      .from("settlements")
      .select("from_member_id,to_member_id,amount_cents")
      .eq("group_id", groupId);

    if (settlementsError) {
      return Response.json({ error: "Errore caricamento pagamenti." }, { status: 400 });
    }

    const memberMap = new Map(members.map((member) => [member.id, member]));
    const netMap = {};
    members.forEach((member) => {
      netMap[member.id] = 0;
    });

    (expenses || []).forEach((expense) => {
      (expense.expense_shares || []).forEach((share) => {
        if (share.member_id === expense.payer_member_id) return;
        netMap[share.member_id] -= share.share_cents;
        netMap[expense.payer_member_id] += share.share_cents;
      });
    });

    (settlements || []).forEach((settlement) => {
      netMap[settlement.from_member_id] += settlement.amount_cents;
      netMap[settlement.to_member_id] -= settlement.amount_cents;
    });

    const transactions = buildTransactions(netMap, members);

    const responseExpenses = (expenses || []).map((expense) => ({
      id: expense.id,
      title: expense.title,
      amount_cents: expense.amount_cents,
      payer_member_id: expense.payer_member_id,
      payer_name: memberMap.get(expense.payer_member_id)?.name || "-",
      shares: (expense.expense_shares || []).map((share) => ({
        member_id: share.member_id,
        weight: share.weight,
        share_cents: share.share_cents,
        member_name: memberMap.get(share.member_id)?.name || "-",
      })),
    }));

    return Response.json({
      group,
      members,
      expenses: responseExpenses,
      transactions,
    });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
