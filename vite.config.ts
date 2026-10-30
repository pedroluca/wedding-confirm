import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://presenzo.com.br'
const DESCRIPTION =
  'Convites online com confirmação de presença e lista de presentes para casamentos, aniversários, formaturas e qualquer celebração. Sem app pros convidados e sem taxa nos presentes.'

const HOME_META = `
    <meta name="description" content="${DESCRIPTION}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Presenzo" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:title" content="Presenzo | convide. confirme. celebre" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:image" content="${SITE_URL}/og-presenzo.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>`

/**
 * Gera dist/home.html: o index.html com descrição e prévia de link (Open
 * Graph). O .htaccess serve esse arquivo só na raiz do site; os links dos
 * convites continuam com o index.html sem prévia da marca, já que o
 * convite é do cliente (e o Premium nem leva o "Feito com Presenzo").
 */
function homeMetaPlugin(): Plugin {
  let outDir = 'dist'
  return {
    name: 'presenzo-home-meta',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const html = readFileSync(resolve(outDir, 'index.html'), 'utf-8')
      if (!html.includes('</head>')) {
        throw new Error('index.html sem </head>: não deu pra gerar o home.html')
      }
      writeFileSync(resolve(outDir, 'home.html'), html.replace('</head>', HOME_META))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    homeMetaPlugin(),
  ],
})
