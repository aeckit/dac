import { createSignal, createEffect } from 'solid-js';
import { BlueprintTheme, PaperTheme, CadTheme } from '@aeckit/dac-renderer-svg';

export interface AppSettings {
  appTheme: 'dark' | 'light';
  canvasTheme: 'blueprint' | 'paper' | 'custom';
  customTheme: CadTheme;
}

const defaultSettings: AppSettings = {
  appTheme: 'dark',
  canvasTheme: 'blueprint',
  customTheme: BlueprintTheme
};

const [settings, setSettings] = createSignal<AppSettings>(defaultSettings);

let isInitialized = false;

export function useSettings() {
  if (!isInitialized) {
    const saved = localStorage.getItem('dac_settings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch(e) {}
    }
    isInitialized = true;
  }

  createEffect(() => {
    localStorage.setItem('dac_settings', JSON.stringify(settings()));
  });

  const activeCanvasTheme = () => {
    const s = settings();
    if (s.canvasTheme === 'paper') return PaperTheme;
    if (s.canvasTheme === 'blueprint') return BlueprintTheme;
    return s.customTheme;
  };

  const cssVariables = () => {
    const s = settings();
    if (s.appTheme === 'light') {
      return {
        '--app-bg-main': '#ffffff',
        '--app-bg-sidebar': 'rgba(248, 250, 252, 0.85)',
        '--app-bg-panel': 'rgba(255, 255, 255, 0.85)',
        '--app-bg-canvas': '#e2e8f0',
        '--app-border': 'rgba(203, 213, 225, 0.6)',
        '--app-text': '#0f172a',
        '--app-text-muted': '#64748b',
        '--app-btn-bg': '#e2e8f0',
        '--app-btn-text': '#0f172a',
        '--app-btn-hover': '#cbd5e1',
        '--app-accent': '#0284c7',
        '--app-accent-hover': '#0369a1',
        '--app-backdrop': 'blur(12px)'
      };
    } else {
      return {
        '--app-bg-main': '#0f172a',
        '--app-bg-sidebar': 'rgba(15, 23, 42, 0.85)',
        '--app-bg-panel': 'rgba(30, 41, 59, 0.85)',
        '--app-bg-canvas': '#0f172a',
        '--app-border': 'rgba(51, 65, 85, 0.6)',
        '--app-text': '#f8fafc',
        '--app-text-muted': '#94a3b8',
        '--app-btn-bg': '#334155',
        '--app-btn-text': '#f8fafc',
        '--app-btn-hover': '#475569',
        '--app-accent': '#3b82f6',
        '--app-accent-hover': '#2563eb',
        '--app-backdrop': 'blur(12px)'
      };
    }
  };

  return { settings, setSettings, activeCanvasTheme, cssVariables };
}
