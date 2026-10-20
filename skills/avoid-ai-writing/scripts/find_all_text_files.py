#!/usr/bin/env python3
"""
find_all_text_files.py

Randa VISUS failus projekte kuriuose gali būti user-facing tekstas.
Apima: frontend, backend, dashboard, emails, i18n, config.
Naudojamas /polish-lt komandos.
"""

import os
import sys
import json

SKIP_DIRS = {
    'node_modules', '.git', '.next', 'dist', 'build', 'out',
    '.vercel', '.turbo', 'coverage', '__pycache__', '.cache',
    '.husky', 'storybook-static', '.nyc_output', 'tmp', 'temp',
    '.expo', 'android', 'ios',  # React Native build
}

SKIP_DIRS_PARTIAL = {
    'supabase',  # db migrations
    'prisma',    # schema files
    '.git',
}

TEXT_EXTENSIONS = {
    '.tsx', '.jsx', '.ts', '.js',
    '.mdx', '.md', '.html', '.svelte',
    '.vue', '.astro', '.json', '.mjml',
}

SKIP_FILE_PATTERNS = {
    'package.json', 'package-lock.json', 'yarn.lock',
    'pnpm-lock.yaml', 'bun.lock', 'bun.lockb',
    'tsconfig', 'jsconfig', 'next.config',
    'tailwind.config', 'postcss.config', 'eslint',
    'prettier', '.env', 'schema.prisma',
    'generated.ts', 'generated.js', 'supabase-types',
    'database.types', 'drizzle.config',
    'jest.config', 'vitest.config', 'playwright.config',
    'rollup.config', 'vite.config', 'webpack.config',
    'babel.config', 'metro.config',
    'README', 'CHANGELOG', 'LICENSE', 'CONTRIBUTING',
}

SKIP_FILE_SUFFIXES = {
    '.test.ts', '.test.tsx', '.test.js', '.test.jsx',
    '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx',
    '.stories.ts', '.stories.tsx', '.stories.js', '.stories.jsx',
    '.d.ts',  # TypeScript declarations
    '.min.js', '.min.css',
}

# Kategorijos pagal kelią
CATEGORIES = {
    'i18n': [
        'messages/', 'locales/', 'i18n/', 'translations/',
        'public/locales/', '/lang/', '/langs/',
    ],
    'email': [
        'emails/', 'email/', 'mail/', 'templates/email',
        'email-templates/', 'transactional/',
    ],
    'dashboard': [
        'dashboard/', '(dashboard)', '(admin)', 'admin/',
        'cms/', 'backoffice/', 'back-office/',
    ],
    'backend': [
        'api/', 'server/', 'lib/', 'actions/', 'services/',
        'utils/', 'helpers/', 'middleware',
        'route.ts', 'route.js', 'handler.ts', 'handler.js',
        'action.ts', 'action.js', 'actions.ts', 'actions.js',
    ],
    'config': [
        'config/', 'constants/', 'settings/',
        'navigation', 'menu', 'metadata', 'seo',
    ],
}

def categorize(filepath):
    fp = filepath.replace('\\', '/').lower()
    for cat, patterns in CATEGORIES.items():
        for p in patterns:
            if p in fp:
                return cat
    return 'frontend'

def should_skip_dir(dirname, dirpath):
    if dirname in SKIP_DIRS:
        return True
    if dirname.startswith('.') and dirname != '.':
        return True
    return False

def should_skip_file(filename, filepath):
    name_lower = filename.lower()
    # Check exact patterns
    for pattern in SKIP_FILE_PATTERNS:
        if pattern.lower() in name_lower:
            return True
    # Check suffixes
    for suffix in SKIP_FILE_SUFFIXES:
        if name_lower.endswith(suffix):
            return True
    return False

def is_i18n_file(filepath):
    """JSON failai kurie yra vertimų failai."""
    fp = filepath.replace('\\', '/').lower()
    i18n_indicators = [
        '/messages/', '/locales/', '/translations/', '/i18n/',
        '/lang/', '/langs/', '/public/locales/',
    ]
    for ind in i18n_indicators:
        if ind in fp:
            return True
    name = os.path.basename(fp)
    # lt.json, en.json, lt-LT.json, etc.
    lang_codes = ['lt', 'en', 'lv', 'et', 'ru', 'pl', 'de', 'fr']
    for code in lang_codes:
        if name in (f'{code}.json', f'{code}-{code.upper()}.json'):
            return True
    return False

def has_user_text_js(content):
    """Patikrina ar JS/TS/TSX faile yra user-facing tekstas."""
    # Skip jei tik imports/exports/types
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    non_import = [l for l in lines if not l.startswith('import ') and not l.startswith('export type') and not l.startswith('//')]

    if not non_import:
        return False

    # Ieškoti JSX teksto
    has_jsx = '>' in content and '<' in content

    # Ieškoti ilgų string'ų (>15 simbolių) kurie atrodo kaip tekstas
    # ne kaip kodo path ar variable name
    import re
    strings = re.findall(r'["\']([^"\'\\]{15,})["\']', content)
    human_strings = []
    for s in strings:
        # Skip URL'us, path'us, CSS klases, kodus
        if s.startswith('/') or s.startswith('http'):
            continue
        if s.startswith('#') or s.startswith('bg-') or s.startswith('text-'):
            continue
        if re.match(r'^[A-Z_0-9]+$', s):  # CONSTANT_NAME
            continue
        if '.' in s and '/' in s:  # filepath
            continue
        human_strings.append(s)

    return has_jsx or len(human_strings) > 0

def has_user_text_json(content):
    """Patikrina ar JSON faile yra user-facing tekstas."""
    try:
        data = json.loads(content)
        # Patikrinti ar yra string reikšmės kurios atrodo kaip tekstas
        def has_text_values(obj, depth=0):
            if depth > 5:
                return False
            if isinstance(obj, str):
                return len(obj) > 3 and not obj.startswith('/') and not obj.startswith('http')
            if isinstance(obj, dict):
                return any(has_text_values(v, depth+1) for v in obj.values())
            if isinstance(obj, list):
                return any(has_text_values(item, depth+1) for item in obj[:5])
            return False
        return has_text_values(data)
    except Exception:
        return False

def has_user_text(filepath):
    """Patikrina ar faile yra user-facing tekstas."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(8000)

        ext = os.path.splitext(filepath)[1].lower()

        if ext == '.json':
            if is_i18n_file(filepath):
                return True  # i18n failai visada įtraukiami
            return has_user_text_json(content)
        elif ext in ('.md', '.mdx'):
            return len(content.strip()) > 50  # MD failai su turiniu
        elif ext in ('.html', '.mjml'):
            return len(content) > 100
        else:
            return has_user_text_js(content)
    except Exception:
        return False

def find_all_text_files(root='.'):
    results = {
        'frontend': [],
        'backend': [],
        'dashboard': [],
        'email': [],
        'i18n': [],
        'config': [],
    }
    root = os.path.abspath(root)

    for dirpath, dirnames, filenames in os.walk(root):
        # Pašalinti skip dirs
        dirnames[:] = [
            d for d in dirnames
            if not should_skip_dir(d, dirpath)
        ]

        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in TEXT_EXTENSIONS:
                continue

            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root)

            if should_skip_file(filename, filepath):
                continue

            if has_user_text(filepath):
                category = categorize(rel_path)
                results[category].append(rel_path)

    # Rūšiuoti kiekvienoje kategorijoje
    for cat in results:
        results[cat] = sorted(results[cat])

    return results

def print_results(results):
    total = sum(len(v) for v in results.values())
    print(f"# Rasta failų su user-facing tekstu: {total}")
    print()

    category_labels = {
        'frontend': '🖥️  Frontend',
        'backend':  '⚙️  Backend / API',
        'dashboard': '📊  Dashboard / Admin',
        'email':    '📧  El. paštas',
        'i18n':     '🌐  i18n / Vertimai',
        'config':   '⚙️  Config / Constants',
    }

    for cat, label in category_labels.items():
        files = results.get(cat, [])
        if not files:
            continue
        print(f"## {label} ({len(files)} failų)")
        for f in files:
            print(f"  {f}")
        print()

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    results = find_all_text_files(root)
    print_results(results)
