import type { AppSettings } from '../engine/types';

export function formatUtcTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '---- -- -- --:--:-- UTC';
  return `${d.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export function formatUtcShort(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toISOString().slice(11, 19);
}

export function formatDistance(km: number, units: AppSettings['units'], decimals = 1): { value: string; unit: string } {
  if (units === 'IMPERIAL') {
    return { value: (km * 0.621371).toFixed(decimals), unit: 'mi' };
  }
  return { value: km.toFixed(decimals), unit: 'km' };
}

export function formatSpeed(kmS: number, units: AppSettings['units'], decimals = 2): { value: string; unit: string } {
  if (units === 'IMPERIAL') {
    return { value: (kmS * 2236.936).toFixed(0), unit: 'mph' };
  }
  return { value: kmS.toFixed(decimals), unit: 'km/s' };
}

export function formatTemp(celsius: number, units: AppSettings['units'], decimals = 1): { value: string; unit: string } {
  if (units === 'IMPERIAL') {
    return { value: ((celsius * 9) / 5 + 32).toFixed(decimals), unit: '°F' };
  }
  return { value: celsius.toFixed(decimals), unit: '°C' };
}

export function formatLatLon(deg: number, isLat: boolean): string {
  const hemi = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
  return `${Math.abs(deg).toFixed(2)}° ${hemi}`;
}

export function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}
