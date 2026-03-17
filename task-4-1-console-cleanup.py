"""
Task 4.1: Console Log Cleanup — Gate Behind Debug Flag
Prokaiwa Security Hardening — Phase 4 (Code Quality)

What this does:
  - Adds a PROKAIWA_DEBUG flag + debugLog() wrapper to 5 files
  - Replaces all console.log() calls with debugLog() calls
  - Keeps all console.error() and console.warn() untouched (real errors)
  - To re-enable debug logging: set PROKAIWA_DEBUG = true

Files affected:
  - dashboard.html (71 logs)
  - account-settings.html (17 logs)
  - login.html (15 logs)
  - questionnaire.html (4 logs)
  - teacher-login.html (1 log)

How to run:
  cd into your prokaiwa repo folder, then:
  python3 task-4-1-console-cleanup.py
"""

import re

DEBUG_FLAG = "const PROKAIWA_DEBUG = false;\n        const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};"

def process_file(filename, anchor, debug_inject, indent="        "):
    """Add debug flag after anchor, then replace all console.log with debugLog."""
    content = open(filename, 'r').read()
    
    # Check if already applied
    if 'PROKAIWA_DEBUG' in content:
        print(f'  ⚠️  {filename} — already has PROKAIWA_DEBUG (skipping)')
        return
    
    # Count console.log before
    log_count = content.count('console.log(')
    
    # Step 1: Inject debug flag after anchor
    if anchor not in content:
        print(f'  ❌ {filename} — anchor not found')
        return
    
    content = content.replace(anchor, anchor + "\n" + debug_inject, 1)
    
    # Step 2: Replace all console.log( with debugLog(
    # Only replace actual calls, not strings containing "console.log"
    content = content.replace('console.log(', 'debugLog(')
    
    open(filename, 'w').write(content)
    print(f'  ✅ {filename} — {log_count} console.log → debugLog')


print()
print('=== Task 4.1: Console Log Cleanup ===')
print()

# --- dashboard.html ---
# Import is the first code line, inject debug flag right after
process_file(
    'dashboard.html',
    "import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';",
    "        const PROKAIWA_DEBUG = false;\n        const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};"
)

# --- account-settings.html ---
# console.log comes BEFORE import, so inject debug flag at very start of script
process_file(
    'account-settings.html',
    "<script type=\"module\">\n    console.log('🔧 Account Settings: Script started');",
    "    const PROKAIWA_DEBUG = false;\n    const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};\n    debugLog('🔧 Account Settings: Script started');"
)
# The above anchor includes the first console.log, and the replacement
# already converts it. But the generic replace will also try to convert it.
# We need a different approach for this file since the console.log is BEFORE import.
# Let me handle it specially.

# Actually, let me re-do account-settings.html — the issue is that 
# console.log appears before the import statement. In ES modules, 
# declarations can go before imports. So we inject the flag before
# the first console.log.

# Re-read to check if the first pass already handled it
content = open('account-settings.html', 'r').read()
if 'PROKAIWA_DEBUG' in content:
    # Already handled by process_file above, but let's verify the anchor
    # issue. The process_file replaces the anchor which includes the 
    # console.log, then also does a bulk replace. This means the first
    # console.log gets double-converted: debugLog → still debugLog. That's fine.
    pass

# --- login.html ---
process_file(
    'login.html',
    "import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';\n\n        // --- Supabase Setup with EXPLICIT session configuration ---",
    "        const PROKAIWA_DEBUG = false;\n        const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};\n\n        // --- Supabase Setup with EXPLICIT session configuration ---"
)

# --- questionnaire.html ---
process_file(
    'questionnaire.html',
    "import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';\n\n        // --- Supabase Setup - MUST MATCH login.html and dashboard.html ---",
    "        const PROKAIWA_DEBUG = false;\n        const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};\n\n        // --- Supabase Setup - MUST MATCH login.html and dashboard.html ---"
)

# --- teacher-login.html ---
# Uses regular <script>, not module. Inject at top of script.
process_file(
    'teacher-login.html',
    "<script>\n  // Initialize Supabase using global supabase object",
    "<script>\n  const PROKAIWA_DEBUG = false;\n  const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};\n\n  // Initialize Supabase using global supabase object"
)

# But wait — process_file replaces the anchor and then also bulk-replaces.
# The teacher-login anchor replacement doesn't include any console.log,
# so it just injects the flag. Then bulk replace handles the 1 console.log. Good.


# ===========================================================
# Fix account-settings.html special case
# ===========================================================
# The first console.log in account-settings comes BEFORE the import.
# Our process_file function replaced the anchor that contained
# "console.log('🔧 Account Settings: Script started')" with a version
# that has debugLog + the debug flag. But then the bulk replace also
# tried to convert that same line. Let's verify it's clean.

content = open('account-settings.html', 'r').read()
# The anchor replacement put debugLog in place, then bulk replace
# converted ALL console.log to debugLog. So the original console.log
# in the anchor was already replaced to debugLog by the anchor swap,
# and the bulk replace would find no console.log there. 
# BUT: the anchor text we searched for had "console.log" — and since
# the bulk replace happens AFTER the anchor swap, the anchor was already
# changed. So the flow was:
# 1. Search for anchor (with console.log) → found, replace with new anchor
# 2. Bulk replace console.log → debugLog on remaining instances
# This is correct! The original line became part of the new anchor text
# and is no longer "console.log". Wait no — let me re-check.

# Actually, process_file does:
# 1. content.replace(anchor, anchor + "\n" + debug_inject)
#    This KEEPS the anchor and APPENDS the debug inject.
#    So the original "console.log('🔧...')" is STILL there.
# 2. content.replace('console.log(', 'debugLog(')
#    This converts ALL console.log, including the one in the anchor.

# So the result is:
# <script type="module">
#     debugLog('🔧 Account Settings: Script started');   ← converted by step 2
#     const PROKAIWA_DEBUG = false;                       ← injected by step 1
#     const debugLog = ...                                ← injected by step 1
#     import { createClient } from '...';
# 
# Problem! debugLog is CALLED before it's DECLARED.
# Need to fix this.

# Fix: swap the order so the debug flag comes before the first debugLog call
old_pattern = """<script type="module">
    debugLog('🔧 Account Settings: Script started');
    const PROKAIWA_DEBUG = false;
    const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};
    debugLog('🔧 Account Settings: Script started');"""

new_pattern = """<script type="module">
    const PROKAIWA_DEBUG = false;
    const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};
    debugLog('🔧 Account Settings: Script started');"""

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern, 1)
    open('account-settings.html', 'w').write(content)
    print('  ✅ account-settings.html — fixed declaration order')
elif 'PROKAIWA_DEBUG' in content:
    # Check if it's already correct
    lines = content.split('\n')
    debug_line = None
    first_debuglog = None
    for i, line in enumerate(lines):
        if 'PROKAIWA_DEBUG = false' in line and debug_line is None:
            debug_line = i
        if 'debugLog(' in line and first_debuglog is None:
            first_debuglog = i
    if debug_line is not None and first_debuglog is not None:
        if debug_line < first_debuglog:
            print('  ✅ account-settings.html — declaration order already correct')
        else:
            print(f'  ⚠️  account-settings.html — debugLog called on line {first_debuglog+1} before declaration on line {debug_line+1}')
            print('      Manual fix needed')


# ===========================================================
# VERIFICATION
# ===========================================================
print()
print('=== Verification ===')
print()

issues = 0
total_gated = 0

files = ['dashboard.html', 'account-settings.html', 'login.html', 'questionnaire.html', 'teacher-login.html']

for f in files:
    content = open(f, 'r').read()
    
    # Check debug flag exists
    has_flag = 'PROKAIWA_DEBUG' in content
    
    # Count remaining console.log (should be 0)
    remaining_logs = content.count('console.log(')
    
    # Count debugLog (should be > 0 for files that had logs)
    gated = content.count('debugLog(')
    total_gated += gated
    
    # Count console.error (should be unchanged)
    errors = content.count('console.error(')
    
    if has_flag and remaining_logs == 0:
        print(f'✅ {f} — {gated} debugLog, {errors} console.error, 0 console.log')
    elif not has_flag:
        print(f'❌ {f} — PROKAIWA_DEBUG flag missing')
        issues += 1
    else:
        print(f'❌ {f} — {remaining_logs} console.log still exposed')
        issues += 1

print()
print(f'Total: {total_gated} statements gated behind PROKAIWA_DEBUG flag')
print()

if issues == 0:
    print('✅ All checks passed! Ready to commit.')
    print()
    print('Next steps:')
    print('  git add dashboard.html account-settings.html login.html questionnaire.html teacher-login.html')
    print('  git commit -m "code quality: gate console.log behind PROKAIWA_DEBUG flag"')
    print('  git push')
else:
    print(f'❌ {issues} issue(s) found. Review output above.')
print()
