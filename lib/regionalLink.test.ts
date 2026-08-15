import { describe, it, expect } from 'vitest';
import { isEuropeanTimeZone, pickRegionalUrl } from './regionalLink';

describe('isEuropeanTimeZone', () => {
  it('treats every Europe/ zone as European', () => {
    expect(isEuropeanTimeZone('Europe/Amsterdam')).toBe(true);
    expect(isEuropeanTimeZone('Europe/London')).toBe(true);
  });

  it('treats every other zone as not European', () => {
    expect(isEuropeanTimeZone('America/New_York')).toBe(false);
    expect(isEuropeanTimeZone('Asia/Dubai')).toBe(false);
    expect(isEuropeanTimeZone('Africa/Cairo')).toBe(false);
  });
});

describe('pickRegionalUrl', () => {
  const url = 'https://int.toucheprive.com/products/x';
  const altUrl = 'https://eu.toucheprive.com/products/x';

  it('picks altUrl for a European timezone', () => {
    expect(pickRegionalUrl(url, altUrl, 'Europe/Amsterdam')).toBe(altUrl);
  });

  it('picks the default url for a non-European timezone', () => {
    expect(pickRegionalUrl(url, altUrl, 'America/New_York')).toBe(url);
  });

  it('picks the default url when there is no altUrl', () => {
    expect(pickRegionalUrl(url, undefined, 'Europe/Amsterdam')).toBe(url);
  });

  it('picks the default url when the timezone is unreadable', () => {
    expect(pickRegionalUrl(url, altUrl, undefined)).toBe(url);
  });
});
