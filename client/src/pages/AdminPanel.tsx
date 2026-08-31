import { useState, useEffect, useCallback } from "react";
import {
  Shield, LogOut, ChevronDown, ChevronUp, Edit2, Trash2,
  Save, X, Users, Calendar, RefreshCw, CheckCircle, AlertCircle
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Registration {
  id: string;
  teamName: string;
  captainName: string;
  email: string;
  phoneNumber: string | null;
  memberCount: number;
  registeredAt: string;
  teamId: string | null;
}

interface Edition {
  id: string;
  seasonNumber: number;
  editionNumber: number;
  theme: string;
  formattedDate: string;
  maxTeams: number;
  registeredCount: number;
  registrations: Registration[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface Team {
  id: string;
  name: string;
  tagline: string | null;
  score: number;
  inviteCode: string;
  members: TeamMember[];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all
      ${ok ? "bg-emerald-900 border border-emerald-500/50 text-emerald-200" : "bg-red-900 border border-red-500/50 text-red-200"}`}>
      {ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
      {msg}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [inputPw, setInputPw] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<"editions" | "teams">("editions");

  // Editions state
  const [editions, setEditions] = useState<Edition[]>([]);
  const [expandedEdition, setExpandedEdition] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<Record<string, string>>({});
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [regDraft, setRegDraft] = useState<Partial<Registration>>({});

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamDraft, setTeamDraft] = useState<Partial<Team>>({});

  // Loading & toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── API helper ─────────────────────────────────────────────────────────────
  const api = useCallback(async (method: string, path: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", "X-Admin-Password": password },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Eroare necunoscută" }));
      throw new Error(err.message || "Eroare server");
    }
    return res.json();
  }, [password]);

  // ─── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "X-Admin-Password": inputPw },
      }).then(r => { if (!r.ok) throw new Error(); });
      setPassword(inputPw);
      setIsAuthed(true);
    } catch {
      setAuthError("Parolă incorectă. Încearcă din nou.");
    }
  };

  // ─── Load data ───────────────────────────────────────────────────────────────
  const loadEditions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("GET", "/api/admin/editions");
      setEditions(data);
    } catch (e: any) { showToast(e.message, false); }
    finally { setLoading(false); }
  }, [api]);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("GET", "/api/admin/teams");
      setTeams(data);
    } catch (e: any) { showToast(e.message, false); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    if (!isAuthed) return;
    if (activeTab === "editions") loadEditions();
    else loadTeams();
  }, [isAuthed, activeTab, loadEditions, loadTeams]);

  // ─── Edition capacity ────────────────────────────────────────────────────────
  const saveCapacity = async (editionId: string) => {
    const val = parseInt(editingCapacity[editionId] ?? "", 10);
    if (isNaN(val) || val < 1) { showToast("Valoare invalidă", false); return; }
    try {
      await api("PATCH", `/api/admin/editions/${editionId}/capacity`, { maxTeams: val });
      setEditingCapacity(c => { const n = { ...c }; delete n[editionId]; return n; });
      showToast("Capacitate actualizată");
      loadEditions();
    } catch (e: any) { showToast(e.message, false); }
  };

  // ─── Registration actions ────────────────────────────────────────────────────
  const deleteReg = async (id: string, editionId: string) => {
    if (!confirm("Ștergi această înregistrare?")) return;
    try {
      await api("DELETE", `/api/admin/registrations/${id}`);
      showToast("Înregistrare ștearsă");
      setEditions(eds => eds.map(ed => ed.id === editionId
        ? { ...ed, registrations: ed.registrations.filter(r => r.id !== id), registeredCount: ed.registeredCount - 1 }
        : ed
      ));
    } catch (e: any) { showToast(e.message, false); }
  };

  const saveReg = async () => {
    if (!editingReg) return;
    try {
      await api("PATCH", `/api/admin/registrations/${editingReg.id}`, regDraft);
      showToast("Înregistrare actualizată");
      setEditions(eds => eds.map(ed => ({
        ...ed,
        registrations: ed.registrations.map(r => r.id === editingReg.id ? { ...r, ...regDraft } : r),
      })));
      setEditingReg(null);
    } catch (e: any) { showToast(e.message, false); }
  };

  // ─── Team actions ─────────────────────────────────────────────────────────────
  const saveTeam = async () => {
    if (!editingTeam) return;
    try {
      await api("PATCH", `/api/admin/teams/${editingTeam.id}`, teamDraft);
      showToast("Echipă actualizată");
      setTeams(ts => ts.map(t => t.id === editingTeam.id ? { ...t, ...teamDraft } : t));
      setEditingTeam(null);
    } catch (e: any) { showToast(e.message, false); }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Ștergi această echipă și toate înregistrările ei?")) return;
    try {
      await api("DELETE", `/api/admin/teams/${id}`);
      showToast("Echipă ștearsă");
      setTeams(ts => ts.filter(t => t.id !== id));
    } catch (e: any) { showToast(e.message, false); }
  };

  // ─── Login screen ─────────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#07020d] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Admin Panel</h1>
            <p className="text-purple-300/60 text-sm mt-1">Transilvania Trivia · Acces Restricționat</p>
          </div>
          <form onSubmit={handleLogin} className="bg-purple-950/40 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <div>
              <label className="text-xs text-purple-300/70 font-medium block mb-1.5">Parolă de Administrator</label>
              <input
                type="password"
                value={inputPw}
                onChange={e => setInputPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-purple-950/60 border border-purple-700/50 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-400/60 transition-colors placeholder:text-purple-500"
                autoFocus
              />
            </div>
            {authError && <p className="text-red-400 text-xs">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold rounded-lg py-2.5 text-sm transition-colors"
            >
              Autentifică-te
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#07020d] text-white">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <header className="border-b border-purple-800/40 bg-[#0c0317]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-white tracking-wide">Admin Panel</span>
          <span className="text-purple-400/60 text-xs">· Transilvania Trivia</span>
        </div>
        <button
          onClick={() => { setIsAuthed(false); setPassword(""); }}
          className="flex items-center gap-1.5 text-purple-400 hover:text-red-400 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Ieșire
        </button>
      </header>

      {/* Tabs */}
      <div className="border-b border-purple-800/30 px-6 flex gap-1 pt-4">
        {(["editions", "teams"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-amber-400 text-purple-950"
                : "text-purple-300/70 hover:text-white"
            }`}
          >
            {tab === "editions" ? (
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Ediții</span>
            ) : (
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Echipe</span>
            )}
          </button>
        ))}
        <button
          onClick={() => activeTab === "editions" ? loadEditions() : loadTeams()}
          className="ml-auto mb-1 flex items-center gap-1 text-purple-400 hover:text-white text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-3">

        {/* ── EDITIONS TAB ── */}
        {activeTab === "editions" && (
          <>
            {loading && <p className="text-purple-400/60 text-sm text-center py-8">Se încarcă edițiile...</p>}
            {editions.map(ed => {
              const isExpanded = expandedEdition === ed.id;
              const isFull = ed.registeredCount >= ed.maxTeams;
              return (
                <div key={ed.id} className="rounded-xl border border-purple-800/40 bg-purple-950/20 overflow-hidden">
                  {/* Edition header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-900/20 transition-colors text-left"
                    onClick={() => setExpandedEdition(isExpanded ? null : ed.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-amber-400/80 tracking-widest uppercase">
                          S{ed.seasonNumber} · E{ed.editionNumber}
                        </span>
                        <span className="text-sm font-medium text-white truncate">{ed.theme}</span>
                      </div>
                      <p className="text-xs text-purple-300/60 mt-0.5">{ed.formattedDate}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isFull ? "bg-red-900/50 text-red-300" : "bg-emerald-900/40 text-emerald-300"
                      }`}>
                        {ed.registeredCount}/{ed.maxTeams}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-purple-800/30 px-4 py-4 space-y-4">
                      {/* Capacity editor */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-purple-300/70 font-medium">Capacitate maximă:</span>
                        <input
                          type="number"
                          min={1}
                          value={editingCapacity[ed.id] ?? ed.maxTeams}
                          onChange={e => setEditingCapacity(c => ({ ...c, [ed.id]: e.target.value }))}
                          className="w-20 bg-purple-950/60 border border-purple-700/50 rounded-lg px-2.5 py-1 text-white text-sm outline-none focus:border-amber-400/60 text-center"
                        />
                        {editingCapacity[ed.id] !== undefined && (
                          <button onClick={() => saveCapacity(ed.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-400 text-purple-950 rounded-lg text-xs font-bold hover:bg-amber-300 transition-colors">
                            <Save className="w-3 h-3" /> Salvează
                          </button>
                        )}
                      </div>

                      {/* Registrations table */}
                      {ed.registrations.length === 0 ? (
                        <p className="text-purple-400/50 text-sm">Nicio echipă înregistrată.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-purple-800/30">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-purple-950/50 text-purple-300/60 text-xs uppercase tracking-wide">
                                <th className="px-3 py-2 text-left">Echipă</th>
                                <th className="px-3 py-2 text-left">Căpitan</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-center">Membri</th>
                                <th className="px-3 py-2 text-right">Acțiuni</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ed.registrations.map((reg, i) => (
                                <tr key={reg.id} className={`border-t border-purple-800/20 ${i % 2 === 0 ? "" : "bg-purple-950/10"}`}>
                                  <td className="px-3 py-2 font-medium text-white">{reg.teamName}</td>
                                  <td className="px-3 py-2 text-purple-200/80">{reg.captainName}</td>
                                  <td className="px-3 py-2 text-purple-300/60 text-xs">{reg.email}</td>
                                  <td className="px-3 py-2 text-center text-purple-200/80">{reg.memberCount}</td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => { setEditingReg(reg); setRegDraft({ teamName: reg.teamName, captainName: reg.captainName, email: reg.email, phoneNumber: reg.phoneNumber ?? "", memberCount: reg.memberCount }); }}
                                        className="p-1 text-purple-400 hover:text-amber-400 transition-colors"
                                        title="Editează"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteReg(reg.id, ed.id)}
                                        className="p-1 text-purple-400 hover:text-red-400 transition-colors"
                                        title="Șterge"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── TEAMS TAB ── */}
        {activeTab === "teams" && (
          <>
            {loading && <p className="text-purple-400/60 text-sm text-center py-8">Se încarcă echipele...</p>}
            {teams.map(team => (
              <div key={team.id} className="rounded-xl border border-purple-800/40 bg-purple-950/20 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{team.name}</span>
                      <span className="text-[10px] font-mono text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded">{team.inviteCode}</span>
                      <span className="text-xs text-purple-300/60">⭐ {team.score} pct</span>
                    </div>
                    {team.tagline && <p className="text-xs text-purple-300/50 mt-0.5 italic">"{team.tagline}"</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {team.members.map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1 text-[11px] bg-purple-900/40 border border-purple-700/30 rounded-full px-2 py-0.5 text-purple-200/70">
                          {m.avatar} {m.name.split(" ")[0]}
                          {m.role === "TEAM_LEADER" && <span className="text-amber-400">👑</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditingTeam(team); setTeamDraft({ name: team.name, tagline: team.tagline ?? "", score: team.score }); }}
                      className="p-1.5 text-purple-400 hover:text-amber-400 transition-colors"
                      title="Editează echipă"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="p-1.5 text-purple-400 hover:text-red-400 transition-colors"
                      title="Șterge echipă"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && teams.length === 0 && (
              <p className="text-purple-400/50 text-sm text-center py-8">Nicio echipă înregistrată.</p>
            )}
          </>
        )}
      </div>

      {/* ── Edit Registration Modal ── */}
      {editingReg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[#0f041e] border border-purple-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Editează Înregistrare</h3>
              <button onClick={() => setEditingReg(null)} className="text-purple-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {[
              { key: "teamName", label: "Nume echipă" },
              { key: "captainName", label: "Căpitan" },
              { key: "email", label: "Email" },
              { key: "phoneNumber", label: "Telefon" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-purple-300/70 block mb-1">{label}</label>
                <input
                  value={(regDraft as any)[key] ?? ""}
                  onChange={e => setRegDraft(d => ({ ...d, [key]: e.target.value }))}
                  className="w-full bg-purple-950/60 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-purple-300/70 block mb-1">Nr. membri</label>
              <input
                type="number" min={1} max={10}
                value={regDraft.memberCount ?? 1}
                onChange={e => setRegDraft(d => ({ ...d, memberCount: parseInt(e.target.value) }))}
                className="w-24 bg-purple-950/60 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60 text-center"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveReg} className="flex-1 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold rounded-lg py-2 text-sm transition-colors flex items-center justify-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Salvează
              </button>
              <button onClick={() => setEditingReg(null)} className="px-4 text-purple-300 hover:text-white border border-purple-700/50 rounded-lg text-sm transition-colors">
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Team Modal ── */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[#0f041e] border border-purple-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Editează Echipă</h3>
              <button onClick={() => setEditingTeam(null)} className="text-purple-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {[
              { key: "name", label: "Nume echipă" },
              { key: "tagline", label: "Slogan" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-purple-300/70 block mb-1">{label}</label>
                <input
                  value={(teamDraft as any)[key] ?? ""}
                  onChange={e => setTeamDraft(d => ({ ...d, [key]: e.target.value }))}
                  className="w-full bg-purple-950/60 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-purple-300/70 block mb-1">Scor</label>
              <input
                type="number" min={0}
                value={teamDraft.score ?? 0}
                onChange={e => setTeamDraft(d => ({ ...d, score: parseInt(e.target.value) }))}
                className="w-28 bg-purple-950/60 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-400/60 text-center"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveTeam} className="flex-1 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold rounded-lg py-2 text-sm transition-colors flex items-center justify-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Salvează
              </button>
              <button onClick={() => setEditingTeam(null)} className="px-4 text-purple-300 hover:text-white border border-purple-700/50 rounded-lg text-sm transition-colors">
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
