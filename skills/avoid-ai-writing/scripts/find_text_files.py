#!/usr/bin/env python3
"""
Finds all files in a project that likely contain user-facing text.
Skips node_modules, .git, build folders, lock files, etc.
Outputs a list of file paths, one per line.
"""

import os
import sys

SKIP_DIRS = {
    'node_modules', '.git', '.next', 'dist', 'build', 'out',
    '.vercel', '.turbo', 'coverage', '__pycache__', '.cache',
    'public', 'assets', 'static', '.husky', 'migrations'
}

# Extensions that likely contain user-facing text
TEXT_EXTENSIONS = {
    '.tsx', '.jsx', '.ts', '.js',
    '.mdx', '.md', '.html', '.svelte',
    '.vue', '.astro', '.json'
}

# Skip these specific file patterns
SKIP_PATTERNS = {
    'package.json', 'package-lock.json', 'yarn.lock',
    'pnpm-lock.yaml', 'tsconfig.json', 'next.config',
    'tailwind.config', 'postcss.config', 'eslint',
    'prettier', '.env', 'schema.prisma', 'schema.ts',
    'types.ts', 'type.ts', 'generated', 'supabase/types',
}

def should_skip_file(filepath):
    name = os.path.basename(filepath).lower()
    for pattern in SKIP_PATTERNS:
        if pattern in name:
            return True
    # Skip test files
    if '.test.' in name or '.spec.' in name or '.stories.' in name:
        return True
    return False

def has_user_text(filepath):
    """Quick check if file likely has user-facing strings."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(4000)  # Read first 4KB only
        # Look for JSX text or string literals that look like sentences
        # Skip files that are mostly imports/exports/types
        has_jsx_text = '>' in content and '<' in content
        has_strings = '"' in content or "'" in content
        has_long_strings = any(
            len(s.strip()) > 20
            for s in content.split('"')
            if s.strip() and not s.strip().startswith('/')
        )
        return has_long_strings or has_jsx_text
    except Exception:
        return False

def find_text_files(root='.'):
    results = []
    root = os.path.abspath(root)

    for dirpath, dirnames, filenames in os.walk(root):
        # Remove skip dirs in-place to prevent recursion
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.startswith('.')
        ]

        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in TEXT_EXTENSIONS:
                continue

            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root)

            if should_skip_file(filepath):
                continue

            if has_user_text(filepath):
                results.append(rel_path)

    return sorted(results)

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    files = find_text_files(root)
    for f in files:
        print(f)
