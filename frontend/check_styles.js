/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/*.tsx');

let classes = {
    'bg-white': 0,
    'text-gray-900': 0,
    'text-gray-800': 0,
    'text-gray-700': 0,
    'text-gray-500': 0,
    'bg-gray-50': 0,
    'bg-gray-100': 0,
    'border-gray-200': 0,
    'border-gray-100': 0,
};

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const cls in classes) {
        const regex = new RegExp(`\\b${cls}\\b(?!\\s*dark:)`, 'g');
        const matches = content.match(regex);
        if (matches) {
            classes[cls] += matches.length;
        }
    }
}

console.log(classes);
