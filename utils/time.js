const moment = require('moment-timezone');

require('dotenv').config();

const TIMEZONE = process.env.TIMEZONE || 'UTC';

const TimeUtils = {
  now: () => moment().tz(TIMEZONE).toDate() ,

  todayMidnight: () => moment().tz(TIMEZONE).startOf('day').toDate(),

  format: (date, format = 'YYYY-MM-DD HH:mm:ss') =>
    moment(date).tz(TIMEZONE).format(format),

  toBogota: (date) => moment(date).tz(TIMEZONE).toDate(),

  getColombianDayRange: () => {
    const start = moment().tz(TIMEZONE).startOf('day').toDate();
    const end = moment().tz(TIMEZONE).endOf('day').toDate();
    return { start, end };
  }
};

module.exports = TimeUtils;