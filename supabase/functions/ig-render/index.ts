// ig-render
// ================================================================
// Renders 1080×1080 PNG "cards" for Instagram posts.
// Uses @resvg/resvg-wasm with custom-loaded Noto font subsets for
// Japanese text, kaomoji (exotic Unicode), and box-drawing chars.
//
// Auth: x-cron-secret header must match CRON_SECRET env var.
//
// POST body:
//   { kind: "test" }                  → render fixed test card, return PNG
//   { kind: "test", upload: true }    → same (upload ignored for now)
//
// Fonts served from https://www.prokaiwa.com/assets/fonts/ig/
// WASM fetched from esm.sh at cold start.
// ================================================================

import {
  Resvg,
  initWasm,
  type ResvgRenderOptions,
} from 'https://esm.sh/@resvg/resvg-wasm@2.6.2'

// -----------------------------------------------------------------------
// Layout constants — tune here, no hunting through code needed
// -----------------------------------------------------------------------
const CARD_SIZE    = 1080
const BG_COLOR     = '#FFF8F0'  // soft cream
const BORDER_COLOR = '#008080'  // teal
const BORDER_WIDTH = 18         // px — inset border
const BORDER_INSET = 24         // px — gap from card edge to border
const TEXT_COLOR   = '#333333'  // dark grey for body text
const TITLE_COLOR  = '#008080'  // teal for title
const FONT_FAMILY  = 'Noto Sans JP'
const FONT_SIZE_TITLE   = 62    // px
const FONT_SIZE_HEADING = 46
const FONT_SIZE_BODY    = 44
const FONT_SIZE_KAOMOJI = 50
const FONT_SIZE_FOOTER  = 36

// -----------------------------------------------------------------------
// Base URL for font files (repo is GitHub Pages site)
// -----------------------------------------------------------------------
const FONT_BASE_URL = 'https://www.prokaiwa.com/assets/fonts/ig'

// Subsetted font files to load — ORDER MATTERS for fallback priority.
// resvg tries fonts in the order they are supplied, per glyph.
const FONT_FILES = [
  'NotoSansJP-Regular-sub.ttf',      // JP, fullwidth, box-drawing, most symbols
  'NotoSansJP-Bold-sub.ttf',         // Bold variant
  'NotoSans-ExoticLatin-sub.ttf',    // ˘ ˶ ᵔ ᵕ ₍ ₎
  'NotoSansGujarati-sub.ttf',        // ૮
  'NotoSansGeorgian-sub.ttf',        // ა
  'NotoSansArmenian-sub.ttf',        // ֊
  'NotoSansSymbols2-sub.ttf',        // ⑅
]

// -----------------------------------------------------------------------
// Module-level lazy cache for wasm init + font buffers
// -----------------------------------------------------------------------
let wasmReady = false
let fontBuffers: Uint8Array[] = []

async function ensureReady(): Promise<void> {
  if (wasmReady) return

  // 1. Init WASM — fetch the binary from esm.sh
  const wasmRes = await fetch(
    'https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm'
  )
  if (!wasmRes.ok) {
    throw new Error(`[wasm-fetch] HTTP ${wasmRes.status}: failed to fetch wasm binary`)
  }
  const wasmBuf = await wasmRes.arrayBuffer()
  await initWasm(wasmBuf)

  // 2. Fetch all font files in parallel
  const results = await Promise.all(
    FONT_FILES.map(async (name) => {
      const url = `${FONT_BASE_URL}/${name}`
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`[font-fetch] HTTP ${res.status} for ${name}`)
      }
      const buf = await res.arrayBuffer()
      return new Uint8Array(buf)
    })
  )
  fontBuffers = results
  wasmReady = true
}

// -----------------------------------------------------------------------
// SVG builder helpers
// -----------------------------------------------------------------------
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface TextLine {
  text: string
  x: number
  y: number
  fontSize: number
  fontWeight?: 'normal' | 'bold'
  fill?: string
  fontFamily?: string
  textAnchor?: 'start' | 'middle' | 'end'
}

function textEl(l: TextLine): string {
  const weight = l.fontWeight ?? 'normal'
  const fill   = l.fill ?? TEXT_COLOR
  const anchor = l.textAnchor ?? 'start'
  const family = l.fontFamily ?? FONT_FAMILY
  return `<text x="${l.x}" y="${l.y}" font-size="${l.fontSize}" font-weight="${weight}" font-family="${escapeXml(family)}" fill="${fill}" text-anchor="${anchor}">${escapeXml(l.text)}</text>`
}

// -----------------------------------------------------------------------
// Test card SVG (exercises every glyph group)
// -----------------------------------------------------------------------
function buildTestCardSvg(): string {
  const cx = CARD_SIZE / 2  // horizontal centre

  // Border rectangle (inset)
  const bx = BORDER_INSET
  const by = BORDER_INSET
  const bw = CARD_SIZE - BORDER_INSET * 2
  const bh = CARD_SIZE - BORDER_INSET * 2

  const lines: string[] = []

  // --- Background ---
  lines.push(`<rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="${BG_COLOR}"/>`)

  // --- Inset teal border ---
  lines.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="${BORDER_COLOR}" stroke-width="${BORDER_WIDTH}" rx="8"/>`)

  // --- Title: 今日の単語 ☆ (Bold, teal, centred) ---
  const titleY = 160
  lines.push(textEl({
    text: '今日の単語 ☆',
    x: cx,
    y: titleY,
    fontSize: FONT_SIZE_TITLE,
    fontWeight: 'bold',
    fill: TITLE_COLOR,
    textAnchor: 'middle',
  }))

  // --- Divider line ---
  lines.push(`<line x1="${BORDER_INSET + 60}" y1="198" x2="${CARD_SIZE - BORDER_INSET - 60}" y2="198" stroke="${BORDER_COLOR}" stroke-width="3"/>`)

  // --- ASCII box containing English + Japanese ---
  // Box drawn with box-drawing chars, centred
  // Line layout: top border, English, Japanese, bottom border
  const boxX = cx
  const boxStartY = 290

  // top border: ┌────────────────────────────────┐
  lines.push(textEl({
    text: '┌────────────────────────────────┐',
    x: boxX, y: boxStartY,
    fontSize: FONT_SIZE_HEADING,
    fontFamily: FONT_FAMILY,
    textAnchor: 'middle',
  }))

  // English line
  lines.push(textEl({
    text: '│  Anyway, let\'s get started!  │',
    x: boxX, y: boxStartY + 70,
    fontSize: FONT_SIZE_BODY,
    textAnchor: 'middle',
  }))

  // Japanese line
  lines.push(textEl({
    text: '│  とにかく、始めよう！  │',
    x: boxX, y: boxStartY + 140,
    fontSize: FONT_SIZE_BODY,
    textAnchor: 'middle',
  }))

  // bottom border: └────────────────────────────────┘
  lines.push(textEl({
    text: '└────────────────────────────────┘',
    x: boxX, y: boxStartY + 210,
    fontSize: FONT_SIZE_HEADING,
    fontFamily: FONT_FAMILY,
    textAnchor: 'middle',
  }))

  // --- Kaomoji section header ---
  const kaoHeaderY = 600
  lines.push(textEl({
    text: 'かおもじ',
    x: cx, y: kaoHeaderY,
    fontSize: FONT_SIZE_HEADING - 6,
    fill: BORDER_COLOR,
    fontWeight: 'bold',
    textAnchor: 'middle',
  }))

  // --- Kaomoji family 1: p()q ---
  lines.push(textEl({
    text: 'p(´∇｀)q',
    x: cx, y: kaoHeaderY + 72,
    fontSize: FONT_SIZE_KAOMOJI,
    textAnchor: 'middle',
  }))

  // --- Kaomoji family 2: ૮₍˶ ₎ა ---
  lines.push(textEl({
    text: '૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა',
    x: cx, y: kaoHeaderY + 148,
    fontSize: FONT_SIZE_KAOMOJI,
    textAnchor: 'middle',
  }))

  // --- Kaomoji family 3: („ ") ---
  lines.push(textEl({
    text: '(„⊙ ֊ ⊙„)!!',
    x: cx, y: kaoHeaderY + 224,
    fontSize: FONT_SIZE_KAOMOJI,
    textAnchor: 'middle',
  }))

  // --- Footer ---
  lines.push(textEl({
    text: '@prokaiwa.english',
    x: cx, y: 1018,
    fontSize: FONT_SIZE_FOOTER,
    fill: BORDER_COLOR,
    fontWeight: 'bold',
    textAnchor: 'middle',
  }))

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${CARD_SIZE}" height="${CARD_SIZE}"
     viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}">
  ${lines.join('\n  ')}
</svg>`
}

// -----------------------------------------------------------------------
// Render SVG → PNG bytes
// -----------------------------------------------------------------------
async function renderCard(svg: string): Promise<Uint8Array> {
  const options: ResvgRenderOptions = {
    font: {
      fontBuffers: fontBuffers,
      defaultFontFamily: FONT_FAMILY,
      // Explicitly map generic family names → our JP font
      sansSerifFamily: FONT_FAMILY,
      serifFamily: FONT_FAMILY,
      monospaceFamily: FONT_FAMILY,
    },
    fitTo: { mode: 'original' },
    dpi: 96,
  }

  const resvg = new Resvg(svg, options)
  const rendered = resvg.render()
  const pngData = rendered.asPng()
  rendered.free()
  resvg.free()
  return pngData
}

// -----------------------------------------------------------------------
// Main handler
// -----------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
      },
    })
  }

  // Auth
  const secret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { kind?: string; upload?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (body.kind !== 'test') {
    return new Response(
      JSON.stringify({ error: `unknown kind: ${body.kind}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Ensure wasm + fonts loaded
  try {
    await ensureReady()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: 'init-failed', detail: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Build SVG
  let svg: string
  try {
    svg = buildTestCardSvg()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: 'svg-build-failed', detail: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Render SVG → PNG
  let pngBytes: Uint8Array
  try {
    pngBytes = await renderCard(svg)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: 'render-failed', detail: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Return PNG
  return new Response(pngBytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(pngBytes.byteLength),
      'Cache-Control': 'no-store',
    },
  })
})
