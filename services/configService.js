const moment = require('moment-timezone');
const AppConfig = require('../models/AppConfig');
const { AppError } = require('../utils/errors');

const CONFIG_KEY = 'global';
const CACHE_TTL_MS = 30 * 1000;

let cache = null;
let cacheAt = 0;

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function buildDefaultConfig() {
  const baseHour = positiveNumber(process.env.PRICE, 2000);
  const baseFraction = Math.max(1, Math.round(baseHour / 2));

  return {
    key: CONFIG_KEY,
    version: 1,
    currency: 'COP',
    locale: 'es-CO',
    timezone: process.env.TIMEZONE || 'America/Bogota',
    billing: {
      minimumHours: 1,
      fractionThresholdMinutes: 15,
      freeMinutes: 0,
    },
    rates: {
      withTicket: { hour: baseHour, fraction: baseFraction },
      withoutTicket: { hour: baseHour * 2, fraction: baseFraction * 2 },
    },
    mobile: {
      collaborativeSyncEnabled: true,
      syncIntervalSeconds: 30,
    },
  };
}

function normalizeConfig(doc) {
  const defaults = buildDefaultConfig();
  const source = doc || {};
  const billing = source.billing || {};
  const rates = source.rates || {};
  const mobile = source.mobile || {};

  return {
    key: CONFIG_KEY,
    version: Number(source.version) || 1,
    currency: String(source.currency || defaults.currency).toUpperCase(),
    locale: String(source.locale || defaults.locale),
    timezone: String(source.timezone || defaults.timezone),
    billing: {
      minimumHours: Number(billing.minimumHours ?? defaults.billing.minimumHours),
      fractionThresholdMinutes: Number(
        billing.fractionThresholdMinutes ??
          defaults.billing.fractionThresholdMinutes
      ),
      freeMinutes: Number(billing.freeMinutes ?? defaults.billing.freeMinutes),
    },
    rates: {
      withTicket: {
        hour: Number(rates.withTicket?.hour ?? defaults.rates.withTicket.hour),
        fraction: Number(
          rates.withTicket?.fraction ?? defaults.rates.withTicket.fraction
        ),
      },
      withoutTicket: {
        hour: Number(
          rates.withoutTicket?.hour ?? defaults.rates.withoutTicket.hour
        ),
        fraction: Number(
          rates.withoutTicket?.fraction ?? defaults.rates.withoutTicket.fraction
        ),
      },
    },
    mobile: {
      collaborativeSyncEnabled:
        mobile.collaborativeSyncEnabled ??
        defaults.mobile.collaborativeSyncEnabled,
      syncIntervalSeconds: Number(
        mobile.syncIntervalSeconds ?? defaults.mobile.syncIntervalSeconds
      ),
    },
    updatedBy: source.updatedBy || null,
    updatedAt: source.updatedAt || null,
    createdAt: source.createdAt || null,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireInteger(value, field, { min, max }) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw AppError.badRequest(`${field} debe ser un entero entre ${min} y ${max}`);
  }
  return number;
}

function requireMoney(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100000000) {
    throw AppError.badRequest(`${field} debe ser un valor monetario válido`);
  }
  return Math.round(number);
}

function validateConfig(config) {
  if (!/^[A-Z]{3}$/.test(config.currency)) {
    throw AppError.badRequest('currency debe tener 3 letras (ej. COP)');
  }
  if (!config.locale || config.locale.length > 12) {
    throw AppError.badRequest('locale no es válido');
  }
  if (!moment.tz.zone(config.timezone)) {
    throw AppError.badRequest('timezone no es una zona horaria válida');
  }

  config.billing.minimumHours = requireInteger(
    config.billing.minimumHours,
    'billing.minimumHours',
    { min: 0, max: 24 }
  );
  config.billing.fractionThresholdMinutes = requireInteger(
    config.billing.fractionThresholdMinutes,
    'billing.fractionThresholdMinutes',
    { min: 0, max: 59 }
  );
  config.billing.freeMinutes = requireInteger(
    config.billing.freeMinutes,
    'billing.freeMinutes',
    { min: 0, max: 1440 }
  );

  config.rates.withTicket.hour = requireMoney(
    config.rates.withTicket.hour,
    'rates.withTicket.hour'
  );
  config.rates.withTicket.fraction = requireMoney(
    config.rates.withTicket.fraction,
    'rates.withTicket.fraction'
  );
  config.rates.withoutTicket.hour = requireMoney(
    config.rates.withoutTicket.hour,
    'rates.withoutTicket.hour'
  );
  config.rates.withoutTicket.fraction = requireMoney(
    config.rates.withoutTicket.fraction,
    'rates.withoutTicket.fraction'
  );

  config.mobile.collaborativeSyncEnabled = Boolean(
    config.mobile.collaborativeSyncEnabled
  );
  config.mobile.syncIntervalSeconds = requireInteger(
    config.mobile.syncIntervalSeconds,
    'mobile.syncIntervalSeconds',
    { min: 10, max: 600 }
  );

  return config;
}

function mergeConfig(current, patch = {}) {
  const next = clone(current);

  if (patch.currency !== undefined) next.currency = String(patch.currency);
  if (patch.locale !== undefined) next.locale = String(patch.locale);
  if (patch.timezone !== undefined) next.timezone = String(patch.timezone);

  if (patch.billing && typeof patch.billing === 'object') {
    if (patch.billing.minimumHours !== undefined) {
      next.billing.minimumHours = patch.billing.minimumHours;
    }
    if (patch.billing.fractionThresholdMinutes !== undefined) {
      next.billing.fractionThresholdMinutes =
        patch.billing.fractionThresholdMinutes;
    }
    if (patch.billing.freeMinutes !== undefined) {
      next.billing.freeMinutes = patch.billing.freeMinutes;
    }
  }

  if (patch.rates && typeof patch.rates === 'object') {
    ['withTicket', 'withoutTicket'].forEach((type) => {
      const ratePatch = patch.rates[type];
      if (!ratePatch || typeof ratePatch !== 'object') return;
      if (ratePatch.hour !== undefined) next.rates[type].hour = ratePatch.hour;
      if (ratePatch.fraction !== undefined) {
        next.rates[type].fraction = ratePatch.fraction;
      }
    });
  }

  if (patch.mobile && typeof patch.mobile === 'object') {
    if (patch.mobile.collaborativeSyncEnabled !== undefined) {
      next.mobile.collaborativeSyncEnabled =
        patch.mobile.collaborativeSyncEnabled;
    }
    if (patch.mobile.syncIntervalSeconds !== undefined) {
      next.mobile.syncIntervalSeconds = patch.mobile.syncIntervalSeconds;
    }
  }

  return next;
}

async function readFromDatabase() {
  let doc = await AppConfig.findOne({ key: CONFIG_KEY }).lean();
  if (!doc) {
    const created = await AppConfig.create(buildDefaultConfig());
    doc = created.toObject();
  }
  return normalizeConfig(doc);
}

const configService = {
  async getConfig({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cacheAt < CACHE_TTL_MS) {
      return clone(cache);
    }

    const config = await readFromDatabase();
    cache = config;
    cacheAt = Date.now();
    return clone(config);
  },

  async updateConfig(patch, user) {
    const current = await configService.getConfig({ fresh: true });
    const merged = validateConfig(mergeConfig(current, patch));
    merged.version = current.version + 1;
    merged.updatedBy = user?.userId || null;

    const doc = await AppConfig.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: {
          version: merged.version,
          currency: merged.currency,
          locale: merged.locale,
          timezone: merged.timezone,
          billing: merged.billing,
          rates: merged.rates,
          mobile: merged.mobile,
          updatedBy: merged.updatedBy,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    cache = normalizeConfig(doc);
    cacheAt = Date.now();
    return clone(cache);
  },

  invalidateCache() {
    cache = null;
    cacheAt = 0;
  },
};

module.exports = configService;
