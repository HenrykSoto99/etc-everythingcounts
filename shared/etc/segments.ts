import type { Segment } from './types';

export const SEGMENTS: Segment[] = ['inmobiliaria', 'educacion', 'retail', 'servicios', 'financieros', 'pymes'];
export const SEGMENT_NAMES: Record<Segment, { es: string; en: string }> = {
  inmobiliaria: { es: 'Inmobiliaria', en: 'Real estate' },
  educacion: { es: 'Educación', en: 'Education' },
  retail: { es: 'Retail', en: 'Retail' },
  servicios: { es: 'Servicios', en: 'Services' },
  financieros: { es: 'Servicios financieros', en: 'Financial services' },
  pymes: { es: 'PYMES', en: 'Small businesses' },
};
export const BUSINESS_TYPES = ['general', 'dental', 'medico', 'veterinario', 'estetica', 'barberia', 'fonda', 'restaurante', 'cafeteria', 'otro'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];
export const BUSINESS_TYPE_NAMES: Record<BusinessType, { es: string; en: string }> = {
  general: { es: 'PYME general', en: 'General small business' },
  dental: { es: 'Consultorio dental', en: 'Dental practice' },
  medico: { es: 'Consultorio médico', en: 'Medical practice' },
  veterinario: { es: 'Veterinaria', en: 'Veterinary practice' },
  estetica: { es: 'Estética', en: 'Beauty salon' },
  barberia: { es: 'Barbería', en: 'Barbershop' },
  fonda: { es: 'Fonda', en: 'Local eatery' },
  restaurante: { es: 'Restaurante', en: 'Restaurant' },
  cafeteria: { es: 'Cafetería', en: 'Coffee shop' },
  otro: { es: 'Otro negocio local', en: 'Other local business' },
};
export const isBusinessType = (value: unknown): value is BusinessType => typeof value === 'string' && BUSINESS_TYPES.includes(value as BusinessType);
