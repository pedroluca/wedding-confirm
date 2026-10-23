// WhatsApp do Presenzo (DDI + DDD + número, só dígitos).
export const WHATSAPP_URL = 'https://wa.me/5577936181281'

/** Link do WhatsApp do Presenzo já com a mensagem escrita. */
export function whatsappLink(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}
