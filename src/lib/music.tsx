import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MusicContext } from './musicContext'
import { MusicToggle } from '../components/MusicToggle'

const FADE_IN_MS = 1500

/**
 * Música de fundo do convite (events.music_url). Fica no EventLayout, e não
 * na página do convite, para continuar tocando ao navegar para
 * /confirmar e /presentes.
 */
export function MusicProvider({ src, children }: { src: string | null; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const fadeFrame = useRef(0)
  const resumeOnVisible = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [toggleHidden, setToggleHidden] = useState(false)

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    // play() tem que sair daqui de forma síncrona: o Safari do iOS só deixa
    // tocar áudio dentro do próprio gesto do usuário. O fade de volume é só
    // estético (no iOS o volume é somente leitura e isso vira no-op).
    cancelAnimationFrame(fadeFrame.current)
    audio.volume = 0
    audio.play().catch(() => {})

    const start = performance.now()
    const step = (now: number) => {
      // O timestamp do rAF é o início do frame e pode ser anterior a `start`.
      const progress = Math.min(1, Math.max(0, (now - start) / FADE_IN_MS))
      audio.volume = progress
      if (progress < 1) fadeFrame.current = requestAnimationFrame(step)
    }
    fadeFrame.current = requestAnimationFrame(step)
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      play()
    } else {
      cancelAnimationFrame(fadeFrame.current)
      audio.pause()
    }
  }, [play])

  // Pausa quando a aba/app vai para segundo plano e retoma ao voltar.
  useEffect(() => {
    const handleVisibility = () => {
      const audio = audioRef.current
      if (!audio) return
      if (document.hidden) {
        resumeOnVisible.current = !audio.paused
        audio.pause()
      } else if (resumeOnVisible.current) {
        resumeOnVisible.current = false
        audio.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const value = useMemo(
    () => ({ available: Boolean(src), playing, play, toggle, setToggleHidden }),
    [src, playing, play, toggle]
  )

  return (
    <MusicContext.Provider value={value}>
      {children}
      {src && (
        <>
          <audio
            ref={audioRef}
            src={src}
            loop
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {!toggleHidden && <MusicToggle />}
        </>
      )}
    </MusicContext.Provider>
  )
}
