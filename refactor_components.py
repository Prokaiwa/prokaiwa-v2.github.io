#!/usr/bin/env python3
"""
Prokaiwa - Step 1: Extract shared nav and footer into a JS component
Run from inside your prokaiwa-v2/ directory:
    python3 refactor_components.py
"""

import os
import re
import json
import glob

# ── 1. Read index.html as source of truth ────────────────────────────────────
with open('index.html', 'r', encoding='utf-8') as f:
    source = f.read()

# ── 2. Extract the <header> and <footer> blocks ───────────────────────────────
header_match = re.search(r'(<header class="site-header">.*?</header>)', source, re.DOTALL)
footer_match = re.search(r'(<footer class="site-footer">.*?</footer>)', source, re.DOTALL)

if not header_match or not footer_match:
    print("❌ Could not find header or footer in index.html. Aborting.")
    exit(1)

header_html = header_match.group(1)
footer_html = footer_match.group(1)
print("✅ Extracted header and footer from index.html")

# ── 3. Write assets/js/components.js ─────────────────────────────────────────
os.makedirs('assets/js', exist_ok=True)

components_js = """\
/* =============================================================================
   Prokaiwa - Shared Components (auto-generated)
   Injects the site nav and footer into every page.
   Edit this file to update the nav/footer everywhere at once.
   ============================================================================= */
(function () {
  var navHTML = %s;
  var footerHTML = %s;

  // Replace placeholder divs with real HTML
  var navEl = document.getElementById('nav-placeholder');
  var footerEl = document.getElementById('footer-placeholder');

  if (navEl)    { navEl.outerHTML = navHTML; }
  if (footerEl) { footerEl.outerHTML = footerHTML; }
})();
""" % (json.dumps(header_html), json.dumps(footer_html))

with open('assets/js/components.js', 'w', encoding='utf-8') as f:
    f.write(components_js)
print("✅ Created assets/js/components.js")

# ── 4. Update every HTML file ─────────────────────────────────────────────────
html_files = glob.glob('*.html')
html_files.sort()

skipped = []
updated = []

for filename in html_files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # -- Replace <header ...>...</header> with placeholder div
    content = re.sub(
        r'<header class="site-header">.*?</header>',
        '<div id="nav-placeholder"></div>',
        content,
        flags=re.DOTALL
    )

    # -- Replace <footer ...>...</footer> with placeholder div
    content = re.sub(
        r'<footer class="site-footer">.*?</footer>',
        '<div id="footer-placeholder"></div>',
        content,
        flags=re.DOTALL
    )

    # -- Add components.js BEFORE script.js (so nav exists when script.js runs)
    #    Only add it if it isn't already there
    if 'components.js' not in content:
        content = content.replace(
            '<script src="assets/js/script.js"></script>',
            '<script src="assets/js/components.js"></script>\n    <script src="assets/js/script.js"></script>'
        )

    if content == original:
        skipped.append(filename)
    else:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        updated.append(filename)

# ── 5. Summary ────────────────────────────────────────────────────────────────
print(f"\n✅ Updated {len(updated)} files:")
for f in updated:
    print(f"   {f}")

if skipped:
    print(f"\n⚠️  Skipped {len(skipped)} files (no matching nav/footer found):")
    for f in skipped:
        print(f"   {f}")

print("\n🎉 Done! Test locally before pushing to GitHub.")
print("   To edit the nav or footer going forward: assets/js/components.js")
