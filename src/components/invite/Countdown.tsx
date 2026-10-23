import { useEffect, useState } from 'react'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}

/** Dias/horas/min/seg até o casamento; "É hoje!" no dia e some depois dele. */
export function Countdown({ date }: { date: Date }) {
  const now = useNow(SECOND)
  const diff = date.getTime() - now

  if (diff <= 0) {
    if (!isSameDay(new Date(now), date)) return null
    return <p className="text-center font-serif text-4xl text-brand-primary italic">É hoje!</p>
  }

  const days = Math.floor(diff / DAY)
  const hours = Math.floor((diff % DAY) / HOUR)
  const minutes = Math.floor((diff % HOUR) / MINUTE)
  const seconds = Math.floor((diff % MINUTE) / SECOND)

  const units = [
    { value: days, label: days === 1 ? 'dia' : 'dias' },
    { value: hours, label: hours === 1 ? 'hora' : 'horas' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'seg' },
  ]

  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-brand-primary uppercase">Faltam</p>
      <div className="mt-4 grid grid-cols-4 gap-2" role="timer" aria-live="off">
        {units.map((unit) => (
          <div key={unit.label} className="rounded-2xl border border-brand-primary-soft bg-white/70 py-3">
            <p className="font-serif text-3xl leading-none text-[#3f3450] tabular-nums">{unit.value}</p>
            <p className="mt-1 text-xs text-[#8b7a9c]">{unit.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
