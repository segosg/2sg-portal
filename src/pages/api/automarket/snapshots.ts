import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)

export const GET: APIRoute = async ({ url }) => {
  try {
    const params    = url.searchParams
    const vehicleId = params.get('vehicle_id')
    const days      = parseInt(params.get('days') ?? '90')

    if (!vehicleId) {
      return new Response(JSON.stringify({ error: 'vehicle_id requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('market_snapshots')
      .select('snapshot_date, listing_count, price_median, price_p25, price_p75, price_min, price_max, new_listings, sold_listings, price_drops')
      .eq('vehicle_id', vehicleId)
      .is('source', null)          // agrégé toutes sources
      .gte('snapshot_date', since.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify({ data }), {
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