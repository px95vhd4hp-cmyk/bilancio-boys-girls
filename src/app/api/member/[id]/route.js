import { supabase } from "@/lib/supabaseAdmin";

const hasDependencies = async (memberId) => {
  const checks = [
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("payer_member_id", memberId),
    supabase
      .from("expense_shares")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId),
    supabase
      .from("settlements")
      .select("id", { count: "exact", head: true })
      .eq("from_member_id", memberId),
    supabase
      .from("settlements")
      .select("id", { count: "exact", head: true })
      .eq("to_member_id", memberId),
  ];

  const results = await Promise.all(checks);
  return results.some((result) => (result.count || 0) > 0);
};

export async function PUT(request, { params }) {
  try {
    const memberId = String(params.id || "").trim();
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const name = String(body.name || "").trim();

    if (!memberId || !groupId || !name) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const { error } = await supabase
      .from("members")
      .update({ name })
      .eq("id", memberId)
      .eq("group_id", groupId);

    if (error) {
      return Response.json({ error: "Errore aggiornamento nome." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const memberId = String(params.id || "").trim();
    const { searchParams } = new URL(request.url);
    const groupId = String(searchParams.get("groupId") || "").trim();

    if (!memberId || !groupId) {
      return Response.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const blocked = await hasDependencies(memberId);
    if (blocked) {
      return Response.json(
        { error: "Impossibile eliminare: utente con movimenti registrati." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId)
      .eq("group_id", groupId);

    if (error) {
      return Response.json({ error: "Errore eliminazione utente." }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Errore inatteso." }, { status: 500 });
  }
}
