const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

/**
 * "2026-03-31" — fecha de hoy usando métodos LOCALES del navegador.
 * No usa Intl ni timeZone — devuelve la fecha que el usuario ve en pantalla.
 */
export function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** "2026-03" — mes actual */
export function mesHoy() {
  return fechaHoy().substring(0, 7)
}

/**
 * Convierte "YYYY-MM-DD" de Supabase a Date local (medianoche local).
 * Usar SOLO para aritmética de fechas (comparar, sumar días), NO para mostrar.
 * Evita el bug de new Date('2026-03-31') que crea medianoche UTC → día anterior en UTC-5.
 */
export function parseFechaLocal(fechaISO) {
  if (!fechaISO) return null
  const [y, m, d] = fechaISO.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Convierte un Date local a "YYYY-MM-DD" usando métodos locales.
 * Usar para guardar en Supabase fechas calculadas (ej: vencimiento = hoy + 30 días).
 */
export function formatFechaISO(localDate) {
  return `${localDate.getFullYear()}-${String(localDate.getMonth()+1).padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}`
}

/**
 * Formatea un string "YYYY-MM-DD" de Supabase para mostrar al usuario.
 * NO crea un objeto Date — solo divide el string y lo formatea.
 * Evita COMPLETAMENTE el bug UTC/local.
 *
 * @param {string} fechaStr  "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss..."
 * @param {'day'|'short'|'medium'} style
 *   - 'day':    "31 mar"
 *   - 'short':  "31 mar 26"
 *   - 'medium': "31 mar 2026"  (default)
 */
export function formatearFecha(fechaStr, style = 'medium') {
  if (!fechaStr) return '—'
  const [y, m, d] = fechaStr.split('T')[0].split('-').map(Number)
  if (style === 'day')   return `${d} ${MESES[m-1]}`
  if (style === 'short') return `${d} ${MESES[m-1]} ${String(y).slice(2)}`
  return `${d} ${MESES[m-1]} ${y}`
}

/**
 * Formatea un objeto Date LOCAL para mostrar al usuario.
 * Usar para fechas calculadas (ej: vencimiento, renovación) que son Date objects,
 * no strings de Supabase.
 *
 * @param {Date} dateObj
 * @param {'day'|'short'|'medium'} style
 */
export function formatearFechaObj(dateObj, style = 'medium') {
  if (!dateObj) return '—'
  const y = dateObj.getFullYear()
  const m = dateObj.getMonth() + 1
  const d = dateObj.getDate()
  if (style === 'day')   return `${d} ${MESES[m-1]}`
  if (style === 'short') return `${d} ${MESES[m-1]} ${String(y).slice(2)}`
  return `${d} ${MESES[m-1]} ${y}`
}
