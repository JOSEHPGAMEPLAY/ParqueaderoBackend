const DEFAULT_FRACTION_THRESHOLD_MINUTES = 15;
const DEFAULT_MINIMUM_HOURS = 1;

function toMillis(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : null;
}

function getRateForTicket(config, hasTicket) {
  const rates = config?.rates || {};
  if (hasTicket === false) {
    return rates.withoutTicket || rates.withTicket || {};
  }
  return rates.withTicket || rates.withoutTicket || {};
}

/**
 * Calcula el valor a cobrar usando la configuración central.
 *
 * Regla:
 * - Se cobran las horas completas.
 * - La fracción solo se cobra cuando supera `fractionThresholdMinutes`.
 * - Si el tiempo es menor a `minimumHours`, se cobra el mínimo de horas.
 * - `freeMinutes` se descuenta antes de facturar.
 */
function calculatePrice({ entryTime, exitTime, isFree = false, hasTicket = true, config }) {
  if (isFree) return 0;

  const entryMs = toMillis(entryTime);
  const exitMs = toMillis(exitTime);
  if (entryMs === null || exitMs === null || exitMs <= entryMs) return 0;

  const rate = getRateForTicket(config, hasTicket);
  const hourlyRate = Number(rate.hour) || 0;
  const fractionRate = Number(rate.fraction) || 0;
  if (hourlyRate <= 0 && fractionRate <= 0) return 0;

  const billing = config?.billing || {};
  const freeMinutes = Math.max(0, Number(billing.freeMinutes) || 0);
  const billableMinutes = (exitMs - entryMs) / 60000 - freeMinutes;
  if (billableMinutes <= 0) return 0;

  const minimumHours = Math.max(
    0,
    Number(billing.minimumHours ?? DEFAULT_MINIMUM_HOURS)
  );
  const threshold = Math.max(
    0,
    Number(
      billing.fractionThresholdMinutes ?? DEFAULT_FRACTION_THRESHOLD_MINUTES
    )
  );

  const fullHours = Math.floor(billableMinutes / 60);
  const remainderMinutes = billableMinutes % 60;

  if (fullHours < minimumHours) {
    return minimumHours * hourlyRate;
  }

  const fractionCharge = remainderMinutes > threshold ? fractionRate : 0;
  return fullHours * hourlyRate + fractionCharge;
}

module.exports = {
  calculatePrice,
  DEFAULT_FRACTION_THRESHOLD_MINUTES,
  DEFAULT_MINIMUM_HOURS,
};
