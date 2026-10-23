// TODO: trocar pelo número real (com DDI+DDD, só dígitos) antes de publicar.
export const WHATSAPP_URL = 'https://wa.me/5577936181281'

/** Link do WhatsApp do Presenzo já com a mensagem escrita. */
export function whatsappLink(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}
