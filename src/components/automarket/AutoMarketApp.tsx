/**
 * AutoMarketApp.tsx
 * Version branchée sur les API routes Astro → Supabase.
 * Remplace les données mockées par des fetch réels.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'

// ── TYPES ─────────────────────────────────────────────────────────
interface Vehicle {
  id: string
  make: string
  model: string
  version: string | null
  fuel: string
  gearbox: string | null
  year_start: number | null
  year_end: number | null
  price_new: number | null
  is_active: boolean
}

interface Listing {
  id: string
  source: 'lbc' | 'lacentrale' | 'paruvendu'
  external_url: string
  year: number
  mileage: number
  price: number
  price_initial: number
  total_drop: number
  price_drop_count: number
  gearbox: string | null
  color: string | null
  version: string | null
  seller_type: string | null
  location: string
  department: string
  first_seen_at: string
  last_seen_at: string
  days_online: number
  match_score: number
  make: string
  model: string
  fuel: string
}

interface Snapshot {
  snapshot_date: string
  listing_count: number
  price_median: number | null
  price_p25: number | null
  price_p75: number | null
  price_min: number | null
  price_max: number | null
  new_listings: number
  sold_listings: number
  price_drops: number
}

// ── HOOKS DATA ─────────────────────────────────────────────────────
function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/automarket/vehicles')
      .then(r => r.json())
      .then(({ data }) => setVehicles(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { vehicles, loading }
}

function useListings(vehicleId: string | null, filters: Record<string, string>) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)

  const fetchListings = useCallback(() => {
    if (!vehicleId) return
    setLoading(true)
    const params = new URLSearchParams({ vehicle_id: vehicleId, ...filters })
    fetch(`/api/automarket/listings?${params}`)
      .then(r => r.json())
      .then(({ data }) => setListings(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [vehicleId, JSON.stringify(filters)])

  useEffect(() => { fetchListings() }, [fetchListings])

  return { listings, loading, refetch: fetchListings }
}

function useSnapshots(vehicleId: string | null) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  useEffect(() => {
    if (!vehicleId) return
    fetch(`/api/automarket/snapshots?vehicle_id=${vehicleId}&days=90`)
      .then(r => r.json())
      .then(({ data }) => setSnapshots(data ?? []))
      .catch(console.error)
  }, [vehicleId])

  return snapshots
}

// ── RÉGRESSION LINÉAIRE ────────────────────────────────────────────
function useRegression(listings: Listing[]) {
  return useMemo(() => {
    const n = listings.length
    if (n < 2) return { slope: 0, intercept: 0, r2: 0, predict: () => 0, deprPerTenK: 0 }
    const xs = listings.map(l => l.mileage)
    const ys = listings.map(l => l.price)
    const sX = xs.reduce((a, b) => a + b, 0)
    const sY = ys.reduce((a, b) => a + b, 0)
    const sXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
    const sX2 = xs.reduce((s, x) => s + x * x, 0)
    const mY = sY / n
    const slope = (n * sXY - sX * sY) / (n * sX2 - sX * sX)
    const intercept = mY - slope * (sX / n)
    const ssTot = ys.reduce((s, y) => s + (y - mY) ** 2, 0)
    const ssRes = ys.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0)
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
    return {
      slope, intercept, r2,
      predict: (km: number) => Math.max(slope * km + intercept, 5000),
      deprPerTenK: Math.abs(slope * 10000),
    }
  }, [listings])
}

// ── STYLES ─────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');

:root {
  --am-bg:       #080b12;
  --am-surface:  #0d1120;
  --am-surface2: #111828;
  --am-border:   #1c2438;
  --am-border2:  #263049;
  --am-text:     #e8edf5;
  --am-muted:    #5a6a85;
  --am-dim:      #2a3550;
  --am-amber:    #f0a500;
  --am-cyan:     #00c9b1;
  --am-red:      #f05050;
  --am-green:    #3ddc84;
}

.am-root {
  font-family: 'DM Mono', monospace;
  background: var(--am-bg);
  color: var(--am-text);
  min-height: 100vh;
  display: flex;
  font-size: 13px;
}

.am-sidebar {
  width: 216px; flex-shrink: 0;
  background: var(--am-surface);
  border-right: 1px solid var(--am-border);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
.am-logo { padding: 24px 20px 20px; border-bottom: 1px solid var(--am-border); }
.am-logo-mark { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: -0.03em; }
.am-logo-mark span { color: var(--am-amber); }
.am-logo-sub { font-size: 9px; color: var(--am-muted); letter-spacing: 0.16em; text-transform: uppercase; margin-top: 3px; }

.am-nav { padding: 12px; flex: 1; }
.am-nav-section { margin-bottom: 20px; }
.am-nav-label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--am-muted); padding: 0 10px; margin-bottom: 6px; display: block; }
.am-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 6px; font-size: 11px; color: var(--am-muted);
  cursor: pointer; transition: all 0.15s; margin-bottom: 1px;
  border: none; background: none; width: 100%; text-align: left; font-family: 'DM Mono', monospace;
}
.am-nav-item:hover { background: var(--am-surface2); color: var(--am-text); }
.am-nav-item.am-active { background: #f0a50018; color: var(--am-amber); border-left: 2px solid var(--am-amber); padding-left: 8px; }

.am-sidebar-footer { padding: 14px 20px; border-top: 1px solid var(--am-border); font-size: 10px; color: var(--am-muted); display: flex; align-items: center; gap: 6px; }
.am-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--am-green); animation: amPulse 2s infinite; flex-shrink: 0; }
@keyframes amPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

.am-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.am-topbar { height: 52px; border-bottom: 1px solid var(--am-border); display: flex; align-items: center; justify-content: space-between; padding: 0 28px; background: var(--am-bg); position: sticky; top: 0; z-index: 20; gap: 16px; }
.am-topbar-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.am-topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.am-content { padding: 24px 28px; }

.am-stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
.am-stat-card { background: var(--am-surface); border: 1px solid var(--am-border); border-radius: 10px; padding: 18px 20px; position: relative; overflow: hidden; }
.am-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; }
.am-stat-amber::before { background: linear-gradient(90deg,transparent,var(--am-amber),transparent); }
.am-stat-cyan::before  { background: linear-gradient(90deg,transparent,var(--am-cyan),transparent); }
.am-stat-red::before   { background: linear-gradient(90deg,transparent,var(--am-red),transparent); }
.am-stat-green::before { background: linear-gradient(90deg,transparent,var(--am-green),transparent); }
.am-stat-label { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--am-muted); margin-bottom: 8px; }
.am-stat-val { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; margin-bottom: 5px; }
.am-stat-sub { font-size: 10px; color: var(--am-muted); }
.am-amber { color: var(--am-amber); }
.am-cyan  { color: var(--am-cyan); }
.am-red   { color: var(--am-red); }
.am-green { color: var(--am-green); }

.am-panel { background: var(--am-surface); border: 1px solid var(--am-border); border-radius: 10px; overflow: hidden; }
.am-panel-head { display:flex; align-items:center; justify-content:space-between; padding: 14px 18px; border-bottom: 1px solid var(--am-border); }
.am-panel-title { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--am-muted); font-weight: 500; }
.am-panel-body { padding: 18px; }

.am-badge { font-size: 9px; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; }
.am-badge-amber { background: #f0a50018; color: var(--am-amber); border: 1px solid #f0a50033; }
.am-badge-cyan  { background: #00c9b118; color: var(--am-cyan);  border: 1px solid #00c9b133; }
.am-badge-red   { background: #f0505018; color: var(--am-red);   border: 1px solid #f0505033; }

.am-tag { display:inline-flex; align-items:center; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
.am-tag-lbc        { background: #f0a50015; color: var(--am-amber); }
.am-tag-lacentrale { background: #00c9b115; color: var(--am-cyan); }
.am-tag-paruvendu  { background: #3ddc8415; color: var(--am-green); }
.am-tag-new  { background: #3ddc8415; color: var(--am-green); font-size: 9px; padding: 2px 7px; }
.am-tag-drop { background: #f0505015; color: var(--am-red);   font-size: 9px; padding: 2px 7px; }

.am-filter-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 18px; }
.am-filter-pill { padding: 5px 12px; border-radius: 20px; font-size: 11px; border: 1px solid var(--am-border2); color: var(--am-muted); cursor: pointer; transition: all 0.15s; background: none; font-family: 'DM Mono', monospace; }
.am-filter-pill:hover { border-color: #f0a50055; color: var(--am-text); }
.am-filter-pill-on { border-color: var(--am-amber); color: var(--am-amber); background: #f0a50012; }

.am-table { width:100%; border-collapse:collapse; }
.am-table th { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--am-muted); padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--am-border); white-space: nowrap; font-weight: 500; }
.am-table td { padding: 10px 14px; border-bottom: 1px solid var(--am-border); font-size: 11px; vertical-align: middle; }
.am-table tr:last-child td { border-bottom: none; }
.am-table tbody tr:hover td { background: var(--am-surface2); }

.am-model-card { background: var(--am-surface2); border: 1px solid var(--am-border); border-radius: 8px; padding: 13px 14px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 12px; margin-bottom: 8px; width: 100%; text-align: left; font-family: 'DM Mono', monospace; }
.am-model-card:hover { border-color: #f0a50055; }
.am-model-card.am-model-selected { border-color: var(--am-amber); background: #f0a50010; }
.am-model-icon { width: 34px; height: 34px; background: var(--am-dim); border-radius: 6px; display:flex; align-items:center; justify-content:center; font-size: 17px; flex-shrink: 0; }
.am-model-name { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; margin-bottom: 1px; color: var(--am-text); }
.am-model-meta { font-size: 10px; color: var(--am-muted); }
.am-model-count { margin-left: auto; font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: var(--am-amber); }

.am-btn-add { width: 100%; background: transparent; border: 1px dashed var(--am-border2); border-radius: 8px; padding: 11px; color: var(--am-muted); font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.15s; display:flex; align-items:center; justify-content:center; gap: 7px; }
.am-btn-add:hover { border-color: #f0a50077; color: var(--am-amber); }

.am-two-col   { display:grid; grid-template-columns: 1fr 300px; gap: 14px; margin-bottom: 14px; }
.am-three-col { display:grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 14px; }
.am-col-stack { display:flex; flex-direction:column; gap: 14px; }

.am-progress-row { display:flex; align-items:center; gap:10px; margin-bottom: 10px; }
.am-progress-label { font-size: 10px; color: var(--am-muted); width: 80px; flex-shrink: 0; }
.am-progress-bar { flex:1; height: 4px; background: var(--am-dim); border-radius: 2px; overflow: hidden; }
.am-progress-fill { height: 100%; border-radius: 2px; }
.am-progress-val { font-size: 10px; color: var(--am-text); width: 28px; text-align: right; }

.am-empty { text-align:center; padding: 60px 20px; color: var(--am-muted); font-size: 12px; }
.am-loading { text-align:center; padding: 40px; color: var(--am-muted); font-size: 11px; letter-spacing: 0.1em; }

@keyframes amFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.am-fade { animation: amFadeUp 0.3s ease both; }

/* Modal */
.am-modal-overlay { position:fixed; inset:0; z-index:100; background:rgba(8,11,18,0.85); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; }
.am-modal { background: var(--am-surface); border: 1px solid var(--am-border2); border-radius: 12px; width: 480px; font-family: 'DM Mono', monospace; animation: amFadeUp 0.2s ease; }
.am-modal-head { padding: 20px 24px 16px; border-bottom: 1px solid var(--am-border); display:flex; align-items:center; justify-content:space-between; }
.am-modal-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
.am-modal-body { padding: 24px; }
.am-modal-foot { padding: 16px 24px; border-top: 1px solid var(--am-border); display:flex; justify-content:space-between; }

.am-input { width:100%; background: var(--am-surface2); border: 1px solid var(--am-border); border-radius: 6px; padding: 9px 12px; color: var(--am-text); font-family: 'DM Mono', monospace; font-size: 12px; outline: none; transition: border-color 0.2s; }
.am-input:focus { border-color: #f0a50066; }
.am-input-label { display:block; font-size: 10px; color: var(--am-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }

.am-pill-group { display:flex; flex-wrap:wrap; gap:6px; }
.am-pill-opt { padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid var(--am-border); color: var(--am-muted); cursor: pointer; transition: all 0.15s; background: none; font-family: 'DM Mono', monospace; }
.am-pill-opt:hover { border-color: var(--am-border2); color: var(--am-text); }
.am-pill-opt.am-pill-amber { border-color: var(--am-amber); color: var(--am-amber); background: #f0a50015; }
.am-pill-opt.am-pill-cyan  { border-color: var(--am-cyan);  color: var(--am-cyan);  background: #00c9b115; }

.am-btn-primary { background: var(--am-amber); border: none; border-radius: 6px; padding: 8px 20px; color: #0a0d15; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; font-weight: 600; letter-spacing: 0.06em; }
.am-btn-secondary { background: none; border: 1px solid var(--am-border); border-radius: 6px; padding: 8px 16px; color: var(--am-muted); font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; }

.am-scatter { position: relative; }
.am-decay-table { width:100%; border-collapse:collapse; font-size:11px; }
.am-decay-table td { padding: 8px 12px; border-bottom: 1px solid var(--am-border); }
.am-decay-table tr:last-child td { border-bottom: none; }
`

// ── HELPERS ────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('fr-FR')

function getStatus(l: Listing): 'new' | 'drop' | 'none' {
  if (l.days_online <= 4) return 'new'
  if (l.price_drop_count > 0) return 'drop'
  return 'none'
}

function getFuelIcon(fuel: string) {
  const f = fuel.toLowerCase()
  if (f.includes('flex') || f.includes('e85')) return '⛽'
  if (f.includes('elec')) return '⚡'
  if (f.includes('phev') || f.includes('hybride')) return '🔋'
  return '🚗'
}

// ── SCATTER SVG ────────────────────────────────────────────────────
const YEAR_COLORS: Record<number, string> = { 2024:'#5bb3f5', 2023:'#5bf598', 2022:'#f5a95b' }

function ScatterSVG({ listings, predict }: { listings: Listing[], predict: (km: number) => number }) {
  const [hovered, setHovered] = useState<string | null>(null)
  if (!listings.length) return <div className="am-empty">Pas de données</div>

  const W = 520, H = 190
  const P = { t: 10, r: 10, b: 24, l: 50 }
  const kms = listings.map(l => l.mileage)
  const prices = listings.map(l => l.price)
  const minKm = Math.min(...kms), maxKm = Math.max(...kms)
  const minP  = Math.min(...prices) - 1000, maxP = Math.max(...prices) + 1000

  const toX = (km: number) => P.l + ((km - minKm) / (maxKm - minKm || 1)) * (W - P.l - P.r)
  const toY = (p: number)  => P.t + (1 - (p - minP) / (maxP - minP || 1)) * (H - P.t - P.b)

  const hovL = hovered ? listings.find(l => l.id === hovered) : null

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <line x1={P.l} y1={P.t} x2={P.l} y2={H-P.b} stroke="#1c2438" strokeWidth="1"/>
        <line x1={P.l} y1={H-P.b} x2={W-P.r} y2={H-P.b} stroke="#1c2438" strokeWidth="1"/>
        <line x1={toX(minKm)} y1={toY(predict(minKm))} x2={toX(maxKm)} y2={toY(predict(maxKm))}
          stroke="#f0a500" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6"/>
        {listings.map(l => {
          const color = YEAR_COLORS[l.year] ?? '#888'
          const isH = hovered === l.id
          return (
            <circle key={l.id} cx={toX(l.mileage)} cy={toY(l.price)}
              r={isH ? 7 : 5} fill={color} opacity={isH ? 1 : 0.82}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(l.id)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}
        {[minKm, Math.round((minKm+maxKm)/2), maxKm].map(km => (
          <text key={km} x={toX(km)} y={H-P.b+12} textAnchor="middle"
            fill="#3a4a65" fontSize="8" fontFamily="DM Mono, monospace">
            {km >= 1000 ? `${Math.round(km/1000)}k` : km}
          </text>
        ))}
      </svg>
      {hovL && (
        <div style={{ position:'absolute', top:8, right:8, background:'#111828', border:'1px solid #263049', borderRadius:6, padding:'10px 14px', fontSize:11, fontFamily:'DM Mono, monospace', pointerEvents:'none', minWidth:160 }}>
          <div style={{ color: YEAR_COLORS[hovL.year], fontWeight:600, marginBottom:4 }}>{hovL.year} · {hovL.gearbox ?? '—'}</div>
          <div style={{ color:'#e8edf5', marginBottom:2 }}>{fmt(hovL.mileage)} km</div>
          <div style={{ color:'#f0a500', fontSize:14, fontWeight:600, marginBottom:2 }}>{fmt(hovL.price)} €</div>
          <div style={{ color:'#5a6a85' }}>{hovL.location} · {hovL.source.toUpperCase()}</div>
          {hovL.price_drop_count > 0 && <div style={{ color:'#f05050', marginTop:4, fontSize:10 }}>↓ {hovL.price_drop_count} baisse(s)</div>}
          {hovL.external_url && (
            <a href={hovL.external_url} target="_blank" rel="noopener noreferrer"
              style={{ color:'#00c9b1', fontSize:10, display:'block', marginTop:4 }}>
              Voir l'annonce →
            </a>
          )}
        </div>
      )}
      <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
        {Object.entries(YEAR_COLORS).map(([yr, color]) => (
          <div key={yr} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#5a6a85' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color }}/>
            {yr}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ADD MODEL MODAL ────────────────────────────────────────────────
const MAKES = ['Audi','BMW','Citroën','Dacia','Ford','Honda','Hyundai','Kia','Peugeot','Renault','Skoda','Toyota','Volkswagen']
const FUELS = ['essence','diesel','flexifuel','phev','hybride','electrique']

function AddModelModal({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const [form, setForm] = useState({ make:'', model:'', version:'', fuel:'', price_new:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm(f => ({...f, [k]: v})); setError('') }

  async function submit() {
    if (!form.make || !form.model || !form.fuel) { setError('Marque, modèle et énergie requis'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/automarket/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: form.make, model: form.model,
          version: form.version || null, fuel: form.fuel,
          price_new: form.price_new ? parseInt(form.price_new) : null,
        }),
      })
      if (!resp.ok) throw new Error('Erreur serveur')
      onAdded()
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={e => e.stopPropagation()}>
        <div className="am-modal-head">
          <div>
            <div className="am-modal-title">Ajouter un modèle</div>
            <div style={{ fontSize:11, color:'var(--am-muted)', marginTop:4 }}>Le crawler démarrera à la prochaine collecte</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--am-muted)', fontSize:18, cursor:'pointer' }}>×</button>
        </div>
        <div className="am-modal-body">
          <div style={{ marginBottom:16 }}>
            <span className="am-input-label">Marque *</span>
            <div className="am-pill-group">
              {MAKES.map(m => (
                <button key={m} className={`am-pill-opt ${form.make === m ? 'am-pill-amber' : ''}`} onClick={() => set('make', m)}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label className="am-input-label">Modèle *</label>
            <input className="am-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="ex: Focus SW, 308 SW..."/>
          </div>
          <div style={{ marginBottom:16 }}>
            <span className="am-input-label">Énergie *</span>
            <div className="am-pill-group">
              {FUELS.map(f => (
                <button key={f} className={`am-pill-opt ${form.fuel === f ? 'am-pill-cyan' : ''}`} onClick={() => set('fuel', f)}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label className="am-input-label">Finition (optionnel)</label>
            <input className="am-input" value={form.version} onChange={e => set('version', e.target.value)} placeholder="ex: Titanium X Business, Allure Pack..."/>
          </div>
          <div>
            <label className="am-input-label">Prix neuf € (optionnel)</label>
            <input className="am-input" value={form.price_new} onChange={e => set('price_new', e.target.value)} placeholder="ex: 34450" type="number"/>
          </div>
          {error && <div style={{ color:'var(--am-red)', fontSize:11, marginTop:12 }}>{error}</div>}
        </div>
        <div className="am-modal-foot">
          <button className="am-btn-secondary" onClick={onClose}>Annuler</button>
          <button className="am-btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Ajout...' : '+ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ───────────────────────────────────────────────────────
export default function AutoMarketApp() {
  const { vehicles, loading: vLoading } = useVehicles()
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [activeView, setActiveView]      = useState<'market' | 'listings' | 'depreciation'>('market')
  const [showModal, setShowModal]        = useState(false)
  const [vehicleKey, setVehicleKey]      = useState(0) // force refetch vehicles

  // Sélectionner auto le premier véhicule
  useEffect(() => {
    if (vehicles.length && !selectedId) setSelectedId(vehicles[0].id)
  }, [vehicles])

  // Filtres
  const [filterYear,     setFilterYear]     = useState<number | null>(null)
  const [filterGearbox,  setFilterGearbox]  = useState<string | null>(null)
  const [filterMaxKm,    setFilterMaxKm]    = useState<number | null>(null)
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null)

  const apiFilters = useMemo(() => {
    const f: Record<string, string> = {}
    if (filterYear)     f.year      = String(filterYear)
    if (filterGearbox)  f.gearbox   = filterGearbox
    if (filterMaxKm)    f.max_km    = String(filterMaxKm)
    if (filterMaxPrice) f.max_price = String(filterMaxPrice)
    return f
  }, [filterYear, filterGearbox, filterMaxKm, filterMaxPrice])

  const { listings, loading: lLoading } = useListings(selectedId, apiFilters)
  const snapshots = useSnapshots(selectedId)
  const regression = useRegression(listings)

  const currentVehicle = vehicles.find(v => v.id === selectedId)

  // Stats
  const stats = useMemo(() => {
    const prices = listings.map(l => l.price).sort((a,b) => a-b)
    const median = prices.length ? prices[Math.floor(prices.length/2)] : 0
    const drops  = listings.filter(l => l.price_drop_count > 0).length
    const days   = listings.map(l => l.days_online).sort((a,b) => a-b)
    const medDays = days.length ? days[Math.floor(days.length/2)] : 0
    return { median, drops, medDays, count: listings.length }
  }, [listings])

  // Source distribution
  const srcDist = useMemo(() => {
    const c: Record<string, number> = { lbc:0, lacentrale:0, paruvendu:0 }
    listings.forEach(l => c[l.source]++)
    return c
  }, [listings])

  const years = useMemo(() => [...new Set(listings.map(l => l.year))].sort((a,b) => b-a), [listings])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }}/>
      <div className="am-root">

        {/* SIDEBAR */}
        <aside className="am-sidebar">
          <div className="am-logo">
            <div className="am-logo-mark">auto<span>.</span>market</div>
            <div className="am-logo-sub">Market Intelligence</div>
          </div>
          <nav className="am-nav">
            <div className="am-nav-section">
              <span className="am-nav-label">Analyse</span>
              {([['market','◈','Vue marché'],['listings','◎','Annonces'],['depreciation','⟁','Décote']] as const).map(([id, icon, label]) => (
                <button key={id} className={`am-nav-item ${activeView === id ? 'am-active' : ''}`} onClick={() => setActiveView(id)}>
                  <span style={{ width:14, textAlign:'center' }}>{icon}</span>{label}
                </button>
              ))}
            </div>
            <div className="am-nav-section">
              <span className="am-nav-label">Config</span>
              <button className="am-nav-item" onClick={() => setShowModal(true)}>
                <span style={{ width:14, textAlign:'center' }}>＋</span>Nouveau modèle
              </button>
            </div>
            <div className="am-nav-section">
              <span className="am-nav-label" style={{ opacity:0.5 }}>TCO (V2)</span>
              {['⛽ Consommation','🔧 Entretien','⚠ Fiabilité'].map(l => (
                <button key={l} className="am-nav-item" style={{ opacity:0.35, cursor:'not-allowed' }}>{l}</button>
              ))}
            </div>
          </nav>
          <div className="am-sidebar-footer">
            <div className="am-status-dot"/>
            Crawler actif · 07:00
          </div>
        </aside>

        {/* MAIN */}
        <main className="am-main">
          <div className="am-topbar">
            <div className="am-topbar-title">
              {currentVehicle
                ? `${currentVehicle.make} ${currentVehicle.model}${currentVehicle.version ? ' · ' + currentVehicle.version : ''}`
                : 'Sélectionner un modèle'}
            </div>
            <div className="am-topbar-right">
              <span className="am-badge am-badge-amber">{stats.count} annonces</span>
              <span className="am-badge am-badge-cyan">3 sources</span>
              <span className="am-badge am-badge-red">{stats.drops} baisses</span>
            </div>
          </div>

          <div className="am-content">

            {/* FILTERS */}
            <div className="am-filter-row">
              <button className={`am-filter-pill ${!filterYear ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterYear(null)}>Toutes années</button>
              {years.map(y => (
                <button key={y} className={`am-filter-pill ${filterYear === y ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterYear(filterYear === y ? null : y)}>{y}</button>
              ))}
              <button className={`am-filter-pill ${!filterGearbox ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterGearbox(null)}>Toutes boîtes</button>
              <button className={`am-filter-pill ${filterGearbox === 'Automatique' ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterGearbox(filterGearbox === 'Automatique' ? null : 'Automatique')}>Automatique</button>
              <button className={`am-filter-pill ${filterGearbox === 'Manuelle' ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterGearbox(filterGearbox === 'Manuelle' ? null : 'Manuelle')}>Manuelle</button>
              <button className={`am-filter-pill ${filterMaxKm === 50000 ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterMaxKm(filterMaxKm === 50000 ? null : 50000)}>&lt; 50 000 km</button>
              <button className={`am-filter-pill ${filterMaxPrice === 20000 ? 'am-filter-pill-on' : ''}`} onClick={() => setFilterMaxPrice(filterMaxPrice === 20000 ? null : 20000)}>&lt; 20 000 €</button>
            </div>

            {/* STATS */}
            <div className="am-stats-row">
              {[
                { label:'Prix médian marché', val: stats.median ? `${fmt(stats.median)} €` : '—', sub:`${stats.count} annonces`, color:'amber' },
                { label:'Décote / 10 000 km', val: regression.deprPerTenK ? `${fmt(Math.round(regression.deprPerTenK/100)*100)} €` : '—', sub:`R² = ${regression.r2.toFixed(2)}`, color:'cyan' },
                { label:'Durée médiane en ligne', val: `${stats.medDays} j`, sub:'avant disparition', color:'red' },
                { label:`Valeur estimée 60k km`, val: regression.predict ? `${fmt(Math.round(regression.predict(60000)/100)*100)} €` : '—', sub: currentVehicle?.price_new ? `~${Math.round(regression.predict(60000)/currentVehicle.price_new*100)}% du neuf` : '', color:'green' },
              ].map(({ label, val, sub, color }) => (
                <div key={label} className={`am-stat-card am-stat-${color} am-fade`}>
                  <div className="am-stat-label">{label}</div>
                  <div className={`am-stat-val am-${color}`}>{val}</div>
                  <div className="am-stat-sub">{sub}</div>
                </div>
              ))}
            </div>

            {lLoading && <div className="am-loading">Chargement des annonces...</div>}

            {/* VUE MARCHÉ */}
            {activeView === 'market' && !lLoading && (
              <div className="am-two-col">
                <div className="am-panel">
                  <div className="am-panel-head">
                    <span className="am-panel-title">Prix × kilométrage</span>
                    <div style={{ display:'flex', gap:6 }}>
                      {(['lbc','lacentrale','paruvendu'] as const).map(s => (
                        <span key={s} className={`am-tag am-tag-${s}`}>{s === 'lacentrale' ? 'LC' : s === 'paruvendu' ? 'PV' : 'LBC'}</span>
                      ))}
                    </div>
                  </div>
                  <div className="am-panel-body">
                    <ScatterSVG listings={listings} predict={regression.predict}/>
                  </div>
                </div>

                <div className="am-col-stack">
                  <div className="am-panel">
                    <div className="am-panel-head"><span className="am-panel-title">Modèles surveillés</span></div>
                    <div className="am-panel-body">
                      {vLoading ? <div className="am-loading">...</div> : (
                        <>
                          {vehicles.map(v => (
                            <button key={v.id} className={`am-model-card ${selectedId === v.id ? 'am-model-selected' : ''}`} onClick={() => setSelectedId(v.id)}>
                              <div className="am-model-icon">{getFuelIcon(v.fuel)}</div>
                              <div>
                                <div className="am-model-name">{v.make} {v.model}</div>
                                <div className="am-model-meta">{v.version ?? 'Toutes versions'}</div>
                              </div>
                              <div className="am-model-count">{v.id === selectedId ? stats.count : '—'}</div>
                            </button>
                          ))}
                          <button className="am-btn-add" onClick={() => setShowModal(true)}>＋ Ajouter un modèle</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="am-panel">
                    <div className="am-panel-head"><span className="am-panel-title">Sources</span></div>
                    <div className="am-panel-body">
                      {[
                        { key:'lbc', label:'LBC', color:'var(--am-amber)' },
                        { key:'paruvendu', label:'ParuVendu', color:'var(--am-green)' },
                        { key:'lacentrale', label:'La Centrale', color:'var(--am-cyan)' },
                      ].map(({ key, label, color }) => (
                        <div key={key} className="am-progress-row">
                          <div className="am-progress-label" style={{ fontSize:10 }}>{label}</div>
                          <div className="am-progress-bar">
                            <div className="am-progress-fill" style={{ width:`${stats.count ? srcDist[key]/stats.count*100 : 0}%`, background:color }}/>
                          </div>
                          <div className="am-progress-val">{srcDist[key]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {snapshots.length > 0 && (
                    <div className="am-panel">
                      <div className="am-panel-head"><span className="am-panel-title">Prix médian · historique</span></div>
                      <div className="am-panel-body">
                        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:40 }}>
                          {snapshots.map((s, i) => {
                            const prices = snapshots.map(x => x.price_median ?? 0).filter(Boolean)
                            const min = Math.min(...prices), max = Math.max(...prices)
                            const pct = max > min ? ((s.price_median ?? min) - min) / (max - min) : 0.5
                            return (
                              <div key={i} title={`${s.snapshot_date} : ${fmt(s.price_median ?? 0)} €`}
                                style={{ flex:1, borderRadius:'2px 2px 0 0', background:'var(--am-amber)', opacity: i === snapshots.length-1 ? 0.9 : 0.4, height:`${20 + pct * 80}%`, minHeight:4 }}
                              />
                            )
                          })}
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--am-muted)', marginTop:6 }}>
                          <span>{snapshots[0]?.snapshot_date?.slice(5)}</span>
                          <span>{snapshots[snapshots.length-1]?.snapshot_date?.slice(5)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ANNONCES */}
            {activeView === 'listings' && !lLoading && (
              <div className="am-panel">
                <div className="am-panel-head">
                  <span className="am-panel-title">{listings.length} annonces actives</span>
                  <span style={{ fontSize:10, color:'var(--am-muted)' }}>triées par prix</span>
                </div>
                {listings.length === 0
                  ? <div className="am-empty">Aucune annonce — le crawler n'a pas encore tourné ou les filtres sont trop restrictifs.</div>
                  : (
                    <div style={{ overflowX:'auto' }}>
                      <table className="am-table">
                        <thead>
                          <tr>
                            <th>Source</th><th>Année</th><th>Km</th><th>Boîte</th>
                            <th>Prix</th><th>Vendeur</th><th>En ligne</th><th>Statut</th><th>Lieu</th><th>Lien</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...listings].sort((a,b) => a.price - b.price).map(l => {
                            const status = getStatus(l)
                            return (
                              <tr key={l.id}>
                                <td><span className={`am-tag am-tag-${l.source}`}>{l.source === 'lacentrale' ? 'LC' : l.source === 'paruvendu' ? 'PV' : 'LBC'}</span></td>
                                <td>{l.year}</td>
                                <td>{fmt(l.mileage)}</td>
                                <td style={{ color: l.gearbox === 'Automatique' ? 'var(--am-cyan)' : 'var(--am-text)' }}>{l.gearbox ?? '—'}</td>
                                <td>
                                  <div style={{ fontWeight:500 }}>{fmt(l.price)} €</div>
                                  {l.price_drop_count > 0 && <div style={{ color:'var(--am-red)', fontSize:10 }}>↓ −{fmt(l.total_drop)} €</div>}
                                </td>
                                <td style={{ color:'var(--am-muted)' }}>{l.seller_type ?? '—'}</td>
                                <td style={{ color: l.days_online > 30 ? 'var(--am-red)' : 'var(--am-muted)' }}>{l.days_online} j</td>
                                <td>
                                  {status === 'new' && <span className="am-tag am-tag-new">NOUVEAU</span>}
                                  {status === 'drop' && <span className="am-tag am-tag-drop">BAISSE</span>}
                                  {status === 'none' && <span style={{ color:'var(--am-dim)' }}>—</span>}
                                </td>
                                <td style={{ color:'var(--am-muted)' }}>{l.location} · {l.department}</td>
                                <td>
                                  {l.external_url && (
                                    <a href={l.external_url} target="_blank" rel="noopener noreferrer"
                                      style={{ color:'var(--am-cyan)', fontSize:10 }}>→</a>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
            )}

            {/* DÉCOTE */}
            {activeView === 'depreciation' && !lLoading && (
              <div className="am-two-col">
                <div className="am-panel">
                  <div className="am-panel-head"><span className="am-panel-title">Prix observés × kilométrage</span></div>
                  <div className="am-panel-body"><ScatterSVG listings={listings} predict={regression.predict}/></div>
                </div>
                <div className="am-panel">
                  <div className="am-panel-head"><span className="am-panel-title">Jalons de décote</span></div>
                  <div className="am-panel-body">
                    <table className="am-decay-table">
                      <tbody>
                        {[0,20000,40000,60000,80000,100000,130000,160000,200000].map(km => {
                          const est = regression.predict(km)
                          const pct = currentVehicle?.price_new ? Math.round(est/currentVehicle.price_new*100) : null
                          return (
                            <tr key={km}>
                              <td style={{ color:'var(--am-muted)' }}>{km === 0 ? 'Neuf' : `${km/1000}k km`}</td>
                              <td style={{ color:'var(--am-amber)', fontWeight:500 }}>{fmt(Math.round(est/100)*100)} €</td>
                              <td style={{ color:'var(--am-muted)' }}>{pct ? `${pct}%` : '—'}</td>
                              <td style={{ color:'var(--am-red)', fontSize:10 }}>
                                {currentVehicle?.price_new ? `−${fmt(Math.round((currentVehicle.price_new - est)/100)*100)} €` : ''}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--am-border)', fontSize:11, color:'var(--am-muted)' }}>
                      Décote : <strong style={{ color:'var(--am-text)' }}>{fmt(Math.round(regression.deprPerTenK/100)*100)} € / 10 000 km</strong>
                      <br/>R² = <strong style={{ color:'var(--am-text)' }}>{regression.r2.toFixed(2)}</strong> · {listings.length} annonces
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {showModal && (
        <AddModelModal
          onClose={() => setShowModal(false)}
          onAdded={() => { setVehicleKey(k => k+1) }}
        />
      )}
    </>
  )
}