import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, version, fuel, gearbox, year_start, year_end, price_new, is_active, created_at')
      .eq('is_active', true)
      .order('make')

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

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { make, model, version, fuel, gearbox, year_start, year_end, price_new, crawl_config } = body

    if (!make || !model || !fuel) {
      return new Response(JSON.stringify({ error: 'make, model et fuel sont requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        make,
        model,
        version:      version || null,
        fuel,
        gearbox:      gearbox || null,
        year_start:   year_start || null,
        year_end:     year_end || null,
        price_new:    price_new || null,
        is_active:    true,
        crawl_config: crawl_config || {
          keywords: [`${make} ${model} ${version || ''}`.trim()],
          exclude_keywords: [],
          match_threshold: 0.75,
        },
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}