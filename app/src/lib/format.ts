import type { Field } from '@/forms/schema'

export function displayValue(field: Field, value: unknown): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.join(', ')
  if (field.unit && typeof value === 'number') return `${value} ${field.unit}`
  return String(value)
}

export function fmtDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`
}

export function fmtDate(iso: string): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function age(birthDate: string): string {
  if (!birthDate) return ''
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return ''
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return `${a}세`
}

export function maskRrn(rrn?: string): string {
  if (!rrn) return ''
  const digits = rrn.replace(/[^0-9]/g, '')
  if (digits.length < 7) return rrn
  return `${digits.slice(0, 6)}-${digits[6]}******`
}
