import { Play } from 'lucide-react'
import { useMusic } from '../lib/musicContext'

const EQUALIZER_DELAYS = ['0ms', '-300ms', '-600ms']

/** Botão flutuante de play/pause da música do convite (canto inferior direito). */
export function MusicToggle() {
  const { playing, toggle } = useMusic()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Pausar música' : 'Tocar música'}
      title={playing ? 'Pausar música' : 'Tocar música'}
      aria-pressed={playing}
      className="cursor-pointer fixed right-4 bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/30 ring-4 ring-white/70 transition hover:bg-brand-primary-hover motion-safe:animate-pop-in"
    >
      {playing ? (
        <span aria-hidden className="flex h-4 items-end gap-0.75">
          {EQUALIZER_DELAYS.map((delay) => (
            <span
              key={delay}
              style={{ animationDelay: delay }}
              className="h-full w-0.75 origin-bottom scale-y-75 rounded-full bg-white motion-safe:animate-equalizer"
            />
          ))}
        </span>
      ) : (
        <Play size={18} className="ml-0.5 fill-current" />
      )}
    </button>
  )
}
