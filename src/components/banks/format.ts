// El runtime admite la opción ECMA-402 moderna aunque los tipos TS del proyecto solo declaren boolean.
const alwaysGroup = 'always' as unknown as boolean
export const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: alwaysGroup })

export function formatMovementAmount(value: number | null, currency: string | null): string {
  if (value === null) return 'Importe no disponible'
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR', signDisplay: 'exceptZero', useGrouping: alwaysGroup }).format(value)
  } catch {
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('es-ES', { useGrouping: alwaysGroup }).format(value)} ${currency || ''}`
  }
}

export function uppercaseInitial(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1)
}
