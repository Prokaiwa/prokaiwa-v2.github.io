#!/usr/bin/env python3
"""
Font subsetting script for prokaiwa IG renderer.
Produces subsetted TTF files in assets/fonts/ig/
Run: python3 assets/fonts/ig/subset_fonts.py
"""
from fontTools.ttLib import TTFont
from fontTools import subset as ftsubset
from fontTools.varLib import instancer
import os

FONT_DIR = "/tmp/ig_fonts_raw"
OUT_DIR = "/Users/davidscantee/Desktop/prokaiwa-v2/assets/fonts/ig"
os.makedirs(OUT_DIR, exist_ok=True)

# -----------------------------------------------------------------------
# 1. Build the codepoints list for JP fonts
# -----------------------------------------------------------------------
jp_ranges = []
# ASCII printable
jp_ranges.extend(range(0x0020, 0x007F))
# CJK punctuation, symbols, compatibility
jp_ranges.extend(range(0x3000, 0x303F + 1))
# Hiragana
jp_ranges.extend(range(0x3040, 0x309F + 1))
# Katakana
jp_ranges.extend(range(0x30A0, 0x30FF + 1))
# Fullwidth & Halfwidth Forms (includes halfwidth katakana U+FF61-FF9F)
jp_ranges.extend(range(0xFF00, 0xFFEF + 1))
# CJK Compatibility
jp_ranges.extend(range(0x3300, 0x33FF + 1))

# Kanji from seed text
SEED_KANJI = (
    "今日週単語会話例文英語言話何他別腹個十百千万円人時分年月火水木金土曜朝昼夜食飲見聞"
    "行来帰買売読書学校生先友達家族母父兄弟姉妹犬猫好嫌大小高安新古早遅多少長短強弱楽"
    "難簡単元気天気雨雪風暑寒春夏秋冬駅電車道店仕事社休旅写真音映画試験質問答練習復予"
    "意味使作思知出入上下中外前後左右東西南北名字国語体心手足目耳口頭顔声待立座歩走泳"
    "飛笑泣怒喜幸残念全部半毎週回度番緒計画終始開閉持取渡送届着脱洗掃除料理野菜肉魚卵"
    "米茶酒水牛乳果物"
)

# -----------------------------------------------------------------------
# 1b. DYNAMIC kanji harvest — scan actual content sources so the subset
#     always covers what we really render. Re-run this script whenever
#     seed content is added (ig_words / ig_dialogues top-ups).
# -----------------------------------------------------------------------
import glob
CONTENT_FILES = (
    glob.glob("/Users/davidscantee/Desktop/prokaiwa-v2/supabase/seeds/*.sql")
    + ["/Users/davidscantee/Desktop/prokaiwa-v2/supabase/functions/ig-post-generator/index.ts",
       "/Users/davidscantee/Desktop/prokaiwa-v2/supabase/functions/ig-post-generator/CHARACTERS.md",
       "/Users/davidscantee/Desktop/prokaiwa-v2/supabase/functions/ig-render/index.ts"]
)
harvested = set()
for f in CONTENT_FILES:
    try:
        for ch in open(f, encoding="utf-8").read():
            if 0x4E00 <= ord(ch) <= 0x9FFF:
                harvested.add(ch)
    except FileNotFoundError:
        pass

# Kanji currently present in the live `phrases` table (queried 2026-06-13)
DB_KANJI = "一中乱予事京人今休会伝何元全最出分切別利割助単可合同向問変大天始嬉存完定家尋年度当待後必思意感慮憩手択拶挨教敵新族日明時更月本来楽機次止気混点理用由申白着知確祈祝視私窓簡素終絡練習考聞職能良行要見親言詫話認説謝議質転返連遅過違遠選都開間限面頃食高"

# Everyday-buffer for future content (common conversational kanji)
BUFFER_KANJI = "実際納豆偶然解決整正直丸太森杯汁噌探枚弁準備趣切疲様無横結局昨皿情興奮緊張安心驚配慮迷惑邪魔遠慮我慢得意苦痛快適面倒退屈夢中熱心冷静焦燥晩御飯麺丼鍋甘辛酸苦塩濃薄温冷氷熱忙暇散財節約貯偉凄怖嬉悲寂恥誇照憧羨妬頑張諦挑戦失敗成功経験成長変化挑続伝統文化祭典花火温泉神社寺城島海山川湖空星雲虹朝晩昨明後毎晩遊泊乗降運転歩通勤通学引越掃片付捨拾貸借返忘覚思出予定約束遅刻早退欠席出席参加不参加連絡相談報告説明紹介案内招招待訪問迎見送別離再会久"
# Rendered punctuation/symbols outside earlier ranges
EXTRA_CODEPOINTS = [0x00E9, 0x2013, 0x2014, 0x2026, 0x2192, 0x2208, 0x2248, 0x2264, 0x26A0] + list(range(0x2460, 0x2469 + 1))
jp_ranges.extend(EXTRA_CODEPOINTS)
SEED_KANJI = SEED_KANJI + DB_KANJI + BUFFER_KANJI + "".join(sorted(harvested))

for c in SEED_KANJI:
    cp = ord(c)
    if 0x4E00 <= cp <= 0x9FFF:
        jp_ranges.append(cp)

# Extra chars that NotoSansJP covers and we need in the rendered cards
extra_for_jp = [
    # Box drawings
    0x2500, 0x2502, 0x250C, 0x2510, 0x2514, 0x2518, 0x252C,
    0x256D, 0x256E, 0x256F, 0x2570,
    # Stars, music
    0x2606, 0x266A,
    # Math symbols covered by JP
    0x2207, 0x2299,
    # Quotation marks
    0x201E,
    # Bullet
    0x2022,
    # Multiplication sign, superscript 3, acute accent, Greek omega
    0x00D7, 0x00B3, 0x00B4, 0x03C9,
    # Katakana middle dot
    0x30FB,
]
jp_ranges.extend(extra_for_jp)
jp_unicodes = sorted(set(jp_ranges))
print(f"JP subsetting: {len(jp_unicodes)} codepoints")


# -----------------------------------------------------------------------
# 2. Helper: instance variable font at given weight, then subset
# -----------------------------------------------------------------------
def instance_and_subset(in_file, out_file, wght, unicodes_list):
    in_path = os.path.join(FONT_DIR, in_file)
    out_path = os.path.join(OUT_DIR, out_file)
    print(f"\nInstancing {in_file} at wght={wght} -> {out_file} ...")

    font = TTFont(in_path)
    instancer.instantiateVariableFont(font, {"wght": wght}, inplace=True)

    options = ftsubset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.glyph_names = False

    subs = ftsubset.Subsetter(options=options)
    subs.populate(unicodes=unicodes_list)
    subs.subset(font)
    font.save(out_path)

    size = os.path.getsize(out_path)
    print(f"  -> {out_file}: {size:,} bytes ({size // 1024} KB)")
    return size


# -----------------------------------------------------------------------
# 3. Helper: simple subset (for non-variable fonts)
# -----------------------------------------------------------------------
def subset_small(in_file, out_file, cps):
    in_path = os.path.join(FONT_DIR, in_file)
    out_path = os.path.join(OUT_DIR, out_file)
    print(f"\nSubsetting {in_file} -> {out_file} ({len(cps)} codepoints) ...")

    options = ftsubset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.glyph_names = False

    font = TTFont(in_path)
    subs = ftsubset.Subsetter(options=options)
    subs.populate(unicodes=cps)
    subs.subset(font)
    font.save(out_path)

    size = os.path.getsize(out_path)
    print(f"  -> {out_file}: {size:,} bytes ({size // 1024} KB)")
    return size


# -----------------------------------------------------------------------
# 4. Run all subsets
# -----------------------------------------------------------------------
sizes = {}

# JP Regular (wght=400)
sizes["NotoSansJP-Regular-sub.ttf"] = instance_and_subset(
    "NotoSansJP-var.ttf",
    "NotoSansJP-Regular-sub.ttf",
    400,
    jp_unicodes,
)

# JP Bold (wght=700)
sizes["NotoSansJP-Bold-sub.ttf"] = instance_and_subset(
    "NotoSansJP-var.ttf",
    "NotoSansJP-Bold-sub.ttf",
    700,
    jp_unicodes,
)

# Exotic Latin / IPA: breve ˘  modifier double-acute ˶  small-top-half-O ᵔ
# small-bottom-half-O ᵕ  subscript-paren-L ₍  subscript-paren-R ₎
sizes["NotoSans-ExoticLatin-sub.ttf"] = subset_small(
    "NotoSans-Regular.ttf",
    "NotoSans-ExoticLatin-sub.ttf",
    [0x02D8, 0x02F6, 0x1D54, 0x1D55, 0x208D, 0x208E],
)

# Gujarati: ૮ (U+0AEE)
sizes["NotoSansGujarati-sub.ttf"] = subset_small(
    "NotoSansGujarati-Regular.ttf",
    "NotoSansGujarati-sub.ttf",
    [0x0AEE],
)

# Georgian: ა (U+10D0)
sizes["NotoSansGeorgian-sub.ttf"] = subset_small(
    "NotoSansGeorgian-Regular.ttf",
    "NotoSansGeorgian-sub.ttf",
    [0x10D0],
)

# Armenian: ֊ (U+058A)
sizes["NotoSansArmenian-sub.ttf"] = subset_small(
    "NotoSansArmenian-Regular.ttf",
    "NotoSansArmenian-sub.ttf",
    [0x058A],
)

# Symbols2: ⑅ (U+2445)
sizes["NotoSansSymbols2-sub.ttf"] = subset_small(
    "NotoSansSymbols2-Regular.ttf",
    "NotoSansSymbols2-sub.ttf",
    [0x2445],
)

# -----------------------------------------------------------------------
# 5. Summary
# -----------------------------------------------------------------------
print("\n" + "=" * 60)
print("FINAL FONT FILE SIZES:")
total = 0
for fname, sz in sizes.items():
    print(f"  {fname:<45} {sz // 1024:>5} KB  ({sz:,} bytes)")
    total += sz
print(f"\n  TOTAL: {total:,} bytes  ({total // 1024} KB  /  {round(total / (1024*1024), 2)} MB)")
print("=" * 60)
