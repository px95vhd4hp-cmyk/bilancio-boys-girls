"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const WEIGHTS = ["0", "50", "60", "70", "75", "80", "90", "100"];
const ROLE_OPTIONS = [
  { value: "member", label: "Membro" },
  { value: "coadmin", label: "Co-admin" },
  { value: "admin", label: "Admin" },
];

const formatEur = (cents) => {
  const value = (cents || 0) / 100;
  return `${value.toFixed(2)} EUR`;
};

const formatAmountInput = (cents) => {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
};

const parseAmount = (value) => {
  const normalized = String(value || "").trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parts = normalized.split(".");
  const euros = Number(parts[0]);
  const cents = Number((parts[1] || "0").padEnd(2, "0"));
  return euros * 100 + cents;
};

const storageKey = "bbg-session";

const readSession = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const saveSession = (session) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(session));
};

const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
};

export default function ClientApp() {
  const [groupFromLink, setGroupFromLink] = useState("");
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authPanel, setAuthPanel] = useState("join");

  const [createData, setCreateData] = useState({
    groupName: "",
    memberName: "",
    pin: "",
    adminCode: "",
  });
  const [joinData, setJoinData] = useState({
    groupId: groupFromLink || "",
    memberName: "",
    pin: "",
    adminCode: "",
  });

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const [expenseData, setExpenseData] = useState({
    title: "",
    amount: "",
    payerId: "",
  });
  const [participantWeights, setParticipantWeights] = useState({});
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [memberEdits, setMemberEdits] = useState({});
  const [memberRoles, setMemberRoles] = useState({});
  const [newMember, setNewMember] = useState({ name: "", role: "member" });
  const [adminActionCode, setAdminActionCode] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminGroups, setAdminGroups] = useState([]);
  const [adminGroupsLoaded, setAdminGroupsLoaded] = useState(false);

  const [settleData, setSettleData] = useState({
    toMemberId: "",
  });

  const [resetCode, setResetCode] = useState("");

  const inviteLink = useMemo(() => {
    if (!session?.groupId || typeof window === "undefined") return "";
    return `${window.location.origin}/?group=${session.groupId}`;
  }, [session?.groupId]);

  const currentMember = useMemo(() => {
    if (!session?.memberId) return null;
    return members.find((member) => member.id === session.memberId) || null;
  }, [members, session?.memberId]);

  const canEditMembers = Boolean(
    currentMember && (currentMember.is_group_admin || currentMember.is_program_admin)
  );

  useEffect(() => {
    const existing = readSession();
    if (existing) {
      setSession(existing);
    }
    const storedTheme = typeof window !== "undefined" ? window.localStorage.getItem("bbg-theme") : null;
    if (storedTheme === "dark") {
      setDarkMode(true);
      document.body.dataset.theme = "dark";
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = darkMode ? "dark" : "light";
    if (typeof window !== "undefined") {
      window.localStorage.setItem("bbg-theme", darkMode ? "dark" : "light");
    }
  }, [darkMode]);

  const handleGroupParam = (groupId) => {
    if (groupId) {
      setGroupFromLink(groupId);
    }
  };

  useEffect(() => {
    if (groupFromLink) {
      setJoinData((prev) => ({ ...prev, groupId: groupFromLink }));
    }
  }, [groupFromLink]);

  const refreshSummary = async (currentSession = session) => {
    if (!currentSession?.groupId) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`/api/group/summary?groupId=${currentSession.groupId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore caricamento");
      setGroup(data.group);
      setMembers(data.members || []);
      setExpenses(data.expenses || []);
      setTransactions(data.transactions || []);
      setSettlements(data.settlements || []);
      if (data.members?.length && !expenseData.payerId) {
        setExpenseData((prev) => ({ ...prev, payerId: data.members[0].id }));
      }
      const initialWeights = {};
      (data.members || []).forEach((member) => {
        initialWeights[member.id] = participantWeights[member.id] || {
          selected: true,
          weight: "100",
        };
      });
      setParticipantWeights(initialWeights);
      const nextEdits = {};
      const nextRoles = {};
      (data.members || []).forEach((member) => {
        nextEdits[member.id] = member.name;
        nextRoles[member.id] = member.is_group_admin
          ? "admin"
          : member.is_program_admin
          ? "coadmin"
          : "member";
      });
      setMemberEdits(nextEdits);
      setMemberRoles(nextRoles);
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.groupId) {
      refreshSummary(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.groupId]);

  const myDebts = useMemo(() => {
    if (!session?.memberId) return [];
    return transactions.filter((tx) => tx.from_id === session.memberId);
  }, [transactions, session?.memberId]);

  const personalBalance = useMemo(() => {
    if (!session?.memberId) return { owe: 0, receive: 0 };
    const owe = transactions
      .filter((tx) => tx.from_id === session.memberId)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);
    const receive = transactions
      .filter((tx) => tx.to_id === session.memberId)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);
    return { owe, receive };
  }, [transactions, session?.memberId]);

  const groupTotals = useMemo(() => {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount_cents, 0);
    const paidByMe = session?.memberId
      ? expenses
          .filter((exp) => exp.payer_member_id === session.memberId)
          .reduce((sum, exp) => sum + exp.amount_cents, 0)
      : 0;
    return { totalSpent, paidByMe };
  }, [expenses, session?.memberId]);

  const expenseTrend = useMemo(() => {
    const recent = [...expenses].slice(0, 10).reverse();
    return recent.map((exp) => exp.amount_cents);
  }, [expenses]);

  const handleCreate = async () => {
    setLoading(true);
    setNotice("");
    try {
      if (!createData.groupName || !createData.memberName || !createData.pin) {
        throw new Error("Compila nome gruppo, tuo nome e PIN.");
      }
      const response = await fetch("/api/group/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore creazione gruppo");
      const newSession = {
        groupId: data.groupId,
        memberId: data.memberId,
        memberName: data.memberName,
      };
      saveSession(newSession);
      setSession(newSession);
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setNotice("");
    try {
      if (!joinData.groupId || !joinData.memberName || !joinData.pin) {
        throw new Error("Inserisci ID gruppo, nome e PIN.");
      }
      const response = await fetch("/api/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(joinData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore ingresso gruppo");
      const newSession = {
        groupId: data.groupId,
        memberId: data.memberId,
        memberName: data.memberName,
      };
      saveSession(newSession);
      setSession(newSession);
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setGroup(null);
    setMembers([]);
    setExpenses([]);
    setTransactions([]);
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice("Link copiato negli appunti.");
    } catch (err) {
      setNotice("Non riesco a copiare il link.");
    }
  };

  const handleCreateExpense = async () => {
    setLoading(true);
    setNotice("");
    try {
      const amountCents = parseAmount(expenseData.amount);
      if (!expenseData.title || amountCents === null || !expenseData.payerId) {
        throw new Error("Titolo, importo e pagatore sono obbligatori.");
      }
      const participants = Object.entries(participantWeights)
        .filter(([, info]) => info.selected)
        .map(([memberId, info]) => ({ memberId, weight: Number(info.weight) }));
      if (!participants.length) {
        throw new Error("Seleziona almeno un partecipante.");
      }
      const isEditing = Boolean(editingExpenseId);
      const endpoint = isEditing ? `/api/expense/${editingExpenseId}` : "/api/expense";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          title: expenseData.title,
          amountCents,
          payerMemberId: expenseData.payerId,
          participants,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore salvataggio spesa");
      setExpenseData((prev) => ({ ...prev, title: "", amount: "" }));
      setEditingExpenseId(null);
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`/api/expense/${expenseId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore eliminazione spesa");
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseData({
      title: expense.title,
      amount: formatAmountInput(expense.amount_cents),
      payerId: expense.payer_member_id,
    });

    const nextWeights = {};
    members.forEach((member) => {
      const share = (expense.shares || []).find((item) => item.member_id === member.id);
      nextWeights[member.id] = share
        ? { selected: true, weight: String(share.weight) }
        : { selected: false, weight: "100" };
    });
    setParticipantWeights(nextWeights);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setExpenseData((prev) => ({ ...prev, title: "", amount: "" }));
    const resetWeights = {};
    members.forEach((member) => {
      resetWeights[member.id] = { selected: true, weight: "100" };
    });
    setParticipantWeights(resetWeights);
  };

  const handleSettle = async () => {
    setLoading(true);
    setNotice("");
    try {
      const selectedDebt = myDebts.find((tx) => tx.to_id === settleData.toMemberId);
      if (!settleData.toMemberId || !selectedDebt) {
        throw new Error("Seleziona un debito da pareggiare.");
      }
      const amountCents = selectedDebt.amount_cents;
      const response = await fetch("/api/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          fromMemberId: session.memberId,
          toMemberId: settleData.toMemberId,
          amountCents,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore registrazione pagamento");
      setSettleData({ toMemberId: "" });
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setNotice("");
    try {
      if (!resetCode) throw new Error("Inserisci il codice admin.");
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          adminCode: resetCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore reset");
      setResetCode("");
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmed = window.confirm(
      "Vuoi eliminare definitivamente il gruppo? Questa azione non è reversibile."
    );
    if (!confirmed) return;
    setLoading(true);
    setNotice("");
    try {
      if (!resetCode) throw new Error("Inserisci il codice admin.");
      const response = await fetch("/api/admin/delete-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          adminCode: resetCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore eliminazione gruppo");
      handleLogout();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberNameChange = (memberId, value) => {
    setMemberEdits((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleVerifyAdmin = async () => {
    setLoading(true);
    setNotice("");
    try {
      if (!adminActionCode) {
        throw new Error("Inserisci il codice admin globale.");
      }
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode: adminActionCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Codice non valido");
      setAdminUnlocked(true);
      setNotice("Codice admin verificato.");
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
      setAdminUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLockAdmin = () => {
    setAdminUnlocked(false);
    setAdminActionCode("");
    setAdminGroups([]);
    setAdminGroupsLoaded(false);
  };

  const handleSaveMember = async (memberId) => {
    setLoading(true);
    setNotice("");
    try {
      if (!canEditMembers) {
        throw new Error("Solo l'admin può modificare i membri.");
      }
      const name = String(memberEdits[memberId] || "").trim();
      if (!name) {
        throw new Error("Il nome non può essere vuoto.");
      }
      const response = await fetch(`/api/member/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: session.groupId, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore aggiornamento utente");
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (memberId === session.memberId) {
      setNotice("Non puoi eliminare l'utente attivo.");
      return;
    }
    const confirmed = window.confirm("Eliminare questo utente dal gruppo?");
    if (!confirmed) return;
    setLoading(true);
    setNotice("");
    try {
      if (!canEditMembers) {
        throw new Error("Solo l'admin può modificare i membri.");
      }
      const response = await fetch(`/api/member/${memberId}?groupId=${session.groupId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore eliminazione utente");
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (memberId, value) => {
    setMemberRoles((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleSaveRole = async (memberId) => {
    setLoading(true);
    setNotice("");
    try {
      const role = memberRoles[memberId];
      if (!role) {
        throw new Error("Seleziona un ruolo.");
      }
      if (!adminUnlocked || !adminActionCode) {
        throw new Error("Inserisci il codice admin globale.");
      }
      if (!canEditMembers) {
        throw new Error("Solo l'admin può aggiornare i ruoli.");
      }
      if (role === "admin") {
        const currentAdmin = members.find((member) => member.is_group_admin);
        if (currentAdmin && currentAdmin.id !== memberId) {
          const confirmed = window.confirm(
            "Vuoi trasferire il ruolo di amministratore a questo utente?"
          );
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }
      const response = await fetch(`/api/member/${memberId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          role,
          adminCode: adminActionCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore aggiornamento ruolo");
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    setLoading(true);
    setNotice("");
    try {
      const name = String(newMember.name || "").trim();
      if (!name) {
        throw new Error("Inserisci il nome del nuovo membro.");
      }
      if (!canEditMembers) {
        throw new Error("Solo l'admin può aggiungere membri.");
      }
      if (
        (newMember.role === "admin" || newMember.role === "coadmin") &&
        (!adminUnlocked || !adminActionCode)
      ) {
        throw new Error("Inserisci il codice admin globale per il ruolo scelto.");
      }
      const response = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          name,
          role: newMember.role,
          adminCode: adminActionCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore aggiunta membro");
      setNewMember({ name: "", role: "member" });
      await refreshSummary();
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGroups = async () => {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminCode: adminActionCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Errore caricamento gruppi");
      setAdminGroups(data.groups || []);
      setAdminGroupsLoaded(true);
    } catch (err) {
      setNotice(err.message || "Errore inatteso");
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  const handleHelp = (message) => {
    if (typeof window !== "undefined") {
      window.alert(message);
    }
  };

  return (
    <div className="page">
      <header className="ios-header">
        <div>
          <h1>Bilancio Boys & Girls</h1>
          <div className="status">
            {session ? `Attivo: ${session.memberName}` : "Pronto per iniziare"}
          </div>
        </div>
        <div className="button-row">
          <button
            className="button ghost"
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
          >
            {darkMode ? "Light" : "Dark"}
          </button>
          <span className="ios-chip">{session ? "Online" : "Offline"}</span>
        </div>
      </header>
      <div className="shell">
        <GroupParamWatcher onChange={handleGroupParam} />
        <section className="hero span-2 section" id="overview">
          <span className="pill">Bilancio Boys & Girls</span>
          <h1>Gestione spese di gruppo, zero stress.</h1>
          <p>
            Entra con link e PIN, aggiungi spese e pareggia in pochi tap. Nessun
            riferimento a servizi esterni.
          </p>
        </section>
        {notice ? <div className="notice span-2">{notice}</div> : null}

        {!session ? (
          <>
            <details
              className="accordion section"
              open={authPanel === "join"}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  setAuthPanel("join");
                } else if (authPanel === "join") {
                  setAuthPanel("");
                }
              }}
            >
              <summary>Accedi al gruppo</summary>
              <section className="panel">
                {!joinData.groupId ? (
                  <div className="notice">Apri il link del gruppo: l'ID si inserisce da solo.</div>
                ) : null}
                <div className="grid">
                  <label className="field">
                    Il tuo nome
                    <input
                      className="input"
                      value={joinData.memberName}
                      onChange={(event) =>
                        setJoinData((prev) => ({ ...prev, memberName: event.target.value }))
                      }
                      placeholder="Anna"
                    />
                  </label>
                  <label className="field">
                    PIN gruppo
                    <input
                      className="input"
                      type="password"
                      value={joinData.pin}
                      onChange={(event) =>
                        setJoinData((prev) => ({ ...prev, pin: event.target.value }))
                      }
                      placeholder="PIN gruppo"
                    />
                  </label>
                  <label className="field">
                    Codice amministratore programma (opzionale)
                    <input
                      className="input"
                      type="password"
                      value={joinData.adminCode}
                      onChange={(event) =>
                        setJoinData((prev) => ({ ...prev, adminCode: event.target.value }))
                      }
                      placeholder="Codice admin"
                    />
                  </label>
                </div>
                <div className="button-row">
                  <button className="button secondary" onClick={handleJoin} disabled={loading}>
                    Entra nel gruppo
                  </button>
                </div>
              </section>
            </details>

            <details
              className="accordion section"
              open={authPanel === "create"}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  setAuthPanel("create");
                } else if (authPanel === "create") {
                  setAuthPanel("");
                }
              }}
            >
              <summary>Crea gruppo</summary>
              <section className="panel">
                <div className="grid">
                  <label className="field">
                    Nome gruppo
                    <input
                      className="input"
                      value={createData.groupName}
                      onChange={(event) =>
                        setCreateData((prev) => ({ ...prev, groupName: event.target.value }))
                      }
                      placeholder="Es. Weekend al mare"
                    />
                  </label>
                  <label className="field">
                    Il tuo nome
                    <input
                      className="input"
                      value={createData.memberName}
                      onChange={(event) =>
                        setCreateData((prev) => ({ ...prev, memberName: event.target.value }))
                      }
                      placeholder="Mario"
                    />
                  </label>
                  <label className="field">
                    PIN gruppo
                    <input
                      className="input"
                      type="password"
                      value={createData.pin}
                      onChange={(event) =>
                        setCreateData((prev) => ({ ...prev, pin: event.target.value }))
                      }
                      placeholder="PIN gruppo"
                    />
                  </label>
                  <label className="field">
                    Codice amministratore programma (opzionale)
                    <input
                      className="input"
                      type="password"
                      value={createData.adminCode}
                      onChange={(event) =>
                        setCreateData((prev) => ({ ...prev, adminCode: event.target.value }))
                      }
                      placeholder="Codice admin"
                    />
                  </label>
                </div>
                <div className="button-row">
                  <button className="button" onClick={handleCreate} disabled={loading}>
                    Crea e continua
                  </button>
                </div>
              </section>
            </details>
          </>
        ) : (
          <>
            <section className="panel span-2">
              <div className="split">
                <div>
                  <h2 className="panel-title">{group?.name || "Gruppo attivo"}</h2>
                  <p className="muted">
                    ID gruppo: <strong>{session.groupId}</strong>
                  </p>
                  {inviteLink ? (
                    <p className="muted">
                      Link invito: <strong>{inviteLink}</strong>
                    </p>
                  ) : null}
                  <p className="muted">
                    Utente attivo: <strong>{session.memberName}</strong>
                  </p>
                </div>
                <div className="button-row">
                  <button className="button ghost" onClick={handleCopyLink} disabled={loading}>
                    Copia link
                  </button>
                  <button className="button ghost" onClick={refreshSummary} disabled={loading}>
                    Aggiorna
                  </button>
                  <button className="button ghost" onClick={handleLogout}>
                    Esci
                  </button>
                </div>
              </div>
              <div className="card">
                <strong>Saldo personale</strong>
                <div className="row">
                  <span className="pill-slim pill-warning">
                    Da pagare: {formatEur(personalBalance.owe)}
                  </span>
                  <span className="pill-slim pill-success">
                    Da ricevere: {formatEur(personalBalance.receive)}
                  </span>
                </div>
              </div>
              <div className="card">
                <strong>Totali del gruppo</strong>
                <div className="row">
                  <span className="pill-slim">
                    Speso totale: {formatEur(groupTotals.totalSpent)}
                  </span>
                  <span className="pill-slim pill-success">
                    Hai pagato: {formatEur(groupTotals.paidByMe)}
                  </span>
                </div>
              </div>
            </section>

            <section className="panel section" id="expense">
              <SectionHeader
                title={editingExpenseId ? "Modifica spesa" : "Nuova spesa"}
                help="Inserisci titolo, importo e partecipanti. Le percentuali sono pesi."
                onHelp={handleHelp}
              />
              <div className="grid">
                <label className="field">
                  Titolo
                  <input
                    className="input"
                    value={expenseData.title}
                    onChange={(event) =>
                      setExpenseData((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Cena"
                  />
                </label>
                <label className="field">
                  Importo
                  <input
                    className="input"
                    value={expenseData.amount}
                    onChange={(event) =>
                      setExpenseData((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    placeholder="45,50"
                  />
                </label>
                <label className="field">
                  Pagatore
                  <select
                    className="select"
                    value={expenseData.payerId}
                    onChange={(event) =>
                      setExpenseData((prev) => ({ ...prev, payerId: event.target.value }))
                    }
                  >
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid">
                <strong>Partecipanti (peso %)</strong>
                {members.map((member) => {
                  const info = participantWeights[member.id] || {
                    selected: true,
                    weight: "100",
                  };
                  return (
                    <div className="member-row" key={member.id}>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={info.selected}
                          onChange={(event) =>
                            setParticipantWeights((prev) => ({
                              ...prev,
                              [member.id]: { ...info, selected: event.target.checked },
                            }))
                          }
                        />
                        {member.name}
                      </label>
                      <select
                        className="select"
                        value={info.weight}
                        onChange={(event) =>
                          setParticipantWeights((prev) => ({
                            ...prev,
                            [member.id]: { ...info, weight: event.target.value },
                          }))
                        }
                      >
                        {WEIGHTS.map((weight) => (
                          <option key={weight} value={weight}>
                            {weight}%
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="button-row">
                <button className="button" onClick={handleCreateExpense} disabled={loading}>
                  {editingExpenseId ? "Aggiorna spesa" : "Salva spesa"}
                </button>
                {editingExpenseId ? (
                  <button className="button ghost" onClick={handleCancelEdit} disabled={loading}>
                    Annulla
                  </button>
                ) : null}
              </div>
            </section>

            <section className="panel section" id="expenses">
              <SectionHeader
                title="Spese recenti"
                help="Elenco delle ultime spese registrate nel gruppo."
                onHelp={handleHelp}
              />
              <div className="list">
                {expenses.length === 0 ? (
                  <div className="notice">Nessuna spesa registrata.</div>
                ) : (
                  expenses.map((expense) => (
                    <div className="card" key={expense.id}>
                      <div className="row">
                        <strong>{expense.title}</strong>
                        <span className="tag">{formatEur(expense.amount_cents)}</span>
                      </div>
                      <div className="muted">
                        Pagato da <span className="pill-slim pill-success">{expense.payer_name}</span>
                      </div>
                      <div className="button-row">
                        <button
                          className="button ghost"
                          onClick={() => handleEditExpense(expense)}
                          disabled={loading}
                        >
                          Modifica
                        </button>
                        <button
                          className="button ghost"
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={loading}
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>


            <section className="panel section" id="advanced">
              <SectionHeader
                title="Avanzate"
                help="Strumenti di gestione avanzata del gruppo."
                onHelp={handleHelp}
              />
              <div className="advanced-grid">
                <section className="panel section" id="trend">
                  <SectionHeader
                    title="Andamento spese"
                    help="Grafico degli ultimi importi registrati nel gruppo."
                    onHelp={handleHelp}
                  />
                  {expenseTrend.length < 2 ? (
                    <div className="muted">Aggiungi almeno 2 spese per vedere il grafico.</div>
                  ) : (
                    <Sparkline values={expenseTrend} />
                  )}
                </section>
                <section className="panel section" id="members">
                  <SectionHeader
                    title="Membri del gruppo"
                    help="Elenco dei partecipanti. Solo l'admin può modificarli."
                    onHelp={handleHelp}
                  />
              <div className="notice">
                Per aggiungere o modificare ruoli admin/co-admin serve il codice admin globale.
              </div>
              <details className="accordion">
                <summary>Strumenti admin</summary>
                {adminUnlocked ? (
                  <div className="button-row">
                    <span className="tag">Ruoli admin attivi</span>
                    <button className="button ghost" onClick={handleLockAdmin} disabled={loading}>
                      Nascondi
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="field">
                      Codice admin globale
                      <input
                        className="input"
                        type="password"
                        value={adminActionCode}
                        onChange={(event) => setAdminActionCode(event.target.value)}
                        placeholder="Codice admin"
                      />
                    </label>
                    <div className="button-row">
                      <button className="button ghost" onClick={handleVerifyAdmin} disabled={loading}>
                        Verifica codice
                      </button>
                    </div>
                  </>
                )}
                {canEditMembers ? (
                  <div className="card">
                    <strong>Aggiungi membro</strong>
                    <div className="grid two">
                      <label className="field">
                        Nome
                        <input
                          className="input"
                          value={newMember.name}
                          onChange={(event) =>
                            setNewMember((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                      </label>
                      {adminUnlocked ? (
                        <label className="field">
                          Ruolo
                          <select
                            className="select"
                            value={newMember.role}
                            onChange={(event) =>
                              setNewMember((prev) => ({ ...prev, role: event.target.value }))
                            }
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="field">
                          Ruolo
                          <input className="input" value="Membro" readOnly />
                        </label>
                      )}
                    </div>
                    <div className="button-row">
                      <button className="button ghost" onClick={handleAddMember} disabled={loading}>
                        Aggiungi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="muted">Solo l'admin può aggiungere membri.</div>
                )}
              </details>
              <div className="list">
                {members.map((member) => (
                  <div className="card" key={member.id}>
                    <div className="row">
                      <strong>{member.name}</strong>
                      {member.is_group_admin ? (
                        <span className="tag">Admin</span>
                      ) : member.is_program_admin ? (
                        <span className="tag">Co-admin</span>
                      ) : null}
                    </div>
                    {canEditMembers ? (
                      <>
                        <label className="field">
                          Nome
                          <input
                            className="input"
                            value={memberEdits[member.id] || ""}
                            onChange={(event) =>
                              handleMemberNameChange(member.id, event.target.value)
                            }
                          />
                        </label>
                        {adminUnlocked ? (
                          <label className="field">
                            Ruolo
                            <select
                              className="select"
                              value={memberRoles[member.id] || "member"}
                              onChange={(event) => handleRoleChange(member.id, event.target.value)}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <div className="button-row">
                          <button
                            className="button ghost"
                            onClick={() => handleSaveMember(member.id)}
                            disabled={loading}
                          >
                            Salva
                          </button>
                          {adminUnlocked ? (
                            <button
                              className="button ghost"
                              onClick={() => handleSaveRole(member.id)}
                              disabled={loading}
                            >
                              Aggiorna ruolo
                            </button>
                          ) : null}
                          <button
                            className="button ghost"
                            onClick={() => handleDeleteMember(member.id)}
                            disabled={loading}
                          >
                            Rimuovi
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="muted">Solo l'admin può modificare i membri.</div>
                    )}
                  </div>
                ))}
              </div>
                </section>

            {adminUnlocked ? (
              <section className="panel section" id="admin">
                <SectionHeader
                  title="Pannello admin"
                  help="Visualizza tutti i gruppi creati con il servizio."
                  onHelp={handleHelp}
                />
                <details className="accordion" open={false}>
                  <summary>Apri pannello</summary>
                  <div className="notice">
                    Elenco completo dei gruppi creati con questo servizio.
                  </div>
                  <div className="button-row">
                    <button className="button ghost" onClick={handleLoadGroups} disabled={loading}>
                      Carica gruppi
                    </button>
                  </div>
                  {adminGroupsLoaded ? (
                    <div className="list">
                      {adminGroups.length === 0 ? (
                        <div className="notice">Nessun gruppo trovato.</div>
                      ) : (
                        adminGroups.map((group) => (
                          <div className="card" key={group.id}>
                            <strong>{group.name}</strong>
                            <div className="muted">ID: {group.id}</div>
                            <div className="muted">
                              Membri: {group.members_count} • Spese: {group.expenses_count}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="muted">Premi “Carica gruppi” per visualizzare.</div>
                  )}
                </details>
              </section>
            ) : null}

            <section className="panel section" id="summary">
              <SectionHeader
                title="Resoconto"
                help="Mostra chi deve pagare chi in base a spese e pagamenti."
                onHelp={handleHelp}
              />
              <div className="list">
                {transactions.length === 0 ? (
                  <div className="notice">Nessun debito attivo.</div>
                ) : (
                  transactions.map((tx) => (
                    <div className="card" key={`${tx.from_id}-${tx.to_id}`}>
                      <strong>
                        {tx.from_name} paga {tx.to_name}
                      </strong>
                      <div className="muted">
                        <span className="pill-slim pill-warning">
                          {formatEur(tx.amount_cents)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="panel section" id="settle">
              <SectionHeader
                title="Pareggia"
                help="Seleziona un debito e registra il pagamento completo."
                onHelp={handleHelp}
              />
              {myDebts.length === 0 ? (
                <div className="notice">Non hai debiti da pareggiare.</div>
              ) : (
                <>
                  <label className="field">
                    Creditore
                    <select
                      className="select"
                      value={settleData.toMemberId}
                      onChange={(event) =>
                        setSettleData({ toMemberId: event.target.value })
                      }
                    >
                      <option value="">Seleziona</option>
                      {myDebts.map((tx) => (
                        <option key={tx.to_id} value={tx.to_id}>
                          {tx.to_name} - {formatEur(tx.amount_cents)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="muted">
                    Il pagamento verrà registrato per l'intero importo selezionato.
                  </div>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      onClick={handleSettle}
                      disabled={loading || !settleData.toMemberId}
                    >
                      Registra pagamento
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="panel section" id="payments">
              <SectionHeader
                title="Storico pagamenti"
                help="Elenco di tutti i pagamenti registrati nel gruppo."
                onHelp={handleHelp}
              />
              <div className="list">
                {settlements.length === 0 ? (
                  <div className="notice">Nessun pagamento registrato.</div>
                ) : (
                  settlements.map((item, idx) => (
                    <div className="card" key={`${item.from_member_id}-${item.to_member_id}-${idx}`}>
                      <strong>
                        {item.from_name} paga {item.to_name}
                      </strong>
                      <div className="muted">
                        <span className="pill-slim pill-success">
                          {formatEur(item.amount_cents)}
                        </span>
                        {item.created_at ? (
                          <span className="muted">
                            {" "}
                            • {new Date(item.created_at).toLocaleDateString("it-IT")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="panel section" id="reset">
              <SectionHeader
                title="Reset dati gruppo"
                help="Azzeramento spese/pagamenti o eliminazione gruppo."
                onHelp={handleHelp}
              />
              <div className="notice">
                Cancella spese e pagamenti del gruppo (i membri restano). Puoi anche eliminare il gruppo.
              </div>
              <label className="field">
                Codice admin globale
                <input
                  className="input"
                  type="password"
                  value={resetCode}
                  onChange={(event) => setResetCode(event.target.value)}
                  placeholder="Codice admin"
                />
              </label>
              <div className="button-row">
                <button className="button ghost" onClick={handleReset} disabled={loading}>
                  Azzeramento
                </button>
                <button className="button secondary" onClick={handleDeleteGroup} disabled={loading}>
                  Elimina gruppo
                </button>
              </div>
            </section>
              </div>
            </section>
          </>
        )}

        <div className="footer span-2">
          {loading ? "Operazione in corso..." : "Online e pronto per mobile."}
        </div>
      </div>
      {session ? (
        <nav className="bottom-bar">
          <button
            className={`bottom-button ${activeSection === "expense" ? "active" : ""}`}
            onClick={() => scrollToSection("expense")}
            type="button"
          >
            <span className="icon">＋</span>
            Spesa
          </button>
          <button
            className={`bottom-button ${activeSection === "summary" ? "active" : ""}`}
            onClick={() => scrollToSection("summary")}
            type="button"
          >
            <span className="icon">≡</span>
            Resoconto
          </button>
          <button
            className={`bottom-button ${activeSection === "settle" ? "active" : ""}`}
            onClick={() => scrollToSection("settle")}
            type="button"
          >
            <span className="icon">✓</span>
            Pareggia
          </button>
          <button
            className={`bottom-button ${activeSection === "advanced" ? "active" : ""}`}
            onClick={() => scrollToSection("advanced")}
            type="button"
          >
            <span className="icon">⚙️</span>
            Avanzate
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function Sparkline({ values }) {
  const width = 280;
  const height = 80;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function SectionHeader({ title, help, onHelp }) {
  return (
    <div className="section-header">
      <h2 className="panel-title">{title}</h2>
      {help ? (
        <button className="help-btn" type="button" onClick={() => onHelp(help)}>
          ?
        </button>
      ) : null}
    </div>
  );
}

function GroupParamWatcher({ onChange }) {
  const params = useSearchParams();

  useEffect(() => {
    onChange(params.get("group") || "");
  }, [params, onChange]);

  return null;
}
