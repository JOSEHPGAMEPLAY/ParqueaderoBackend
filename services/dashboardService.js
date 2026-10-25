const moment = require('moment-timezone');
const ParkingRecord = require('../models/ParkingRecord');
const configService = require('./configService');

const MAX_DAYS = 365;

function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

function roundOne(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function percentChange(current, previous) {
  const base = Number(previous) || 0;
  const next = Number(current) || 0;
  if (base === 0) return next === 0 ? 0 : 100;
  return roundOne(((next - base) / base) * 100);
}

function normalizeChannel(deviceModel) {
  if (!deviceModel) return 'desconocido';
  const value = String(deviceModel).toLowerCase();
  if (value === 'web') return 'web';
  if (value === 'desconocido') return 'desconocido';
  return 'movil';
}

async function getSummary(start, end) {
  const [summary] = await ParkingRecord.aggregate([
    { $match: { exitTime: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$price' },
        vehicles: { $sum: 1 },
        avgTicket: { $avg: '$price' },
        avgStayMinutes: {
          $avg: {
            $divide: [{ $subtract: ['$exitTime', '$entryTime'] }, 60000],
          },
        },
      },
    },
  ]);

  return {
    revenue: roundMoney(summary?.revenue),
    vehicles: summary?.vehicles || 0,
    averageTicket: roundMoney(summary?.avgTicket),
    averageStayMinutes: roundOne(summary?.avgStayMinutes),
  };
}

async function getMetrics({ days = 30 } = {}) {
  const config = await configService.getConfig();
  const timezone = config.timezone || 'UTC';
  const requestedDays = Math.min(
    MAX_DAYS,
    Math.max(1, Number(days) || 30)
  );

  const now = moment().tz(timezone);
  const rangeEnd = now.clone().toDate();
  const rangeStart = now
    .clone()
    .subtract(requestedDays - 1, 'days')
    .startOf('day')
    .toDate();

  const previousEnd = new Date(rangeStart.getTime() - 1);
  const previousStart = moment(rangeStart)
    .tz(timezone)
    .subtract(requestedDays, 'days')
    .startOf('day')
    .toDate();

  const match = { exitTime: { $gte: rangeStart, $lte: rangeEnd } };

  const [facets, activeVehicles, previousSummary] = await Promise.all([
    ParkingRecord.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                revenue: { $sum: '$price' },
                vehicles: { $sum: 1 },
                avgTicket: { $avg: '$price' },
                avgStayMinutes: {
                  $avg: {
                    $divide: [
                      { $subtract: ['$exitTime', '$entryTime'] },
                      60000,
                    ],
                  },
                },
              },
            },
          ],
          daily: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$exitTime',
                    timezone,
                  },
                },
                revenue: { $sum: '$price' },
                vehicles: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          hourly: [
            {
              $group: {
                _id: {
                  $hour: { date: '$entryTime', timezone },
                },
                vehicles: { $sum: 1 },
                revenue: { $sum: '$price' },
              },
            },
            { $sort: { _id: 1 } },
          ],
          ticketSplit: [
            {
              $group: {
                _id: '$hasTicket',
                vehicles: { $sum: 1 },
                revenue: { $sum: '$price' },
              },
            },
          ],
          channelSplit: [
            {
              $group: {
                _id: { $ifNull: ['$deviceModel', 'desconocido'] },
                vehicles: { $sum: 1 },
                revenue: { $sum: '$price' },
              },
            },
          ],
          topVehicles: [
            {
              $group: {
                _id: '$plateNumber',
                visits: { $sum: 1 },
                revenue: { $sum: '$price' },
                lastExit: { $max: '$exitTime' },
              },
            },
            { $sort: { visits: -1, revenue: -1 } },
            { $limit: 10 },
          ],
          hourlyOccupancy: [
            {
              $group: {
                _id: { $hour: { date: '$exitTime', timezone } },
                vehicles: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]),
    ParkingRecord.countDocuments({ exitTime: null }),
    getSummary(previousStart, previousEnd),
  ]);

  const data = facets[0] || {};
  const summary = data.summary?.[0] || {};

  const dailyMap = new Map(
    (data.daily || []).map((item) => [item._id, item])
  );
  const dailySeries = [];
  for (let index = 0; index < requestedDays; index += 1) {
    const label = moment(rangeStart)
      .tz(timezone)
      .add(index, 'days')
      .format('YYYY-MM-DD');
    const found = dailyMap.get(label);
    dailySeries.push({
      date: label,
      revenue: roundMoney(found?.revenue),
      vehicles: found?.vehicles || 0,
    });
  }

  const hourlyMap = new Map(
    (data.hourly || []).map((item) => [item._id, item])
  );
  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
    const found = hourlyMap.get(hour);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      vehicles: found?.vehicles || 0,
      revenue: roundMoney(found?.revenue),
    };
  });

  const ticketSplit = { withTicket: 0, withoutTicket: 0 };
  const ticketRevenue = { withTicket: 0, withoutTicket: 0 };
  (data.ticketSplit || []).forEach((item) => {
    const key = item._id === false ? 'withoutTicket' : 'withTicket';
    ticketSplit[key] += item.vehicles || 0;
    ticketRevenue[key] += roundMoney(item.revenue);
  });

  const channelSplit = { web: 0, movil: 0, desconocido: 0 };
  const channelRevenue = { web: 0, movil: 0, desconocido: 0 };
  (data.channelSplit || []).forEach((item) => {
    const key = normalizeChannel(item._id);
    channelSplit[key] += item.vehicles || 0;
    channelRevenue[key] += roundMoney(item.revenue);
  });

  const topVehicles = (data.topVehicles || []).map((item) => ({
    plateNumber: item._id,
    visits: item.visits || 0,
    revenue: roundMoney(item.revenue),
    lastExit: item.lastExit || null,
  }));

  const peakHour = hourlyDistribution.reduce(
    (best, item) => (item.vehicles > best.vehicles ? item : best),
    { hour: 0, label: '00:00', vehicles: 0 }
  );

  const currentSummary = {
    revenue: roundMoney(summary.revenue),
    vehicles: summary.vehicles || 0,
    averageTicket: roundMoney(summary.avgTicket),
    averageStayMinutes: roundOne(summary.avgStayMinutes),
  };

  return {
    range: {
      days: requestedDays,
      start: rangeStart,
      end: rangeEnd,
      timezone,
    },
    currency: config.currency || 'COP',
    generatedAt: new Date(),
    summary: {
      ...currentSummary,
      activeVehicles,
      peakHour: peakHour.vehicles > 0 ? peakHour.label : null,
      growth: {
        revenue: percentChange(
          currentSummary.revenue,
          previousSummary.revenue
        ),
        vehicles: percentChange(
          currentSummary.vehicles,
          previousSummary.vehicles
        ),
        averageTicket: percentChange(
          currentSummary.averageTicket,
          previousSummary.averageTicket
        ),
      },
    },
    previousSummary,
    dailySeries,
    hourlyDistribution,
    ticketSplit: {
      withTicket: ticketSplit.withTicket,
      withoutTicket: ticketSplit.withoutTicket,
      revenue: ticketRevenue,
    },
    channelSplit: {
      web: channelSplit.web,
      movil: channelSplit.movil,
      desconocido: channelSplit.desconocido,
      revenue: channelRevenue,
    },
    topVehicles,
  };
}

module.exports = { getMetrics, MAX_DAYS };
