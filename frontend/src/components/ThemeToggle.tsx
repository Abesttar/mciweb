'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8"></div>; // Placeholder to avoid layout shift
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40/50 transition-all duration-300 hover-lift focus:outline-none shadow-sm border border-transparent hover:border-red-200 dark:border-red-800/50"
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' ? (
        <Moon className="w-5 h-5 text-red-500" />
      ) : (
        <Sun className="w-5 h-5 text-amber-500" />
      )}
    </button>
  );
}
