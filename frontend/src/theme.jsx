import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

/** Tokens that canvas (the globe) and SVG attributes (charts) need as real colour values. */
const TOKENS = ['bg', 'panel', 'panel-2', 'raise', 'line', 'line-2', 'text', 'muted', 'faint', 'amber', 'red', 'up', 'down', 'cyan',
  'violet', 'on-accent', 'c-geo', 'c-macro', 'c-credit', 'c-ma', 'c-product', 'c-other', 'sev-hi', 'sev-mid', 'sev-lo', 'fg-globe'];
const camel = (t) => t.replace(/-([a-z0-9])/g, (_, x) => x.toUpperCase());
const STORE_KEY = 'meridian-theme';

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggle: () => {}, c: {} });

function readStored() {
  try { return localStorage.getItem(STORE_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

/** Sets data-theme on <html> and resolves the colour tokens of the active theme. */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [c, setC] = useState({});

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(STORE_KEY, theme); } catch { /* private window: the theme still applies for this visit */ }
    const cs = getComputedStyle(document.documentElement);
    setC(Object.fromEntries(TOKENS.map((t) => [camel(t), cs.getPropertyValue(`--${t}`).trim()])));
  }, [theme]);

  const setTheme = useCallback((t) => setThemeState(t === 'light' ? 'light' : 'dark'), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, setTheme, toggle, c }), [theme, setTheme, toggle, c]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Event-class colours as real values, for canvas and SVG. */
export const classHex = (c) => ({
  Geopolitical: c.cGeo, Macro: c.cMacro, 'Credit Event': c.cCredit, 'M&A': c.cMa, 'Product Launch': c.cProduct, Other: c.cOther,
});
