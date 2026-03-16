#!/usr/bin/env python3
"""
Prokaiwa - Step 2: Clean URLs (remove .html from page addresses)
Moves public pages into subdirectories so /about.html becomes /about

Run from inside your prokaiwa-v2/ directory AFTER running refactor_components.py:
    python3 clean_urls.py

⚠️  AUTH PAGES (login, dashboard, password-reset, etc.) are intentionally
    skipped to avoid breaking your Supabase redirect URL configuration.
    Move those separately only after updating your Supabase allowed URLs.
"""

import os
import re
import shutil
import glob

# ── Pages to move (public content pages — safe to restructure) ────────────────
PAGES_TO_MOVE = [
    'about.html',
    'contact.html',
    'privacy-policy.html',
    'terms-of-service.html',
    'commerce-disclosure.html',
    'thank-you.html',
    'thank-you-line.html',
    'thank-you-pro.html',
    'thank-you-video.html',
]

# ── Pages intentionally skipped (auth-sensitive) ──────────────────────────────
SKIPPED_REASON = {
    'login.html':           '⚠️  Auth page — update Supabase redirect URLs first',
    'dashboard.html':       '⚠️  Auth page — Supabase session handling',
    'account-settings.html':'⚠️  Auth page',
    'password-reset.html':  '⚠️  Auth page — Supabase email link target',
    'reset-password.html':  '⚠️  Auth page — Supabase email link target',
    'questionnaire.html':   '⚠️  Auth page',
    'cancellation.html':    '⚠️  Auth page',
    'reactivate.html':      '⚠️  Auth page',
    'teacher-login.html':   '⚠️  Auth page',
    'teacher-portal.html':  '⚠️  Auth page',
    'student-detail.html':  '⚠️  Auth page',
    'prompt-recordings.html':'⚠️  Auth page',
    'index.html':           'ℹ️  Already serves as / — no change needed',
}

# ── Build a mapping of old filename → new path ────────────────────────────────
# e.g. 'about.html' → 'about/index.html', href 'about.html' → '/about'
moves = {}  # { 'about.html': ('about/index.html', '/about') }

for page in PAGES_TO_MOVE:
    if not os.path.exists(page):
        print(f"⚠️  {page} not found, skipping.")
        continue
    slug = page.replace('.html', '')
    moves[page] = (f'{slug}/index.html', f'/{slug}')

# ── Helper: update all internal links in an HTML string ──────────────────────
def update_links(content, moves):
    for old_file, (new_path, new_url) in moves.items():
        # Match href="about.html", href="about.html#section", href='about.html'
        content = re.sub(
            r'(href=["\'])' + re.escape(old_file) + r'(#[^"\']*)?(["\'])',
            lambda m: m.group(1) + new_url + (m.group(2) or '') + m.group(3),
            content
        )
    return content

# ── Step 1: Update links in all root HTML files first ─────────────────────────
all_root_html = glob.glob('*.html')
print("🔗 Updating internal links in root HTML files...")
for filename in sorted(all_root_html):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    updated = update_links(content, moves)
    if updated != content:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(f"   ✅ Updated links in {filename}")

# ── Step 2: Move pages into subdirectories ────────────────────────────────────
print("\n📁 Moving pages into subdirectory folders...")
moved = []

for old_file, (new_path, new_url) in moves.items():
    if not os.path.exists(old_file):
        continue

    # Read the file
    with open(old_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix asset paths: assets/ → /assets/ (absolute paths work from any depth)
    content = re.sub(r'(src|href)="assets/', r'\1="/assets/', content)

    # Fix components.js and script.js paths too (they use assets/ prefix)
    # Already handled above by the assets/ rule

    # Update any internal links within this file too
    content = update_links(content, moves)

    # Create the subdirectory
    slug = old_file.replace('.html', '')
    os.makedirs(slug, exist_ok=True)

    # Write as index.html inside the folder
    with open(new_path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Remove the old file
    os.remove(old_file)
    moved.append((old_file, new_path, new_url))
    print(f"   ✅ {old_file} → {new_path}  (URL: {new_url})")

# ── Step 3: Fix asset paths in remaining root HTML files ─────────────────────
# (index.html and auth pages stay in root, their asset paths don't need changing)

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n✅ Moved {len(moved)} pages to clean URL folders")

print("\n⏭️  Skipped (intentional):")
for f, reason in SKIPPED_REASON.items():
    if os.path.exists(f):
        print(f"   {f} — {reason}")

print("""
🎉 Done! A few things to verify before pushing:

1. Open index.html locally — check that About/Contact links work
2. Test that /about /contact /privacy-policy etc. load correctly
3. The skipped auth pages still use .html URLs — that's intentional for now

When you're ready to move the auth pages too:
  → Update your Supabase allowed redirect URLs in the Supabase dashboard
  → Then run this script again with those pages added to PAGES_TO_MOVE
""")
