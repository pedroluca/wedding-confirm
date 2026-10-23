import type { NameFont } from '../types'

export const NAME_FONT_CLASSES: Record<NameFont, string> = {
  sans: 'font-sans text-5xl',
  fleur: 'font-fleur text-6xl',
  pinyon: 'font-pinyon text-6xl',
}

export const NAME_FONT_CLASSES_COMPACT: Record<NameFont, string> = {
  sans: 'font-sans text-2xl',
  fleur: 'font-fleur text-4xl',
  pinyon: 'font-pinyon text-4xl',
}

/** Só a família da fonte, para quem define o próprio tamanho (ex: selo de cera). */
export const NAME_FONT_FAMILY: Record<NameFont, string> = {
  sans: 'font-sans',
  fleur: 'font-fleur',
  pinyon: 'font-pinyon',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * DATETIME do MySQL chega como "2026-12-13 10:30:00" (sem timezone); troca
 * o espaço por "T" pra evitar que o browser interprete o formato errado.
 */
export function parseMysqlDate(mysqlDateTime: string): Date | null {
  const date = new Date(mysqlDateTime.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

/** "13 de dezembro de 2026 às 10h30" */
export function formatEventDate(mysqlDateTime: string): string {
  const date = parseMysqlDate(mysqlDateTime)
  if (!date) return mysqlDateTime

  return `${dateFormatter.format(date)} às ${formatEventTime(date)}`
}

/** "13 de dezembro de 2026" */
export function formatEventDay(date: Date): string {
  return dateFormatter.format(date)
}

/** "sábado" */
export function formatEventWeekday(date: Date): string {
  return weekdayFormatter.format(date)
}

/** "10h30" */
export function formatEventTime(date: Date): string {
  return timeFormatter.format(date).replace(':', 'h')
}
