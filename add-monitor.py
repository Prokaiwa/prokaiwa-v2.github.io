#!/usr/bin/env python3
"""
add-monitor.py
==============================================================
Adds the prokaiwa-monitor.js <script> tag to every HTML file
in the prokaiwa-v2 repo.

Rules:
  - Inserts as the FIRST <script> tag inside <head> so the
    monitor loads before any other JS and catches all errors
  - Skips any file that already has the tag (safe to re-run)
  - Uses the correct path prefix per file location:
      root-level files  → assets/js/prokaiwa-monitor.js
      one subfolder deep → ../assets/js/prokaiwa-monitor.js
  - Prints a clear summary of every file changed or skipped

Run from repo root:
  python3 add-monitor.py
==============================================================
"""

import os
import sys

# The tag we are inserting — note the src is a placeholder
# that gets replaced with the correct relative path per file
SCRIPT_TAG = '<script src="{path}" defer></script>'

# String we search for to confirm the tag is already present
ALREADY_PRESENT_MARKER = 'prokaiwa-monitor.js'

# Where to insert — immediately after the opening <head> tag
HEAD_TAG = '<head>'

# ---------------------------------------------------------------
# Find all HTML files in the repo (excluding node_modules etc.)
# ---------------------------------------------------------------

EXCLUDE_DIRS = {'.git', 'node_modules', '.github'}

def find_html_files(root):
    html_files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Remove excluded directories in-place so os.walk skips them
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for filename in filenames:
            if filename.endswith('.html'):
                html_files.append(os.path.join(dirpath, filename))
    return sorted(html_files)

# ---------------------------------------------------------------
# Determine the correct relative path to assets/js/ from a
# given HTML file's location
# ---------------------------------------------------------------

def get_monitor_path(html_file_path, repo_root):
    """
    Returns the correct relative path to prokaiwa-monitor.js
    based on how deep the HTML file is in the repo.

    Examples:
      repo_root/index.html           → assets/js/prokaiwa-monitor.js
      repo_root/dashboard.html       → assets/js/prokaiwa-monitor.js
      repo_root/about/index.html     → ../assets/js/prokaiwa-monitor.js
      repo_root/a/b/index.html       → ../../assets/js/prokaiwa-monitor.js
    """
    rel_path = os.path.relpath(html_file_path, repo_root)
    depth = len(rel_path.split(os.sep)) - 1  # number of subdirectory levels

    if depth == 0:
        return 'assets/js/prokaiwa-monitor.js'
    else:
        prefix = '/'.join(['..'] * depth)
        return f'{prefix}/assets/js/prokaiwa-monitor.js'

# ---------------------------------------------------------------
# Process a single HTML file
# ---------------------------------------------------------------

def process_file(html_file_path, repo_root):
    """
    Returns one of:
      ('inserted', new_content)  — tag was added
      ('skipped_present', None)  — tag already exists
      ('skipped_no_head', None)  — no <head> tag found (unexpected)
      ('error', message)         — file could not be read/written
    """
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return ('error', str(e))

    # Skip if already present
    if ALREADY_PRESENT_MARKER in content:
        return ('skipped_present', None)

    # Find the <head> tag (case-insensitive to handle <HEAD> edge cases)
    head_index = content.lower().find(HEAD_TAG.lower())
    if head_index == -1:
        return ('skipped_no_head', None)

    # Find the end of the <head> tag so we insert AFTER it
    insert_position = head_index + len(HEAD_TAG)

    # Build the correctly pathed script tag with a newline + 2-space indent
    monitor_path = get_monitor_path(html_file_path, repo_root)
    tag = SCRIPT_TAG.format(path=monitor_path)
    insertion = f'\n  {tag}'

    new_content = content[:insert_position] + insertion + content[insert_position:]

    try:
        with open(html_file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    except Exception as e:
        return ('error', str(e))

    return ('inserted', new_content)

# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main():
    repo_root = os.getcwd()

    print(f'\n🔍 Scanning for HTML files in: {repo_root}\n')

    html_files = find_html_files(repo_root)

    if not html_files:
        print('❌ No HTML files found. Are you running this from the repo root?')
        sys.exit(1)

    print(f'Found {len(html_files)} HTML file(s).\n')

    inserted    = []
    skipped_present   = []
    skipped_no_head   = []
    errors      = []

    for filepath in html_files:
        status, _ = process_file(filepath, repo_root)
        rel = os.path.relpath(filepath, repo_root)
        monitor_path = get_monitor_path(filepath, repo_root)

        if status == 'inserted':
            inserted.append(rel)
            print(f'  ✅ Inserted  →  {rel}')
            print(f'              src="{monitor_path}"')
        elif status == 'skipped_present':
            skipped_present.append(rel)
            print(f'  ⏭️  Skipped   →  {rel}  (already has monitor)')
        elif status == 'skipped_no_head':
            skipped_no_head.append(rel)
            print(f'  ⚠️  No <head>  →  {rel}  (skipped — check manually)')
        elif status == 'error':
            errors.append(rel)
            print(f'  ❌ Error     →  {rel}')

    # ── Summary ────────────────────────────────────────────────
    print('\n' + '='*56)
    print('SUMMARY')
    print('='*56)
    print(f'  Inserted:          {len(inserted)}')
    print(f'  Already present:   {len(skipped_present)}')
    print(f'  No <head> found:   {len(skipped_no_head)}')
    print(f'  Errors:            {len(errors)}')
    print('='*56)

    if errors:
        print('\n❌ Some files had errors. Check the list above.')
        sys.exit(1)

    if skipped_no_head:
        print('\n⚠️  Some files had no <head> tag. Check them manually:')
        for f in skipped_no_head:
            print(f'   - {f}')

    if not inserted:
        print('\n✅ Nothing to do — all files already have the monitor.')
    else:
        print(f'\n✅ Done. {len(inserted)} file(s) updated.')
        print('   Review the changes, then run your git commit.\n')

if __name__ == '__main__':
    main()
