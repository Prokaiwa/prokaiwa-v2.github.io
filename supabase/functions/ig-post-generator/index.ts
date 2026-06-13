// ig-post-generator
// ================================================================
// Generates Instagram post drafts: selects unused content, renders
// 1080×1080 PNG card(s) via resvg-wasm, uploads to storage, emails
// preview + caption via Resend, and logs to ig_posts.
//
// Auth:  x-cron-secret header === CRON_SECRET env var.
// Body:  { style?: 'word'|'phrase'|'dialogue', dryRun?: boolean }
//        style defaults to JST weekday (Mon→word, Wed→phrase,
//        Fri→dialogue, other→word).
// ================================================================

import {
  Resvg,
  initWasm,
  type ResvgRenderOptions,
} from 'https://esm.sh/@resvg/resvg-wasm@2.6.2'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// -----------------------------------------------------------------------
// Layout constants — all tuning lives here
// -----------------------------------------------------------------------
const CARD_SIZE        = 1080
const BG_COLOR         = '#FFF8F0'
const BORDER_COLOR     = '#008080'
const BORDER_WIDTH     = 10          // stroke width (spec: ~10px)
const BORDER_INSET     = 28          // gap from card edge to border (spec: ~28px)
const SAFE_X_MIN       = 110         // content must stay inside x∈[110,970]
const SAFE_X_MAX       = 970
const SAFE_Y_MIN       = 110         // content must stay inside y∈[110,950]
const SAFE_Y_MAX       = 950
const CONTENT_CX       = 540         // horizontal centre
const TEXT_DARK        = '#333333'
const TEXT_MID         = '#666666'
const TEAL             = '#008080'
const FONT_FAMILY      = 'Noto Sans JP'

// Font sizes
const FS_TITLE         = 46          // card title (今日の単語 ☆ etc.)
const FS_WORD_HERO     = 90          // big English word
const FS_WORD_JA       = 44          // word_ja
const FS_BOX_BODY      = 34          // box bubble content
const FS_BOX_BORDER    = 34          // box-drawing border chars
const FS_PKUN          = 64          // P-kun kaomoji
const FS_PHRASE_HERO   = 52          // phrase hero
const FS_DIALOGUE_HERO = 60          // dialogue title
const FS_DIALOGUE_JA   = 40
const FS_CHAR          = 58          // character kaomoji on title slide
const FS_CHAR_BIG      = 64          // character kaomoji in exchange slides
const FS_CHAR_PUNCH    = 72          // Mimi spotlight on punchline slide
const FS_BUBBLE_EN     = 36          // bubble english line
const FS_BUBBLE_JA     = 30          // bubble japanese line
const FS_COUNTER       = 32          // slide counter ②/⑤ etc.
const FS_RECAP         = 30          // key phrase recap strip

// Box-drawing bubble: ~760px wide centred at x=540.
// At FS_BOX_BORDER (34px), a full-width char ≈ 34px wide.
// 760 / 34 ≈ 22 chars total; inner ≈ 20 chars = 20×34 = 680px content width.
// We use a fixed template string length that renders ~760px.
const BOX_TOP    = '╭──────────────────────╮'   // 24 chars
const BOX_MID    = '│                      │'   // 24 chars (sides + 22 spaces)
const BOX_BOT    = '╰──────────────────────╯'   // 24 chars

// -----------------------------------------------------------------------
// Base URLs
// -----------------------------------------------------------------------
const FONT_BASE_URL = 'https://www.prokaiwa.com/assets/fonts/ig'
const LOGO_URL      = 'https://www.prokaiwa.com/assets/images/ig-logo-512.png'

const FONT_FILES = [
  'NotoSansJP-Regular-sub.ttf',
  'NotoSansJP-Bold-sub.ttf',
  'NotoSans-ExoticLatin-sub.ttf',
  'NotoSansGujarati-sub.ttf',
  'NotoSansGeorgian-sub.ttf',
  'NotoSansArmenian-sub.ttf',
  'NotoSansSymbols2-sub.ttf',
]

// -----------------------------------------------------------------------
// Cold-start cache
// -----------------------------------------------------------------------
let wasmReady    = false
let fontBuffers: Uint8Array[] = []
let logoDataUri  = ''          // data:image/png;base64,…

async function ensureReady(): Promise<void> {
  if (wasmReady) return

  // 1. Init WASM
  const wasmRes = await fetch('https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm')
  if (!wasmRes.ok) {
    throw new Error(`[wasm-fetch] HTTP ${wasmRes.status}: failed to fetch wasm binary`)
  }
  await initWasm(await wasmRes.arrayBuffer())

  // 2. Fonts
  const fontResults = await Promise.all(
    FONT_FILES.map(async (name) => {
      const res = await fetch(`${FONT_BASE_URL}/${name}`)
      if (!res.ok) throw new Error(`[font-fetch] HTTP ${res.status} for ${name}`)
      return new Uint8Array(await res.arrayBuffer())
    })
  )
  fontBuffers = fontResults

  // 3. Logo PNG → base64 data URI
  const logoRes = await fetch(LOGO_URL)
  if (!logoRes.ok) throw new Error(`[logo-fetch] HTTP ${logoRes.status}`)
  const logoBuf = await logoRes.arrayBuffer()
  const logoB64 = btoa(String.fromCharCode(...new Uint8Array(logoBuf)))
  logoDataUri = `data:image/png;base64,${logoB64}`

  wasmReady = true
}

// -----------------------------------------------------------------------
// SVG helpers
// -----------------------------------------------------------------------
function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface TextLine {
  text:        string
  x:           number
  y:           number
  fontSize:    number
  fontWeight?: 'normal' | 'bold'
  fill?:       string
  fontFamily?: string
  textAnchor?: 'start' | 'middle' | 'end'
}

function textEl(l: TextLine): string {
  const weight = l.fontWeight ?? 'normal'
  const fill   = l.fill       ?? TEXT_DARK
  const anchor = l.textAnchor ?? 'start'
  const family = l.fontFamily ?? FONT_FAMILY
  return `<text x="${l.x}" y="${l.y}" font-size="${l.fontSize}" font-weight="${weight}" font-family="${escapeXml(family)}" fill="${fill}" text-anchor="${anchor}">${escapeXml(l.text)}</text>`
}

/** Shared card shell: background + teal frame + logo chip */
function cardShell(): string[] {
  const bx = BORDER_INSET
  const by = BORDER_INSET
  const bw = CARD_SIZE - BORDER_INSET * 2
  const bh = CARD_SIZE - BORDER_INSET * 2

  // Logo chip: circle-clipped at bottom-right (centre 920,920, radius 52)
  const logoId    = 'logoClip'
  const logoCx    = 920
  const logoCy    = 920
  const logoR     = 52
  const logoSize  = logoR * 2

  return [
    // Background
    `<rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="${BG_COLOR}"/>`,
    // Teal border frame
    `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="${BORDER_COLOR}" stroke-width="${BORDER_WIDTH}" rx="16"/>`,
    // Logo clip definition
    `<defs><clipPath id="${logoId}"><circle cx="${logoCx}" cy="${logoCy}" r="${logoR}"/></clipPath></defs>`,
    // White backing circle (subtle stroke)
    `<circle cx="${logoCx}" cy="${logoCy}" r="${logoR + 3}" fill="white" stroke="white" stroke-width="3"/>`,
    // Logo image clipped to circle
    `<image href="${logoDataUri}" x="${logoCx - logoR}" y="${logoCy - logoR}" width="${logoSize}" height="${logoSize}" clip-path="url(#${logoId})"/>`,
  ]
}

function wrapSvg(innerLines: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${CARD_SIZE}" height="${CARD_SIZE}"
     viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}">
  ${innerLines.join('\n  ')}
</svg>`
}

/**
 * Build a box-drawing bubble containing up to two text lines (en + ja).
 * Returns an array of SVG <text> elements centred at x=CONTENT_CX.
 * topY = y of the top border line.
 */
function buildBoxBubble(enLine: string, jaLine: string, topY: number): string[] {
  const lineH = FS_BOX_BODY + 12   // 46px per line
  const els: string[] = []

  // Top border
  els.push(textEl({ text: BOX_TOP, x: CONTENT_CX, y: topY, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))
  // en content
  els.push(textEl({ text: enLine, x: CONTENT_CX, y: topY + lineH, fontSize: FS_BOX_BODY, textAnchor: 'middle' }))
  // ja content
  els.push(textEl({ text: jaLine, x: CONTENT_CX, y: topY + lineH * 2, fontSize: FS_BOX_BODY, fill: TEXT_MID, textAnchor: 'middle' }))
  // Bottom border
  els.push(textEl({ text: BOX_BOT, x: CONTENT_CX, y: topY + lineH * 3, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))

  return els
}

// -----------------------------------------------------------------------
// Render helpers
// -----------------------------------------------------------------------
async function renderCard(svg: string): Promise<Uint8Array> {
  const options: ResvgRenderOptions = {
    font: {
      fontBuffers,
      defaultFontFamily: FONT_FAMILY,
      sansSerifFamily:   FONT_FAMILY,
      serifFamily:       FONT_FAMILY,
      monospaceFamily:   FONT_FAMILY,
    },
    fitTo: { mode: 'original' },
    dpi: 96,
  }
  const resvg    = new Resvg(svg, options)
  const rendered = resvg.render()
  const pngData  = rendered.asPng()
  rendered.free()
  resvg.free()
  return pngData
}

// -----------------------------------------------------------------------
// Layout: Word card
// -----------------------------------------------------------------------
interface WordRow { id: number; word: string; word_ja: string; example_en: string; example_ja: string }

function buildWordCardSvg(row: WordRow): string {
  const lines: string[] = [...cardShell()]

  // Title: 今日の単語 ☆
  lines.push(textEl({ text: '今日の単語 ☆', x: CONTENT_CX, y: 190, fontSize: FS_TITLE, fontWeight: 'bold', fill: TEAL, textAnchor: 'middle' }))

  // Divider
  lines.push(`<line x1="${SAFE_X_MIN}" y1="215" x2="${SAFE_X_MAX}" y2="215" stroke="${TEAL}" stroke-width="2.5"/>`)

  // Hero English word
  lines.push(textEl({ text: row.word, x: CONTENT_CX, y: 360, fontSize: FS_WORD_HERO, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'middle' }))

  // word_ja
  lines.push(textEl({ text: row.word_ja, x: CONTENT_CX, y: 430, fontSize: FS_WORD_JA, fill: TEXT_MID, textAnchor: 'middle' }))

  // Box bubble with example lines
  const bubbleTop = 480
  const bubbleEls = buildBoxBubble(row.example_en, row.example_ja, bubbleTop)
  lines.push(...bubbleEls)

  // P-kun pose beneath the bubble (bubbleTop + 4 rows * 46 + 28 padding)
  const pkunY = bubbleTop + 4 * (FS_BOX_BODY + 12) + 60
  lines.push(textEl({ text: 'p(´∇｀)q', x: CONTENT_CX, y: pkunY, fontSize: FS_PKUN, textAnchor: 'middle' }))

  return wrapSvg(lines)
}

// -----------------------------------------------------------------------
// Layout: Phrase card
// -----------------------------------------------------------------------
interface PhraseRow { id: number; phrase_en: string; phrase_ja: string; example_en: string; example_ja: string }

function buildPhraseCardSvg(row: PhraseRow): string {
  const lines: string[] = [...cardShell()]

  // Title: 今日のフレーズ ☆
  lines.push(textEl({ text: '今日のフレーズ ☆', x: CONTENT_CX, y: 190, fontSize: FS_TITLE, fontWeight: 'bold', fill: TEAL, textAnchor: 'middle' }))
  lines.push(`<line x1="${SAFE_X_MIN}" y1="215" x2="${SAFE_X_MAX}" y2="215" stroke="${TEAL}" stroke-width="2.5"/>`)

  // Classic speech-bubble AA style:
  // ＿＿＿＿＿＿＿＿＿ (top flat line)
  // ｜ phrase_en
  // ｜ phrase_ja
  // ￣￣Ｙ￣￣ (tail)
  // P-kun below tail

  const bubbleStartY = 300
  const rowH         = FS_PHRASE_HERO + 16   // 68px

  lines.push(textEl({ text: '＿＿＿＿＿＿＿＿＿＿＿', x: CONTENT_CX, y: bubbleStartY, fontSize: FS_PHRASE_HERO, textAnchor: 'middle' }))
  lines.push(textEl({ text: `｜ ${row.phrase_en}`, x: CONTENT_CX - 180, y: bubbleStartY + rowH, fontSize: FS_PHRASE_HERO, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'start' }))
  lines.push(textEl({ text: `｜ ${row.phrase_ja}`, x: CONTENT_CX - 180, y: bubbleStartY + rowH * 2, fontSize: FS_PHRASE_HERO - 8, fill: TEXT_MID, textAnchor: 'start' }))
  lines.push(textEl({ text: '￣￣￣Ｙ￣￣￣', x: CONTENT_CX, y: bubbleStartY + rowH * 3, fontSize: FS_PHRASE_HERO, textAnchor: 'middle' }))

  // P-kun below tail
  const pkunY = bubbleStartY + rowH * 3 + 70
  lines.push(textEl({ text: 'p(・ω・)q', x: CONTENT_CX, y: pkunY, fontSize: FS_PKUN, textAnchor: 'middle' }))

  // Example lines below P-kun
  const exY = pkunY + 80
  lines.push(textEl({ text: row.example_en, x: CONTENT_CX, y: exY, fontSize: FS_BOX_BODY + 2, fill: TEXT_DARK, textAnchor: 'middle' }))
  lines.push(textEl({ text: row.example_ja, x: CONTENT_CX, y: exY + 46, fontSize: FS_BOX_BODY, fill: TEXT_MID, textAnchor: 'middle' }))

  return wrapSvg(lines)
}

// -----------------------------------------------------------------------
// Layout: Dialogue cards (returns 5 SVG strings)
// -----------------------------------------------------------------------
interface DialogueLine { speaker: 'mimi' | 'ten'; en: string; ja: string; pose: string }
interface DialogueRow  { id: number; title_en: string; title_ja: string; location_ja: string; lines: DialogueLine[] }

// Slide counter glyphs ①②③④⑤
const SLIDE_GLYPHS = ['①', '②', '③', '④', '⑤']

function slideCounter(n: number, total: number): string {
  return `${SLIDE_GLYPHS[n - 1] ?? String(n)}／${SLIDE_GLYPHS[total - 1] ?? String(total)}`
}

function buildDialogueSvgs(row: DialogueRow): string[] {
  const results: string[] = []

  // ── Slide 1: Title ──────────────────────────────────────────────────
  {
    const lines: string[] = [...cardShell()]

    // Slide counter top-right inside frame
    lines.push(textEl({ text: slideCounter(1, 5), x: SAFE_X_MAX - 20, y: SAFE_Y_MIN + 42, fontSize: FS_COUNTER, fill: TEAL, textAnchor: 'end' }))

    // Title header
    lines.push(textEl({ text: '今日の会話 ♪', x: CONTENT_CX, y: 200, fontSize: FS_TITLE, fontWeight: 'bold', fill: TEAL, textAnchor: 'middle' }))
    lines.push(`<line x1="${SAFE_X_MIN}" y1="225" x2="${SAFE_X_MAX}" y2="225" stroke="${TEAL}" stroke-width="2.5"/>`)

    // title_en hero
    lines.push(textEl({ text: row.title_en, x: CONTENT_CX, y: 320, fontSize: FS_DIALOGUE_HERO, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'middle' }))
    lines.push(textEl({ text: row.title_ja, x: CONTENT_CX, y: 380, fontSize: FS_DIALOGUE_JA, fill: TEXT_MID, textAnchor: 'middle' }))
    lines.push(textEl({ text: row.location_ja, x: CONTENT_CX, y: 428, fontSize: FS_DIALOGUE_JA - 6, fill: TEAL, textAnchor: 'middle' }))

    // Both characters' neutral poses side by side
    const mimiNeutral = '૮₍˶ •. • ⑅₎ა'
    const tenNeutral  = '(„• ֊ •„)'
    const charY       = 570
    const mimiX       = CONTENT_CX - 160
    const tenX        = CONTENT_CX + 160
    lines.push(textEl({ text: mimiNeutral, x: mimiX, y: charY, fontSize: FS_CHAR, textAnchor: 'middle' }))
    lines.push(textEl({ text: tenNeutral,  x: tenX,  y: charY, fontSize: FS_CHAR, textAnchor: 'middle' }))

    // Accent decorations
    lines.push(textEl({ text: '☆', x: mimiX - 90, y: charY - 30, fontSize: 36, fill: TEAL, textAnchor: 'middle' }))
    lines.push(textEl({ text: '♪', x: tenX  + 90, y: charY - 30, fontSize: 36, fill: TEAL, textAnchor: 'middle' }))

    results.push(wrapSvg(lines))
  }

  // ── Slides 2–4: Exchange lines ──────────────────────────────────────
  // Setup lines = all but last 2. If >3, merge earliest two onto slide 2.
  const setupLines  = row.lines.slice(0, -2)
  const punchLines  = row.lines.slice(-2)

  // Build slide groups: [[line], [line], [line]] or [[line,line], [line]] etc.
  let slideGroups: DialogueLine[][]
  if (setupLines.length > 3) {
    slideGroups = [
      setupLines.slice(0, 2),         // slide 2: first two merged
      ...setupLines.slice(2).map(l => [l]), // slides 3+
    ]
  } else {
    slideGroups = setupLines.map(l => [l])
  }
  // Pad / cap to exactly 3 exchange slides
  while (slideGroups.length < 3) slideGroups.push([])
  slideGroups = slideGroups.slice(0, 3)

  for (let i = 0; i < 3; i++) {
    const slideN   = i + 2   // slides 2, 3, 4
    const group    = slideGroups[i]
    const lines: string[] = [...cardShell()]

    // Slide counter
    lines.push(textEl({ text: slideCounter(slideN, 5), x: SAFE_X_MAX - 20, y: SAFE_Y_MIN + 42, fontSize: FS_COUNTER, fill: TEAL, textAnchor: 'end' }))

    if (group.length === 0) {
      // Empty slide — just the counter
      results.push(wrapSvg(lines))
      continue
    }

    // If two mini-bubbles stacked (merged slide)
    if (group.length === 2) {
      let bubbleY = 160
      for (const dl of group) {
        const isLeft  = dl.speaker === 'mimi'
        const poseX   = isLeft ? SAFE_X_MIN + 60 : SAFE_X_MAX - 60
        const anchor  = isLeft ? 'start' as const : 'end' as const
        const bubbleX = isLeft ? SAFE_X_MIN + 140 : CONTENT_CX

        lines.push(textEl({ text: dl.pose, x: poseX, y: bubbleY + 44, fontSize: FS_CHAR_BIG - 10, textAnchor: anchor }))

        // Compact box bubble for merged slide
        const bTop = BOX_TOP
        const bBot = BOX_BOT
        const lh   = FS_BOX_BODY - 4
        lines.push(textEl({ text: bTop, x: bubbleX + 120, y: bubbleY, fontSize: lh, textAnchor: 'middle' }))
        lines.push(textEl({ text: dl.en, x: bubbleX + 120, y: bubbleY + lh + 8, fontSize: lh, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'middle' }))
        lines.push(textEl({ text: dl.ja, x: bubbleX + 120, y: bubbleY + (lh + 8) * 2, fontSize: lh - 4, fill: TEXT_MID, textAnchor: 'middle' }))
        lines.push(textEl({ text: bBot, x: bubbleX + 120, y: bubbleY + (lh + 8) * 3, fontSize: lh, textAnchor: 'middle' }))

        bubbleY += (lh + 8) * 4 + 50
      }
      results.push(wrapSvg(lines))
      continue
    }

    // Single line — full treatment
    const dl      = group[0]
    const isLeft  = dl.speaker === 'mimi'
    const poseX   = isLeft ? SAFE_X_MIN + 70 : SAFE_X_MAX - 70
    const anchor  = isLeft ? 'start' as const : 'end' as const

    // Character pose large
    lines.push(textEl({ text: dl.pose, x: poseX, y: 360, fontSize: FS_CHAR_BIG, textAnchor: anchor }))

    // Box bubble centred on card
    const bubbleEls = buildBoxBubble(dl.en, dl.ja, 450)
    // Make en bold by building a custom version
    const lineH     = FS_BOX_BODY + 12
    lines.push(textEl({ text: BOX_TOP, x: CONTENT_CX, y: 450, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))
    lines.push(textEl({ text: dl.en,   x: CONTENT_CX, y: 450 + lineH, fontSize: FS_BOX_BODY, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'middle' }))
    lines.push(textEl({ text: dl.ja,   x: CONTENT_CX, y: 450 + lineH * 2, fontSize: FS_BOX_BODY, fill: TEXT_MID, textAnchor: 'middle' }))
    lines.push(textEl({ text: BOX_BOT, x: CONTENT_CX, y: 450 + lineH * 3, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))

    void bubbleEls // buildBoxBubble result unused here; we built it manually above

    results.push(wrapSvg(lines))
  }

  // ── Slide 5: Punchline ───────────────────────────────────────────────
  {
    const [mimiLine, tenLine] = punchLines.length === 2
      ? punchLines
      : [punchLines[0], punchLines[0]]

    const lines: string[] = [...cardShell()]

    // Slide counter
    lines.push(textEl({ text: slideCounter(5, 5), x: SAFE_X_MAX - 20, y: SAFE_Y_MIN + 42, fontSize: FS_COUNTER, fill: TEAL, textAnchor: 'end' }))

    // Mimi spotlight — her pose big on the left
    const mimiPose = mimiLine.pose
    lines.push(textEl({ text: mimiPose, x: SAFE_X_MIN + 80, y: 280, fontSize: FS_CHAR_PUNCH, textAnchor: 'start' }))

    // Mimi's line bubble — bold, prominent
    const lh = FS_BOX_BODY + 12
    lines.push(textEl({ text: BOX_TOP,    x: CONTENT_CX + 40, y: 200, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))
    lines.push(textEl({ text: mimiLine.en, x: CONTENT_CX + 40, y: 200 + lh, fontSize: FS_BOX_BODY + 2, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'middle' }))
    lines.push(textEl({ text: mimiLine.ja, x: CONTENT_CX + 40, y: 200 + lh * 2, fontSize: FS_BOX_BODY, fill: TEXT_MID, textAnchor: 'middle' }))
    lines.push(textEl({ text: BOX_BOT,    x: CONTENT_CX + 40, y: 200 + lh * 3, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))

    // Ten's reaction pose + line
    const tenPose = tenLine.pose
    lines.push(textEl({ text: tenPose,   x: SAFE_X_MAX - 80, y: 580, fontSize: FS_CHAR_BIG, textAnchor: 'end' }))
    lines.push(textEl({ text: BOX_TOP,   x: CONTENT_CX - 40, y: 500, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))
    lines.push(textEl({ text: tenLine.en, x: CONTENT_CX - 40, y: 500 + lh, fontSize: FS_BOX_BODY, fontWeight: 'bold', fill: TEXT_DARK, textAnchor: 'middle' }))
    lines.push(textEl({ text: tenLine.ja, x: CONTENT_CX - 40, y: 500 + lh * 2, fontSize: FS_BOX_BODY, fill: TEXT_MID, textAnchor: 'middle' }))
    lines.push(textEl({ text: BOX_BOT,   x: CONTENT_CX - 40, y: 500 + lh * 3, fontSize: FS_BOX_BORDER, textAnchor: 'middle' }))

    // Key phrase recap strip — separating line then recap text
    const recapY = SAFE_Y_MAX - 100
    lines.push(`<line x1="${SAFE_X_MIN}" y1="${recapY - 20}" x2="${SAFE_X_MAX}" y2="${recapY - 20}" stroke="${TEAL}" stroke-width="1.5" stroke-dasharray="6,4"/>`)
    lines.push(textEl({ text: row.title_en, x: CONTENT_CX, y: recapY, fontSize: FS_RECAP + 2, fontWeight: 'bold', fill: TEAL, textAnchor: 'middle' }))
    lines.push(textEl({ text: row.title_ja, x: CONTENT_CX, y: recapY + 38, fontSize: FS_RECAP, fill: TEXT_MID, textAnchor: 'middle' }))

    results.push(wrapSvg(lines))
  }

  return results
}

// -----------------------------------------------------------------------
// Caption templates
// -----------------------------------------------------------------------
const HASHTAGS = '#英会話 #英語学習 #毎日英語 #英語フレーズ #日常英会話 #英会話初心者 #英語の勉強 #英単語 #learnenglish #englishstudy #japaneselearners #prokaiwa'

function wordCaption(row: WordRow): string {
  return `【今日の単語】${row.word} ＝ ${row.word_ja}\n\n${row.example_en}\n（${row.example_ja}）\n\n毎日ひとつ、使える英語を p(´∇｀)q\n\n${HASHTAGS}`
}

function phraseCaption(row: PhraseRow): string {
  return `【今日のフレーズ】\n"${row.phrase_en}"\n${row.phrase_ja}\n\n${row.example_en}\n（${row.example_ja}）\n\n今日使ってみよう！ p(｀・ω・´)q\n\n${HASHTAGS}`
}

function dialogueCaption(row: DialogueRow): string {
  return `【今日の会話】${row.title_en}\n${row.title_ja}\n\n最後まで読んだら…クスッとするかも ☆\n（スワイプしてね →）\n\n${HASHTAGS}`
}

// -----------------------------------------------------------------------
// Style derivation from JST weekday
// -----------------------------------------------------------------------
type Style = 'word' | 'phrase' | 'dialogue'

function deriveStyleFromJst(): Style {
  // JST = UTC + 9 hours
  const now    = new Date()
  const jstMs  = now.getTime() + 9 * 60 * 60 * 1000
  const jstDay = new Date(jstMs).getUTCDay()  // 0=Sun … 6=Sat
  if (jstDay === 1) return 'word'      // Monday
  if (jstDay === 3) return 'phrase'    // Wednesday
  if (jstDay === 5) return 'dialogue'  // Friday
  return 'word'
}

function styleLabel(style: Style): string {
  if (style === 'word')     return '今日の単語'
  if (style === 'phrase')   return '今日のフレーズ'
  return '今日の会話'
}

// -----------------------------------------------------------------------
// Date string for storage paths (JST yyyy-mm-dd)
// -----------------------------------------------------------------------
function jstDateString(): string {
  const now   = new Date()
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000
  const d     = new Date(jstMs)
  const yyyy  = d.getUTCFullYear()
  const mm    = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd    = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
      },
    })
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  const cronSecret  = Deno.env.get('CRON_SECRET')
  const providedKey = req.headers.get('x-cron-secret')
  if (!cronSecret || providedKey !== cronSecret) {
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

  // ── Parse body ────────────────────────────────────────────────────────
  let body: { style?: string; dryRun?: boolean } = {}
  try {
    const text = await req.text()
    if (text.trim()) body = JSON.parse(text)
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rawStyle = body.style
  let style: Style
  if (rawStyle === 'word' || rawStyle === 'phrase' || rawStyle === 'dialogue') {
    style = rawStyle
  } else {
    style = deriveStyleFromJst()
  }
  const dryRun = body.dryRun === true

  // ── Env ───────────────────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey      = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'missing-env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // ── WASM / Font / Logo init ───────────────────────────────────────────
  try {
    await ensureReady()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: 'init-failed', detail: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Content selection ─────────────────────────────────────────────────
  let contentId = 0
  let caption   = ''
  let svgStrings: string[] = []
  let heroText  = ''

  try {
    if (style === 'word') {
      const { data, error } = await supabase
        .from('ig_words')
        .select('id, word, word_ja, example_en, example_ja')
        .not('id', 'in',
          supabase.from('ig_posts').select('content_id').eq('style', 'word')
        )
        .order('id')
        .limit(1)
        .single()

      if (error || !data) {
        // Pool exhausted
        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Prokaiwa <alerts@prokaiwa.com>',
              to: ['prokaiwa.english@gmail.com'],
              subject: '⚠️ Prokaiwa: content pool exhausted — word',
              html: '<p>Content pool exhausted for <strong>word</strong>. Please add more content to ig_words.</p>',
            }),
          })
        }
        return new Response(JSON.stringify({ success: false, reason: 'pool_exhausted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const row = data as WordRow
      contentId  = row.id
      heroText   = row.word
      caption    = wordCaption(row)
      svgStrings = [buildWordCardSvg(row)]

    } else if (style === 'phrase') {
      const { data, error } = await supabase
        .from('phrases')
        .select('id, phrase_en, phrase_ja, example_en, example_ja')
        .not('id', 'in',
          supabase.from('ig_posts').select('content_id').eq('style', 'phrase')
        )
        .order('id')
        .limit(1)
        .single()

      if (error || !data) {
        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Prokaiwa <alerts@prokaiwa.com>',
              to: ['prokaiwa.english@gmail.com'],
              subject: '⚠️ Prokaiwa: content pool exhausted — phrase',
              html: '<p>Content pool exhausted for <strong>phrase</strong>. Please add more content to phrases.</p>',
            }),
          })
        }
        return new Response(JSON.stringify({ success: false, reason: 'pool_exhausted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const row = data as PhraseRow
      contentId  = row.id
      heroText   = row.phrase_en
      caption    = phraseCaption(row)
      svgStrings = [buildPhraseCardSvg(row)]

    } else {
      // dialogue
      const { data, error } = await supabase
        .from('ig_dialogues')
        .select('id, title_en, title_ja, location_ja, lines')
        .not('id', 'in',
          supabase.from('ig_posts').select('content_id').eq('style', 'dialogue')
        )
        .order('id')
        .limit(1)
        .single()

      if (error || !data) {
        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Prokaiwa <alerts@prokaiwa.com>',
              to: ['prokaiwa.english@gmail.com'],
              subject: '⚠️ Prokaiwa: content pool exhausted — dialogue',
              html: '<p>Content pool exhausted for <strong>dialogue</strong>. Please add more content to ig_dialogues.</p>',
            }),
          })
        }
        return new Response(JSON.stringify({ success: false, reason: 'pool_exhausted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const row = data as DialogueRow
      contentId  = row.id
      heroText   = row.title_en
      caption    = dialogueCaption(row)
      svgStrings = buildDialogueSvgs(row)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: 'content-select-failed', detail: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Render PNGs (sequential — memory safety for carousel) ─────────────
  const pngBuffers: Uint8Array[] = []
  try {
    for (let i = 0; i < svgStrings.length; i++) {
      const png = await renderCard(svgStrings[i])
      pngBuffers.push(png)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: 'render-failed', detail: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Upload to storage ─────────────────────────────────────────────────
  const dateStr    = jstDateString()
  const imageUrls: string[] = []

  try {
    for (let i = 0; i < pngBuffers.length; i++) {
      const suffix   = i > 0 ? `-${i + 1}` : ''
      const fileName = `${dateStr}-${style}${suffix}.png`
      const { error: upErr } = await supabase.storage
        .from('ig-cards')
        .upload(fileName, pngBuffers[i], { contentType: 'image/png', upsert: true })

      if (upErr) throw new Error(`[storage-upload] slide ${i + 1}: ${upErr.message}`)

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/ig-cards/${fileName}`
      imageUrls.push(publicUrl)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: 'upload-failed', detail: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Email via Resend (skip if dryRun) ─────────────────────────────────
  let emailed = false
  if (!dryRun && resendKey) {
    try {
      const imgTagsHtml = imageUrls
        .map(url => `<img src="${url}" width="400" style="border-radius:8px;margin:8px 0;display:block;" alt="IG card"/>`)
        .join('\n')

      const emailHtml = `
<p style="font-family:sans-serif;font-size:15px;">Today's draft — post when ready</p>
${imgTagsHtml}
<pre style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:13px;font-family:monospace;">${caption}</pre>
<ol style="font-family:sans-serif;font-size:14px;">
  <li>Save the image(s) above</li>
  <li>Copy the caption from the box above</li>
  <li>Post on Instagram</li>
</ol>
`.trim()

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization':  `Bearer ${resendKey}`,
          'Content-Type':   'application/json',
        },
        body: JSON.stringify({
          from:    'Prokaiwa <alerts@prokaiwa.com>',
          to:      ['prokaiwa.english@gmail.com'],
          subject: `📸 IG draft — ${styleLabel(style)}: ${heroText}`,
          html:    emailHtml,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('[email-send] Resend error:', errText)
      } else {
        emailed = true
      }
    } catch (err) {
      // Non-fatal — log but continue
      console.error('[email-send] exception:', err instanceof Error ? err.message : String(err))
    }
  }

  // ── Log to ig_posts (skip if dryRun) ──────────────────────────────────
  if (!dryRun) {
    try {
      const { error: insertErr } = await supabase
        .from('ig_posts')
        .insert({
          style,
          content_id: contentId,
          image_urls: imageUrls,
          caption,
        })
      if (insertErr) {
        console.error('[ig-posts-insert] error:', insertErr.message)
      }
    } catch (err) {
      console.error('[ig-posts-insert] exception:', err instanceof Error ? err.message : String(err))
    }
  }

  // ── Response ──────────────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      success:    true,
      style,
      content_id: contentId,
      images:     imageUrls,
      caption,
      emailed,
    }),
    {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
