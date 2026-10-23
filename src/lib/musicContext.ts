import { createContext, useContext } from 'react'

export type MusicContextValue = {
  /** O evento tem música cadastrada (events.music_path). */
  available: boolean
  playing: boolean
  /** Precisa ser chamado de forma síncrona dentro de um clique/toque (iOS). */
  play: () => void
  toggle: () => void
  /** Esconde o botão flutuante (ex: enquanto o envelope está fechado). */
  setToggleHidden: (hidden: boolean) => void
}

export const MusicContext = createContext<MusicContextValue | null>(null)

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext)
  if (!ctx) {
    throw new Error('useMusic deve ser usado dentro de <MusicProvider>.')
  }
  return ctx
}
