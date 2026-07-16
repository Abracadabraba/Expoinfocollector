const SETTINGS_KEY = 'customer_registration_settings_v1';

const DEFAULTS = {
  exhibitionName: 'Medipharma Vietnam 2026',
  teamMembers: ['Ray', 'Alex', 'Hannah'],
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
