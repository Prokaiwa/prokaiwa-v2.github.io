#!/usr/bin/env python3
"""Verify all subset font files contain expected glyphs."""
from fontTools.ttLib import TTFont
import os

OUT_DIR = "/Users/davidscantee/Desktop/prokaiwa-v2/assets/fonts/ig"

checks = [
    # (filename, [codepoints that must be present])
    ("NotoSansJP-Regular-sub.ttf", [
        0x3042,  # あ (hiragana)
        0x30A2,  # ア (katakana)
        0x4ECA,  # 今 (kanji)
        0xFF61,  # ｡ (halfwidth katakana)
        0xFF9F,  # ﾟ (halfwidth semi-voiced)
        0x2500,  # ─ (box drawing)
        0x2606,  # ☆
        0x266A,  # ♪
        0x2299,  # ⊙
        0x2207,  # ∇
        0xFF40,  # ｀ (fullwidth grave)
        0xFFE3,  # ￣ (fullwidth macron)
    ]),
    ("NotoSansJP-Bold-sub.ttf", [
        0x3042, 0x30A2, 0x4ECA, 0xFF9F, 0x2500, 0x2606
    ]),
    ("NotoSans-ExoticLatin-sub.ttf", [
        0x02D8,  # ˘ BREVE
        0x02F6,  # ˶ MODIFIER LETTER MIDDLE DOUBLE ACUTE ACCENT
        0x1D54,  # ᵔ MODIFIER LETTER SMALL TOP HALF O
        0x1D55,  # ᵕ MODIFIER LETTER SMALL BOTTOM HALF O
        0x208D,  # ₍ SUBSCRIPT LEFT PARENTHESIS
        0x208E,  # ₎ SUBSCRIPT RIGHT PARENTHESIS
    ]),
    ("NotoSansGujarati-sub.ttf",  [0x0AEE]),  # ૮ GUJARATI DIGIT EIGHT
    ("NotoSansGeorgian-sub.ttf",  [0x10D0]),  # ა GEORGIAN LETTER AN
    ("NotoSansArmenian-sub.ttf",  [0x058A]),  # ֊ ARMENIAN HYPHEN
    ("NotoSansSymbols2-sub.ttf",  [0x2445]),  # ⑅ OCR BOW TIE
]

print("SUBSET VERIFICATION:")
all_ok = True
for fname, cps in checks:
    path = os.path.join(OUT_DIR, fname)
    if not os.path.exists(path):
        print(f"  {fname}: FILE NOT FOUND")
        all_ok = False
        continue
    font = TTFont(path)
    cmap = font.getBestCmap() or {}
    missing = [hex(cp) for cp in cps if cp not in cmap]
    size_kb = os.path.getsize(path) // 1024
    if missing:
        print(f"  {fname} ({size_kb}KB): MISSING {missing}")
        all_ok = False
    else:
        print(f"  {fname} ({size_kb}KB): OK (all {len(cps)} codepoints present)")

print()
if all_ok:
    print("ALL SUBSETS VERIFIED OK")
else:
    print("SOME FAILURES — check above")
