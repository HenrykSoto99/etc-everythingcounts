/** Defense in depth: generated text is a draft, never proof of an action. */
export function claimsExecutedAction(text: string): boolean {
 const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
 return /\b(envie|enviamos|he enviado|hemos enviado|ya enviado|mensaje enviado|agende|agendamos|he agendado|hemos agendado|cita agendada|notifique|notificamos|he notificado|hemos notificado|ya notificado|i (?:have )?(?:sent|scheduled|booked|notified)|we (?:have )?(?:sent|scheduled|booked|notified)|message (?:was |has been )?sent|appointment (?:was |has been )?(?:scheduled|booked))\b/.test(normalized);
}
