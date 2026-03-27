import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Globe, Lock } from "lucide-react";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

const CATEGORIES = ["Général", "Rédaction", "Code", "Analyse", "Créatif", "Résumé", "Autre"];
const STATUSES = [
  { value: "draft",    label: "Brouillon", color: "#f59e0b" },
  { value: "valid",    label: "Validé",    color: "#10b981" },
  { value: "archived", label: "Archivé",   color: "#6b7280" },
];

const inputStyle = { background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,color:"#f1f5f9",padding:"9px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };
const btnBase = { display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer" };
const labelStyle = { fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:"0.06em",textTransform:"uppercase" };
const iconBtn = { background:"#1e293b",border:"none",borderRadius:6,color:"#94a3b8",cursor:"pointer",padding:6,display:"flex" };

function StatusBadge({ status }) {
  const s = STATUSES.find(x=>x.value===status)||STATUSES[0];
  return <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,letterSpacing:"0.05em",background:s.color+"22",color:s.color,border:`1px solid ${s.color}44` }}>{s.label.toUpperCase()}</span>;
}

function TagChip({ tag, onRemove }) {
  return <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:6,padding:"2px 8px",fontSize:12 }}>
    {tag}{onRemove&&<button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",padding:0,lineHeight:1,fontSize:10 }}>✕</button>}
  </span>;
}

function PromptModal({ prompt, onSave, onClose }) {
  const isNew = !prompt?.id;
  const [form,setForm]=useState({ title:prompt?.title||"",content:prompt?.content||"",category:prompt?.category||CATEGORIES[0],status:prompt?.status||"draft",tags:prompt?.tags||[],is_public:prompt?.is_public??false });
  const [tagInput,setTagInput]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState(null);
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  function addTag(e){if((e.key==="Enter"||e.key===",")&&tagInput.trim()){e.preventDefault();const t=tagInput.trim().replace(/,/g,"");if(t&&!form.tags.includes(t))set("tags",[...form.tags,t]);setTagInput("");}}
  async function submit(){if(!form.title.trim()||!form.content.trim())return;setSaving(true);setError(null);try{await onSave({...prompt,...form});}catch(e){setError(e.message);}finally{setSaving(false);}}
  return (
    <div style={{ position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,width:"100%",maxWidth:580,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",maxHeight:"90vh" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:"1px solid #1e293b" }}>
          <h2 style={{ margin:0,fontSize:15,fontWeight:700,color:"#f1f5f9",fontFamily:"monospace" }}>{isNew?"← nouveau prompt":"← modifier prompt"}</h2>
          <button onClick={onClose} style={{ background:"#1e293b",border:"none",borderRadius:8,color:"#94a3b8",cursor:"pointer",padding:"6px 8px" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto",padding:"18px 22px",display:"flex",flexDirection:"column",gap:14 }}>
          {error&&<div style={{ background:"#450a0a",border:"1px solid #991b1b",borderRadius:8,padding:"10px 12px",color:"#fca5a5",fontSize:13 }}>Erreur : {error}</div>}
          <label style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <span style={labelStyle}>Titre *</span>
            <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Un titre mémorable…" style={{ ...inputStyle,fontSize:15,fontWeight:600 }} />
          </label>
          <label style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <span style={labelStyle}>Contenu *</span>
            <textarea value={form.content} onChange={e=>set("content",e.target.value)} placeholder={"Écris ton prompt ici…\nUtilise {{variable}} pour les placeholders."} rows={7} style={{ ...inputStyle,resize:"vertical",fontFamily:"monospace",fontSize:13,lineHeight:1.7 }} />
          </label>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <label style={{ display:"flex",flexDirection:"column",gap:6 }}>
              <span style={labelStyle}>Catégorie</span>
              <select value={form.category} onChange={e=>set("category",e.target.value)} style={{ ...inputStyle,cursor:"pointer" }}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
            </label>
            <label style={{ display:"flex",flexDirection:"column",gap:6 }}>
              <span style={labelStyle}>Statut</span>
              <select value={form.status} onChange={e=>set("status",e.target.value)} style={{ ...inputStyle,cursor:"pointer" }}>{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </label>
          </div>
          <label style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <span style={labelStyle}>Tags <span style={{ color:"#475569",fontWeight:400,textTransform:"none" }}>(Entrée pour ajouter)</span></span>
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={addTag} placeholder="api, few-shot, instruction…" style={inputStyle} />
            {form.tags.length>0&&<div style={{ display:"flex",flexWrap:"wrap",gap:6,marginTop:4 }}>{form.tags.map(t=><TagChip key={t} tag={t} onRemove={()=>set("tags",form.tags.filter(x=>x!==t))} />)}</div>}
          </label>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:10,padding:"12px 14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              {form.is_public?<Globe size={16} color="#10b981"/>:<Lock size={16} color="#f59e0b"/>}
              <div>
                <div style={{ fontSize:13,fontWeight:600,color:"#f1f5f9" }}>{form.is_public?"Visible publiquement":"Privé"}</div>
                <div style={{ fontSize:11,color:"#475569",marginTop:1 }}>{form.is_public?"Affiché dans ton portfolio":"Visible par toi seul"}</div>
              </div>
            </div>
            <button onClick={()=>set("is_public",!form.is_public)} style={{ width:44,height:24,borderRadius:99,border:"none",cursor:"pointer",background:form.is_public?"#10b981":"#1e293b",position:"relative",transition:"background 0.2s" }}>
              <span style={{ position:"absolute",top:3,left:form.is_public?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s" }} />
            </button>
          </div>
        </div>
        <div style={{ padding:"14px 22px",borderTop:"1px solid #1e293b",display:"flex",justifyContent:"flex-end",gap:10 }}>
          <button onClick={onClose} style={{ ...btnBase,background:"#1e293b",color:"#94a3b8" }}>Annuler</button>
          <button onClick={submit} disabled={saving||!form.title.trim()||!form.content.trim()} style={{ ...btnBase,background:"#6366f1",color:"#fff",opacity:(saving||!form.title.trim()||!form.content.trim())?0.5:1 }}>
            {saving?"…":`⚡ ${isNew?"Créer":"Enregistrer"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptCard({ prompt, onEdit, onDelete, onStatusChange, isAdmin }) {
  const [hover,setHover]=useState(false);
  const preview=prompt.content.slice(0,160)+(prompt.content.length>160?"…":"");
  const vars=[...new Set([...prompt.content.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]))];
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ background:hover?"#0f172a":"#0a0f1e",border:`1px solid ${hover?"#334155":"#1e293b"}`,borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:10,transition:"all 0.15s",boxShadow:hover?"0 8px 32px rgba(0,0,0,0.3)":"none" }}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
            {isAdmin&&(prompt.is_public?<Globe size={11} color="#10b981"/>:<Lock size={11} color="#f59e0b"/>)}
            <span style={{ fontSize:14,fontWeight:700,color:"#f1f5f9",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{prompt.title}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <span style={{ fontSize:11,color:"#475569",fontFamily:"monospace" }}>{prompt.category}</span>
            {isAdmin&&<StatusBadge status={prompt.status}/>}
          </div>
        </div>
        {isAdmin&&<div style={{ display:"flex",gap:4,opacity:hover?1:0,transition:"opacity 0.15s",flexShrink:0 }}>
          <button onClick={()=>onEdit(prompt)} style={iconBtn}>✏️</button>
          <button onClick={()=>onDelete(prompt.id)} style={{ ...iconBtn,color:"#f87171" }}>🗑</button>
        </div>}
      </div>
      <p style={{ margin:0,fontSize:12,color:"#64748b",fontFamily:"monospace",lineHeight:1.6 }}>{preview}</p>
      {vars.length>0&&<div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>{vars.map(v=><span key={v} style={{ background:"#312e81",border:"1px solid #4338ca",color:"#a5b4fc",borderRadius:4,padding:"1px 6px",fontSize:11,fontFamily:"monospace" }}>{`{{${v}}}`}</span>)}</div>}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
        <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
          {prompt.tags?.slice(0,4).map(t=><TagChip key={t} tag={t}/>)}
          {prompt.tags?.length>4&&<span style={{ fontSize:11,color:"#475569" }}>+{prompt.tags.length-4}</span>}
        </div>
        <span style={{ fontSize:10,color:"#334155",fontFamily:"monospace",whiteSpace:"nowrap" }}>{new Date(prompt.updated_at).toLocaleDateString("fr-FR")}</span>
      </div>
      {isAdmin&&<div style={{ display:"flex",gap:4,paddingTop:6,borderTop:"1px solid #1e293b" }}>
        {STATUSES.map(s=><button key={s.value} onClick={()=>onStatusChange(prompt.id,s.value)} style={{ flex:1,padding:"4px 0",fontSize:10,fontWeight:600,letterSpacing:"0.04em",borderRadius:6,border:`1px solid ${prompt.status===s.value?s.color:"#1e293b"}`,background:prompt.status===s.value?s.color+"22":"transparent",color:prompt.status===s.value?s.color:"#475569",cursor:"pointer" }}>{s.label.toUpperCase()}</button>)}
      </div>}
    </div>
  );
}

export default function PromptLibrary() {
  const [prompts,setPrompts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [modal,setModal]=useState(null);
  const [search,setSearch]=useState("");
  const [filterCat,setFilterCat]=useState("Toutes");
  const [filterStatus,setFilterStatus]=useState("all");
  const isAdmin=typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("admin")==="1";

  const fetchPrompts=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      let q=supabase.from("prompts").select("*").order("updated_at",{ascending:false});
      if(!isAdmin)q=q.eq("is_public",true);
      const{data,error}=await q;
      if(error)throw error;
      setPrompts(data||[]);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[isAdmin]);

  useEffect(()=>{fetchPrompts();},[fetchPrompts]);

  async function handleSave(prompt){
    const payload={title:prompt.title,content:prompt.content,category:prompt.category,status:prompt.status,tags:prompt.tags,is_public:prompt.is_public,updated_at:new Date().toISOString()};
    if(prompt.id){const{error}=await supabase.from("prompts").update(payload).eq("id",prompt.id);if(error)throw error;}
    else{const{error}=await supabase.from("prompts").insert([{...payload,created_at:new Date().toISOString()}]);if(error)throw error;}
    setModal(null);await fetchPrompts();
  }

  async function handleDelete(id){
    if(!window.confirm("Supprimer ce prompt ?"))return;
    const{error}=await supabase.from("prompts").delete().eq("id",id);
    if(error){alert("Erreur : "+error.message);return;}
    await fetchPrompts();
  }

  async function handleStatusChange(id,status){
    const{error}=await supabase.from("prompts").update({status,updated_at:new Date().toISOString()}).eq("id",id);
    if(error){alert("Erreur : "+error.message);return;}
    await fetchPrompts();
  }

  const filtered=prompts.filter(p=>{
    const q=search.toLowerCase();
    return(!q||p.title.toLowerCase().includes(q)||p.content.toLowerCase().includes(q)||p.tags?.some(t=>t.toLowerCase().includes(q)))
      &&(filterCat==="Toutes"||p.category===filterCat)
      &&(filterStatus==="all"||p.status===filterStatus);
  });

  const counts={all:prompts.length,draft:0,valid:0,archived:0};
  prompts.forEach(p=>{if(counts[p.status]!==undefined)counts[p.status]++;});

  return (
    <div style={{ display:"flex",minHeight:"calc(100vh - 80px)",background:"#020817",color:"#f1f5f9",fontFamily:"system-ui,sans-serif" }}>
      <aside style={{ width:188,flexShrink:0,borderRight:"1px solid #1e293b",background:"#020817",position:"sticky",top:0,alignSelf:"flex-start",height:"calc(100vh - 80px)",overflowY:"auto" }}>
        <div style={{ padding:"20px 16px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:24 }}>
            <div style={{ width:26,height:26,background:"#6366f1",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>⧖</div>
            <span style={{ fontSize:13,fontWeight:800,color:"#f1f5f9",fontFamily:"monospace",letterSpacing:"-0.02em" }}>prompt/lib</span>
          </div>
          {isAdmin&&<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:20 }}>
            {[{label:"Total",value:counts.all,color:"#6366f1"},{label:"Validés",value:counts.valid,color:"#10b981"},{label:"Brouillons",value:counts.draft,color:"#f59e0b"},{label:"Archivés",value:counts.archived,color:"#6b7280"}].map(s=>(
              <div key={s.label} style={{ background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"8px 10px" }}>
                <div style={{ fontSize:18,fontWeight:800,color:s.color,fontFamily:"monospace",lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10,color:"#475569",marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>}
          {isAdmin&&<div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10,color:"#475569",letterSpacing:"0.08em",marginBottom:7,fontWeight:600 }}>STATUT</div>
            {[{value:"all",label:"Tous",color:"#94a3b8"},...STATUSES].map(s=>(
              <button key={s.value} onClick={()=>setFilterStatus(s.value)} style={{ display:"flex",alignItems:"center",gap:7,width:"100%",padding:"6px 8px",borderRadius:7,border:"none",cursor:"pointer",background:filterStatus===s.value?"#1e293b":"transparent",color:filterStatus===s.value?"#f1f5f9":"#64748b",fontSize:12,textAlign:"left",marginBottom:2 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:s.color||"#94a3b8",flexShrink:0 }}/>{s.label||"Tous"}
              </button>
            ))}
          </div>}
          <div>
            <div style={{ fontSize:10,color:"#475569",letterSpacing:"0.08em",marginBottom:7,fontWeight:600 }}>CATÉGORIE</div>
            {["Toutes",...CATEGORIES].map(c=>(
              <button key={c} onClick={()=>setFilterCat(c)} style={{ display:"block",width:"100%",padding:"6px 8px",borderRadius:7,border:"none",cursor:"pointer",background:filterCat===c?"#1e293b":"transparent",color:filterCat===c?"#f1f5f9":"#64748b",fontSize:12,textAlign:"left",marginBottom:2 }}>{c}</button>
            ))}
          </div>
        </div>
      </aside>
      <main style={{ flex:1,display:"flex",flexDirection:"column",minWidth:0 }}>
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:10,flexShrink:0,position:"sticky",top:0,background:"#020817",zIndex:10 }}>
          <div style={{ flex:1,position:"relative" }}>
            <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:13 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" style={{ ...inputStyle,paddingLeft:32 }}/>
          </div>
          {isAdmin&&<button onClick={()=>setModal({prompt:null})} style={{ ...btnBase,background:"#6366f1",color:"#fff",whiteSpace:"nowrap" }}>+ Nouveau prompt</button>}
        </div>
        <div style={{ flex:1,padding:20 }}>
          {loading?(
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#475569",fontFamily:"monospace",fontSize:13 }}>chargement…</div>
          ):error?(
            <div style={{ background:"#450a0a",border:"1px solid #991b1b",borderRadius:10,padding:20,color:"#fca5a5",fontFamily:"monospace",fontSize:13 }}>
              Erreur Supabase : {error}<br/><span style={{ fontSize:11 }}>Vérifie PUBLIC_SUPABASE_URL et PUBLIC_SUPABASE_ANON_KEY</span>
            </div>
          ):filtered.length===0?(
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:12 }}>
              <span style={{ fontSize:40 }}>📖</span>
              <p style={{ color:"#334155",fontSize:14,fontFamily:"monospace",margin:0 }}>
                {prompts.length===0?(isAdmin?"Bibliothèque vide — crée ton premier prompt ↗":"Aucun prompt publié pour l'instant."):"Aucun résultat."}
              </p>
            </div>
          ):(
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12 }}>
              {filtered.map(p=><PromptCard key={p.id} prompt={p} isAdmin={isAdmin} onEdit={p=>setModal({prompt:p})} onDelete={handleDelete} onStatusChange={handleStatusChange}/>)}
            </div>
          )}
        </div>
      </main>
      {modal&&<PromptModal prompt={modal.prompt} onSave={handleSave} onClose={()=>setModal(null)}/>}
    </div>
  );
}