import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Globe, Lock, Copy, Check, X, Plus, Zap } from "lucide-react";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#080C0A", surface: "#0C140E", border: "#1A2A1E",
  muted: "#2A4A32", body: "#6A9A7A", heading: "#C8F0D8",
  primary: "#3DFF9A", secondary: "#00C8D4", danger: "#FF5A5A",
};
const MONO = "'JetBrains Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["Général", "Rédaction", "Code", "Analyse", "Créatif", "Résumé", "Autre"];
const STATUSES = [
  { value: "draft",    label: "Brouillon", color: "#F59E0B" },
  { value: "valid",    label: "Validé",    color: C.primary },
  { value: "archived", label: "Archivé",   color: C.body },
];
const VAR_SUGGESTIONS = {
  langue:   ["français", "anglais", "espagnol", "allemand", "italien"],
  ton:      ["professionnel", "direct", "pédagogique", "amical", "formel"],
  style:    ["concis et direct", "narratif", "socratique", "bullet points"],
  longueur: ["court (< 200 mots)", "moyen (200-500 mots)", "long (> 500 mots)"],
  format:   ["texte libre", "liste à puces", "tableau", "JSON", "markdown"],
  audience: ["débutant", "praticien", "décideur", "expert technique"],
  domaine:  ["data", "product management", "ingénierie", "marketing", "finance"],
  role:     ["data engineer", "product manager", "développeur", "analyste"],
  nb_points:["3", "5", "7", "10"],
  nb_idees: ["5", "10", "15", "20"],
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputSt = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.heading, padding: "8px 11px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: MONO };
const btnPrimary = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: MONO, background: C.primary, color: C.bg, letterSpacing: "0.03em" };
const btnGhost = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: MONO, background: "transparent", color: C.body };
const labelSt = { fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO };

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractVars(content) {
  return [...new Set([...content.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
}
function applyVars(content, values) {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v || `{{${k}}}`), content);
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUSES.find(x => x.value === status) || STATUSES[0];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", fontFamily: MONO, background: s.color + "18", color: s.color, border: `1px solid ${s.color}33` }}>{s.label.toUpperCase()}</span>;
}

function TagChip({ tag, onRemove }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.surface, border: `1px solid ${C.border}`, color: C.body, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: MONO }}>
    {tag}{onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0, fontSize: 9 }}>✕</button>}
  </span>;
}

// ── Template Engine Slide-over ────────────────────────────────────────────────
function TemplatePanel({ prompt, onClose }) {
  const vars = extractVars(prompt.content);
  const [values, setValues] = useState(() => Object.fromEntries(vars.map(v => [v, ""])));
  const [copied, setCopied] = useState(false);
  const preview = applyVars(prompt.content, values);

  function setVal(k, v) { setValues(prev => ({ ...prev, [k]: v })); }

  async function copy() {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return <>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: "min(500px, 100vw)", background: C.bg, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", boxShadow: `-24px 0 80px rgba(0,0,0,0.7)`, animation: "slideIn 0.22s ease-out" }}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}} input:focus,textarea:focus,select:focus{border-color:${C.primary}!important;outline:none}`}</style>

      {/* Header */}
      <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...labelSt, marginBottom: 5 }}>Template Engine</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.heading, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prompt.title}</div>
        </div>
        <button onClick={onClose} style={btnGhost}><X size={12} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Variables */}
        {vars.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={labelSt}>Variables — {vars.length} détectée{vars.length > 1 ? "s" : ""}</div>
            {vars.map(v => {
              const suggestions = VAR_SUGGESTIONS[v] || [];
              const hasCustom = !suggestions.includes(values[v]) && values[v] !== "";
              return (
                <div key={v} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontFamily: MONO, color: C.secondary }}>{`{{${v}}}`}</span>
                  {suggestions.length > 0 ? <>
                    <select value={suggestions.includes(values[v]) ? values[v] : "__custom__"}
                      onChange={e => setVal(v, e.target.value === "__custom__" ? "" : e.target.value)}
                      style={{ ...inputSt, cursor: "pointer" }}>
                      <option value="" disabled>Choisir…</option>
                      {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="__custom__">✏️ Autre valeur…</option>
                    </select>
                    {(!suggestions.includes(values[v])) && (
                      <input value={values[v]} onChange={e => setVal(v, e.target.value)} placeholder={`Valeur personnalisée pour {{${v}}}…`} style={inputSt} />
                    )}
                  </> : (
                    <input value={values[v]} onChange={e => setVal(v, e.target.value)} placeholder={`Valeur pour {{${v}}}…`} style={inputSt} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px" }}>
            <span style={{ fontSize: 11, color: C.body, fontFamily: MONO }}>// aucune variable détectée dans ce prompt</span>
          </div>
        )}

        {/* Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={labelSt}>Résultat</div>
            <button onClick={copy} style={{ ...btnPrimary, padding: "5px 12px" }}>
              {copied ? <><Check size={11} />Copié !</> : <><Copy size={11} />Copier</>}
            </button>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", fontSize: 11, fontFamily: MONO, color: C.body, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: 100 }}>
            {preview.split(/(\{\{\w+\}\})/g).map((part, i) =>
              /^\{\{\w+\}\}$/.test(part)
                ? <span key={i} style={{ background: C.secondary + "22", color: C.secondary, borderRadius: 3, padding: "0 3px" }}>{part}</span>
                : <span key={i}>{part}</span>
            )}
          </div>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: MONO }}>{preview.length} caractères</div>
        </div>
      </div>
    </div>
  </>;
}

// ── Modal CRUD ────────────────────────────────────────────────────────────────
function PromptModal({ prompt, onSave, onClose }) {
  const isNew = !prompt?.id;
  const [form, setForm] = useState({ title: prompt?.title || "", content: prompt?.content || "", category: prompt?.category || CATEGORIES[0], status: prompt?.status || "draft", tags: prompt?.tags || [], is_public: prompt?.is_public ?? false });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function addTag(e) { if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) { e.preventDefault(); const t = tagInput.trim().replace(/,/g, ""); if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]); setTagInput(""); } }
  async function submit() { if (!form.title.trim() || !form.content.trim()) return; setSaving(true); setError(null); try { await onSave({ ...prompt, ...form }); } catch (e) { setError(e.message); } finally { setSaving(false); } }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 540, boxShadow: "0 24px 80px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px 13px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.heading, fontFamily: MONO }}><span style={{ color: C.primary }}>➜</span> {isNew ? "nouveau prompt" : "modifier prompt"}</span>
          <button onClick={onClose} style={btnGhost}><X size={12} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
          {error && <div style={{ background: "#1A0808", border: "1px solid #3A1010", borderRadius: 6, padding: "9px 12px", color: "#FF8A8A", fontSize: 11, fontFamily: MONO }}>{error}</div>}
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelSt}>Titre *</span>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Un titre mémorable…" style={{ ...inputSt, fontSize: 13, fontWeight: 700 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelSt}>Contenu * — utilise {`{{variable}}`} pour les placeholders</span>
            <textarea value={form.content} onChange={e => set("content", e.target.value)} placeholder={"Écris ton prompt ici…\nEx: Réponds en {{langue}} avec un ton {{ton}}."} rows={6} style={{ ...inputSt, resize: "vertical", lineHeight: 1.7 }} />
            {extractVars(form.content).length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{extractVars(form.content).map(v => <span key={v} style={{ background: C.secondary + "18", border: `1px solid ${C.secondary}33`, color: C.secondary, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontFamily: MONO }}>{`{{${v}}}`}</span>)}</div>}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={labelSt}>Catégorie</span>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={labelSt}>Statut</span>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>{STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelSt}>Tags <span style={{ color: C.muted, fontWeight: 400, textTransform: "none" }}>(Entrée pour ajouter)</span></span>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="api, few-shot, instruction…" style={inputSt} />
            {form.tags.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{form.tags.map(t => <TagChip key={t} tag={t} onRemove={() => set("tags", form.tags.filter(x => x !== t))} />)}</div>}
          </label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {form.is_public ? <Globe size={13} color={C.primary} /> : <Lock size={13} color="#F59E0B" />}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.heading, fontFamily: MONO }}>{form.is_public ? "Visible publiquement" : "Privé"}</div>
                <div style={{ fontSize: 10, color: C.body, marginTop: 1, fontFamily: SANS }}>{form.is_public ? "Affiché dans ton portfolio" : "Visible par toi seul"}</div>
              </div>
            </div>
            <button onClick={() => set("is_public", !form.is_public)} style={{ width: 38, height: 20, borderRadius: 99, border: "none", cursor: "pointer", background: form.is_public ? C.primary : C.border, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 2, left: form.is_public ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: form.is_public ? C.bg : C.body, transition: "left 0.2s" }} />
            </button>
          </div>
        </div>
        <div style={{ padding: "13px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={submit} disabled={saving || !form.title.trim() || !form.content.trim()} style={{ ...btnPrimary, opacity: (saving || !form.title.trim() || !form.content.trim()) ? 0.4 : 1 }}>
            <Zap size={11} />{saving ? "…" : isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prompt Card ───────────────────────────────────────────────────────────────
function PromptCard({ prompt, onEdit, onDelete, onStatusChange, onOpenTemplate, isAdmin }) {
  const [hover, setHover] = useState(false);
  const preview = prompt.content.slice(0, 130) + (prompt.content.length > 130 ? "…" : "");
  const vars = extractVars(prompt.content);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? C.surface : C.bg, border: `1px solid ${hover ? C.muted : C.border}`, borderRadius: 10, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 9, transition: "all 0.15s", boxShadow: hover ? `0 6px 28px rgba(61,255,154,0.05)` : "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            {isAdmin && (prompt.is_public ? <Globe size={9} color={C.primary} /> : <Lock size={9} color="#F59E0B" />)}
            <span style={{ fontSize: 12, fontWeight: 700, color: C.heading, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prompt.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, color: C.body, fontFamily: MONO }}>{prompt.category}</span>
            {isAdmin && <StatusBadge status={prompt.status} />}
          </div>
        </div>
        {isAdmin && <div style={{ display: "flex", gap: 3, opacity: hover ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0 }}>
          <button onClick={() => onEdit(prompt)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.body, cursor: "pointer", padding: "3px 6px", fontSize: 10 }}>✏️</button>
          <button onClick={() => onDelete(prompt.id)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.danger, cursor: "pointer", padding: "3px 6px", fontSize: 10 }}>🗑</button>
        </div>}
      </div>
      <p style={{ margin: 0, fontSize: 10, color: C.body, fontFamily: MONO, lineHeight: 1.7 }}>{preview}</p>
      {vars.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{vars.map(v => <span key={v} style={{ background: C.secondary + "18", border: `1px solid ${C.secondary}33`, color: C.secondary, borderRadius: 4, padding: "1px 5px", fontSize: 9, fontFamily: MONO }}>{`{{${v}}}`}</span>)}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {prompt.tags?.slice(0, 3).map(t => <TagChip key={t} tag={t} />)}
          {prompt.tags?.length > 3 && <span style={{ fontSize: 9, color: C.muted, fontFamily: MONO }}>+{prompt.tags.length - 3}</span>}
        </div>
        <span style={{ fontSize: 9, color: C.muted, fontFamily: MONO, whiteSpace: "nowrap" }}>{new Date(prompt.updated_at).toLocaleDateString("fr-FR")}</span>
      </div>
      <div style={{ display: "flex", gap: 5, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => onOpenTemplate(prompt)} style={{ ...btnPrimary, flex: 1, justifyContent: "center", fontSize: 10 }}>
          <Zap size={10} />Paramétrer
        </button>
        {isAdmin && STATUSES.map(s => (
          <button key={s.value} onClick={() => onStatusChange(prompt.id, s.value)}
            style={{ flex: 1, padding: "5px 3px", fontSize: 8, fontWeight: 700, letterSpacing: "0.05em", borderRadius: 5, fontFamily: MONO, border: `1px solid ${prompt.status === s.value ? s.color : C.border}`, background: prompt.status === s.value ? s.color + "18" : "transparent", color: prompt.status === s.value ? s.color : C.muted, cursor: "pointer" }}>
            {s.label.slice(0, 4).toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function PromptLibrary() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [templatePrompt, setTemplatePrompt] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Toutes");
  const [filterStatus, setFilterStatus] = useState("all");
  const isAdmin = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1";

  const fetchPrompts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let q = supabase.from("prompts").select("*").order("updated_at", { ascending: false });
      if (!isAdmin) q = q.eq("is_public", true);
      const { data, error } = await q;
      if (error) throw error;
      setPrompts(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  async function handleSave(prompt) {
    const p = { title: prompt.title, content: prompt.content, category: prompt.category, status: prompt.status, tags: prompt.tags, is_public: prompt.is_public, updated_at: new Date().toISOString() };
    if (prompt.id) { const { error } = await supabase.from("prompts").update(p).eq("id", prompt.id); if (error) throw error; }
    else { const { error } = await supabase.from("prompts").insert([{ ...p, created_at: new Date().toISOString() }]); if (error) throw error; }
    setModal(null); await fetchPrompts();
  }
  async function handleDelete(id) {
    if (!window.confirm("Supprimer ce prompt ?")) return;
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    await fetchPrompts();
  }
  async function handleStatusChange(id, status) {
    const { error } = await supabase.from("prompts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    await fetchPrompts();
  }

  const filtered = prompts.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q)))
      && (filterCat === "Toutes" || p.category === filterCat)
      && (filterStatus === "all" || p.status === filterStatus);
  });

  const counts = { all: prompts.length, draft: 0, valid: 0, archived: 0 };
  prompts.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  return (
    <div style={{ display: "flex", minHeight: "60vh", background: C.bg, color: C.heading, fontFamily: SANS }}>
      <style>{`*{box-sizing:border-box} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px} select option{background:${C.surface};color:${C.heading}} input::placeholder,textarea::placeholder{color:${C.muted}} input:focus,textarea:focus,select:focus{border-color:${C.primary}!important;outline:none}`}</style>

      {/* Sidebar */}
      <aside style={{ width: 176, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bg, overflowY: "auto" }}>
        <div style={{ padding: "18px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, fontFamily: MONO, marginBottom: 20, letterSpacing: "-0.01em" }}>prompt/lib</div>

          {isAdmin && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 18 }}>
            {[{ label: "Total", value: counts.all, color: C.primary }, { label: "Validés", value: counts.valid, color: C.primary }, { label: "Brouillon", value: counts.draft, color: "#F59E0B" }, { label: "Archivés", value: counts.archived, color: C.body }].map(s => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 9px" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color, fontFamily: MONO, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 8, color: C.muted, marginTop: 2, fontFamily: MONO }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>}

          {isAdmin && <div style={{ marginBottom: 16 }}>
            <div style={{ ...labelSt, marginBottom: 7 }}>Statut</div>
            {[{ value: "all", label: "Tous", color: C.body }, ...STATUSES].map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "5px 7px", borderRadius: 5, border: "none", cursor: "pointer", background: filterStatus === s.value ? C.surface : "transparent", color: filterStatus === s.value ? C.heading : C.body, fontSize: 10, textAlign: "left", marginBottom: 1, fontFamily: MONO }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />{s.label}
              </button>
            ))}
          </div>}

          <div>
            <div style={{ ...labelSt, marginBottom: 7 }}>Catégorie</div>
            {["Toutes", ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setFilterCat(c)}
                style={{ display: "block", width: "100%", padding: "5px 7px", borderRadius: 5, border: "none", cursor: "pointer", background: filterCat === c ? C.surface : "transparent", color: filterCat === c ? C.primary : C.body, fontSize: 10, textAlign: "left", marginBottom: 1, fontFamily: MONO }}>
                {filterCat === c ? `> ${c}` : c}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, fontFamily: MONO, fontSize: 11 }}>_</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="rechercher…" style={{ ...inputSt, paddingLeft: 26 }} />
          </div>
          {isAdmin && <button onClick={() => setModal({ prompt: null })} style={btnPrimary}><Plus size={12} />Nouveau</button>}
        </div>

        <div style={{ flex: 1, padding: 18 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted, fontFamily: MONO, fontSize: 11 }}>
              <span style={{ color: C.primary }}>➜</span>&nbsp;chargement…
            </div>
          ) : error ? (
            <div style={{ background: "#100808", border: "1px solid #2A1010", borderRadius: 8, padding: 18, color: "#FF8A8A", fontFamily: MONO, fontSize: 11 }}>
              Erreur Supabase : {error}<br /><span style={{ color: C.muted, fontSize: 9 }}>Vérifie PUBLIC_SUPABASE_URL et PUBLIC_SUPABASE_ANON_KEY</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, gap: 10 }}>
              <span style={{ fontSize: 32, filter: "grayscale(1)" }}>📖</span>
              <p style={{ color: C.muted, fontSize: 11, fontFamily: MONO, margin: 0 }}>
                {prompts.length === 0 ? (isAdmin ? "// bibliothèque vide — crée ton premier prompt ↗" : "// aucun prompt publié pour l'instant") : "// aucun résultat"}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))", gap: 11 }}>
              {filtered.map(p => <PromptCard key={p.id} prompt={p} isAdmin={isAdmin} onEdit={p => setModal({ prompt: p })} onDelete={handleDelete} onStatusChange={handleStatusChange} onOpenTemplate={setTemplatePrompt} />)}
            </div>
          )}
        </div>
      </main>

      {templatePrompt && <TemplatePanel prompt={templatePrompt} onClose={() => setTemplatePrompt(null)} />}
      {modal && <PromptModal prompt={modal.prompt} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}