export type CountryMapFocus = {
  code: string;
  center: [number, number];
  zoom: number;
};

export const COUNTRY_MAP_FOCUS: Record<string, CountryMapFocus> = {
  US: { code: 'US', center: [190, 170], zoom: 1.85 },
  CA: { code: 'CA', center: [165, 150], zoom: 1.6 },
  AU: { code: 'AU', center: [748, 345], zoom: 2.2 },
  IN: { code: 'IN', center: [612, 220], zoom: 2.8 },
  BR: { code: 'BR', center: [275, 310], zoom: 2.0 },
  CL: { code: 'CL', center: [235, 355], zoom: 2.5 },
  DE: { code: 'DE', center: [470, 163], zoom: 5 },
  AE: { code: 'AE', center: [596, 220], zoom: 8 },
  ZA: { code: 'ZA', center: [500, 358], zoom: 3.5 },
};
