import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('clinic_theme') || 'null') || {};
      const migratedSaved = saved.primary === '#6366f1' && saved.secondary === '#8b5cf6' ? {} : saved;
      return {
        primary: '#0f766e',
        secondary: '#be3455',
        font: 'Inter',
        ...migratedSaved,
      };
    } catch (_) {
      return {
        primary: '#0f766e',
        secondary: '#be3455',
        font: 'Inter',
      };
    }
  });

  const [clinicName, setClinicName] = useState(() => {
    const saved = localStorage.getItem('clinic_name');
    return saved === 'The Smile Expert' ? saved : 'The Smile Expert';
  });

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('clinic_dark_mode') === 'true';
    } catch (_) {
      return false;
    }
  });

  const setTheme = (newTheme) => {
    setThemeState((prev) => ({ ...prev, ...newTheme }));
  };

  const toggleDark = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--font-family', theme.font);
    localStorage.setItem('clinic_theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('clinic_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('clinic_name', clinicName);
  }, [clinicName]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, clinicName, setClinicName, darkMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
