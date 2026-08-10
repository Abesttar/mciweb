import glob
import re

files = glob.glob('src/app/dashboard/**/*.tsx', recursive=True)

classes = {
    'bg-white': 0,
    'text-gray-900': 0,
    'text-gray-800': 0,
    'text-gray-700': 0,
    'text-gray-600': 0,
    'text-gray-500': 0,
    'bg-gray-50': 0,
    'bg-gray-100': 0,
    'border-gray-200': 0,
    'border-gray-100': 0,
}

for file in files:
    with open(file, 'r') as f:
        content = f.read()
        for cls in classes:
            # We want to find classes that don't already have dark: right before or after, but a simple count is enough for a check
            matches = re.findall(rf'\b{cls}\b', content)
            classes[cls] += len(matches)

print(classes)
