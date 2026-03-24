import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const DARK = {
  mode: 'dark',
  bg: '#0A0A0F',
  bg2: '#0D0D1A',
  card: '#12121F',
  card2: '#1A1A2E',
  border: '#1E1E35',
  border2: '#2A2A45',
  text: '#FFFFFF',
  text2: '#CCCCCC',
  text3: '#888888',
  text4: '#555555',
  text5: '#444444',
  accent: '#6C63FF',
  accent2: '#A855F7',
  green: '#00D4AA',
  red: '#FF6B6B',
  orange: '#FFB347',
  placeholder: '#444444',
  inputBg: '#12121F',
  tabBar: '#0D0D1A',
  tabBarBorder: '#1A1A2E',
  sectionLabel: '#444444',
  orb1: '#6C63FF',
  orb2: '#00D4AA',
  statusBar: 'light',
  gradientBg: ['#0A0A0F', '#0D0D1A', '#0A0A0F'],
};

export const LIGHT = {
  mode: 'light',
  bg: '#F0F2FF',
  bg2: '#E8EAFF',
  card: '#FFFFFF',
  card2: '#F0F2FF',
  border: '#E0E4FF',
  border2: '#C8CDFF',
  text: '#0A0A2E',
  text2: '#1A1A4E',
  text3: '#5A5A8E',
  text4: '#8888AA',
  text5: '#AAAACC',
  accent: '#6C63FF',
  accent2: '#A855F7',
  green: '#00B894',
  red: '#E55353',
  orange: '#E09020',
  placeholder: '#AAAACC',
  inputBg: '#FFFFFF',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E0E4FF',
  sectionLabel: '#8888AA',
  orb1: '#6C63FF',
  orb2: '#00D4AA',
  statusBar: 'dark',
  gradientBg: ['#F0F2FF', '#E8EAFF', '#F0F2FF'],
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? DARK : LIGHT;
  const toggleTheme = () => setIsDark(p => !p);
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
