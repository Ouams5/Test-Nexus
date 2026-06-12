import React, { createContext, useContext, useState, useEffect } from 'react';

// New supported themes including Admin-only 'lethal' and the 5 special ones
export type Theme = 'light' | 'dark' | 'midnight' | 'depressed' | 'cherry' | 'lethal' | 
                    'coming-of-age' | 'devils-gate' | 'rare-gems' | 'infinite-void' | 'malevolent-shrine';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    const validThemes = [
        'light', 'dark', 'midnight', 'depressed', 'cherry', 'lethal',
        'coming-of-age', 'devils-gate', 'rare-gems', 'infinite-void', 'malevolent-shrine'
    ];
    if (validThemes.includes(saved as any)) return saved as Theme;
    // Default system preference fallback
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Clear all potential classes
    root.classList.remove(
        'light', 'dark', 'midnight', 'depressed', 'cherry', 'lethal',
        'coming-of-age', 'devils-gate', 'rare-gems', 'infinite-void', 'malevolent-shrine'
    );
    
    // Add specific data attribute for CSS variables
    root.setAttribute('data-theme', theme);

    // Add tailwind 'dark' class for themes that are dark-based
    if (['dark', 'midnight', 'depressed', 'lethal', 'devils-gate', 'rare-gems', 'infinite-void', 'malevolent-shrine'].includes(theme)) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};