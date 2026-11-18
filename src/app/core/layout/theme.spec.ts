import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Portal appearance', () => {
  const key = 'etransitbook.theme';
  let media: EventTarget;

  beforeEach(() => {
    media = new EventTarget();
    Object.assign(media, { matches: true });
    vi.stubGlobal('matchMedia', () => media);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    localStorage.removeItem(key);
    delete document.documentElement.dataset['theme'];
    delete document.documentElement.dataset['themePreference'];
  });

  function changeDevice(light: boolean) {
    Object.assign(media, { matches: light });
    media.dispatchEvent(Object.assign(new Event('change'), { matches: light }));
    TestBed.tick();
  }

  it('follows the device without saving an override', () => {
    const theme = TestBed.inject(Theme);
    expect(theme.preference()).toBe('system');
    expect(theme.light()).toBe(true);
    changeDevice(false);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    changeDevice(true);
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('honors a previous explicit choice and resumes live updates when System is selected', () => {
    document.documentElement.dataset['themePreference'] = 'dark';
    localStorage.setItem(key, 'dark');
    const theme = TestBed.inject(Theme);
    expect(theme.light()).toBe(false);
    theme.toggle();
    expect(localStorage.getItem(key)).toBe('light');
    changeDevice(false);
    expect(theme.light()).toBe(true);
    theme.setPreference('system');
    expect(localStorage.getItem(key)).toBeNull();
    expect(theme.light()).toBe(false);
    changeDevice(true);
    expect(theme.light()).toBe(true);
  });
});
