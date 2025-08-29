/**
 * Devuelve la fecha actual y la hora actual ajustadas a la zona horaria de Colombia (UTC-5).
 * - `entryTime`: fecha y hora actual en Colombia.
 * - `currentDate`: misma fecha pero con hora a 00:00:00 en Colombia.
 */
function getColombiaDateAndTime() {
  const currentTimeUTC = new Date();

  // Colombia tiene un desfase de UTC -5 (sin horario de verano)
  const offsetColombia = -300 * 60 * 1000;

  const entryTime = new Date(currentTimeUTC.getTime() + offsetColombia);

  const currentDate = new Date(entryTime);
  currentDate.setUTCHours(0, 0, 0, 0); // Establece hora en 00:00:00 en Colombia

  return { entryTime, currentDate };
}

module.exports = {
  getColombiaDateAndTime,
};
