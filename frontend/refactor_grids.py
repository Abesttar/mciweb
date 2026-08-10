import os
import re

FRONTEND_DIR = "/Users/admin/Desktop/mciweb/frontend/src/app/dashboard"

# Patterns to replace hardcoded grids with responsive grids
# e.g., grid-cols-2 -> grid-cols-1 md:grid-cols-2
# We only want to replace it if it's NOT already preceded by a responsive modifier (like md:grid-cols-2)
# and we should ensure we don't duplicate.

PATTERNS = [
    # grid-cols-2
    (re.compile(r'(?<![a-z0-9:-])grid-cols-2\b'), r'grid-cols-1 md:grid-cols-2'),
    # grid-cols-3
    (re.compile(r'(?<![a-z0-9:-])grid-cols-3\b'), r'grid-cols-1 md:grid-cols-3'),
    # grid-cols-4
    (re.compile(r'(?<![a-z0-9:-])grid-cols-4\b'), r'grid-cols-1 md:grid-cols-4'),
    # grid-cols-5
    (re.compile(r'(?<![a-z0-9:-])grid-cols-5\b'), r'grid-cols-1 md:grid-cols-5'),
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    for pattern, replacement in PATTERNS:
        # We need to be careful not to replace things like "grid-cols-1 md:grid-cols-2" into "grid-cols-1 md:grid-cols-1 md:grid-cols-2"
        # The negative lookbehind `(?<![a-z0-9:-])` ensures we only match standalone `grid-cols-X`
        
        # But wait, what if the string is already `grid-cols-1 md:grid-cols-2`?
        # If we just replace `grid-cols-2` with `grid-cols-1 md:grid-cols-2`, wait, the lookbehind prevents matching `md:grid-cols-2`.
        # However, it might match if it's `grid grid-cols-2` -> `grid grid-cols-1 md:grid-cols-2`.
        # Let's test this carefully.
        content = pattern.sub(replacement, content)
        
    if content != original_content:
        # Avoid duplicating grid-cols-1 if it was already there
        content = re.sub(r'grid-cols-1\s+grid-cols-1\b', 'grid-cols-1', content)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(FRONTEND_DIR):
    for file in files:
        if file.endswith(".tsx"):
            process_file(os.path.join(root, file))

print("Done")
