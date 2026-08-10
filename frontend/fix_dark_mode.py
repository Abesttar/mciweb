import glob
import re
import os

files = glob.glob('src/app/**/*.tsx', recursive=True)
files.extend(glob.glob('src/components/**/*.tsx', recursive=True))

dark_map = {
    'bg-white': 'bg-gray-900',
    'bg-gray-50': 'bg-gray-800',
    'bg-gray-100': 'bg-gray-800',
    'text-gray-900': 'text-white',
    'text-gray-800': 'text-gray-200',
    'text-gray-700': 'text-gray-300',
    'text-gray-600': 'text-gray-400',
    'text-gray-500': 'text-gray-400',
    'text-black': 'text-white',
    'border-gray-200': 'border-gray-700',
    'border-gray-100': 'border-gray-800',
    'border-gray-50': 'border-gray-800',
}

keys_pattern = '|'.join(dark_map.keys())
pattern = re.compile(rf'\b({keys_pattern})(/[0-9]+|/\[[^\]]+\])?\b(?!\s*dark:)', re.MULTILINE)

def replacer(match):
    base = match.group(1)
    opacity = match.group(2) or ''
    dark_base = dark_map[base]
    return f"{base}{opacity} dark:{dark_base}{opacity}"

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = pattern.sub(replacer, content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
