export const SETTINGS_KEY = 'fighting-figures.settings';

export interface Settings {
  /** Swap the touch joystick and action buttons. */
  leftie: boolean;
}

const DEFAULTS: Settings = { leftie: false };

export function loadSettings(storage: Storage): Settings {
  try {
    const raw = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null;
    return { leftie: raw?.leftie === true };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(storage: Storage, s: Settings): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the setting still applies for this session.
  }
}
