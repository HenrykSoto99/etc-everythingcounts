import { describe, expect, it } from 'vitest';
import { claimsExecutedAction } from './action-claims';
describe('ETC generated draft action claims', () => {
 it.each(['Envié el mensaje al cliente.','Ya agendé la cita.','Notifiqué al equipo.','Hemos enviado la confirmación.','I sent the message.','I have booked the appointment.','We notified the team.'])('rejects an unperformed action: %s', text => expect(claimsExecutedAction(text)).toBe(true));
 it.each(['Puedes revisar y enviar este borrador.','Sugiero confirmar una cita con tu equipo.','You can schedule an appointment after review.'])('keeps suggestions, not action claims: %s', text => expect(claimsExecutedAction(text)).toBe(false));
});
