import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

// Utilise la service key côté serveur pour les API routes
// Ces routes tournent server-side sur Vercel — la clé n'est pas exposée au client
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = url.searchParams
    const vehicleId  = params.get('vehicle_id')
    const year       = params.get('year')
    const gearbox    = params.get('gearbox')
    const maxKm      = params.get('max_km')
    const maxPrice   = params.get('max_price')
    const sellerType = params.get('seller_type')
    const source     = params.get('source')

    let query = supabase
      .from('v_active_listings')
      .select('*')
      .order('price', { ascending: true })

    if (vehicleId)  query = query.eq('vehicle_id', vehicleId)  // pas dans la vue — filtre optionnel
    if (year)       query = query.eq('year', parseInt(year))
    if (gearbox)    query = query.eq('gearbox', gearbox)
    if (maxKm)      query = query.lte('mileage', parseInt(maxKm))
    if (maxPrice)   query = query.lte('price', parseInt(maxPrice))
    if (sellerType) query = query.eq('seller_type', sellerType)
    if (source)     query = query.eq('source', source)

    const { data, error } = await query

    if (error) throw error

    return new Response(JSON.stringify({ data, count: data?.length ?? 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}