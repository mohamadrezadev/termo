'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-9 h-9"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full w-9 h-9 transition-all hover:scale-110 hover:shadow-glow border-primary/30 hover:border-primary/60"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all text-secondary" />
      ) : (
        <Moon className="h-4 w-4 rotate-0 scale-100 transition-all text-primary" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
