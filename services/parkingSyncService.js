const mongoose = require('mongoose');
const ParkingRecord = require('../models/ParkingRecord');
const DailyParkingRecord = require('../models/DailyParkingRecord');
const CommentParkingRecord = require('../models/CommentParkingRecord');
const configService = require('./configService');
const TimeUtils = require('../utils/time');
const { AppError } = require('../utils/errors');

function toDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw AppError.badRequest(`${fieldName} inválido`);
  }
  return date;
}

function isValidObjectId(value) {
  return Boolean(value && mongoose.Types.ObjectId.isValid(value));
}

function hasParkingRecord(dailyRecord, parkingRecordId) {
  return dailyRecord.parkedCars.some(
    (id) => id.toString() === parkingRecordId.toString()
  );
}

function validateDailyRecord(daily) {
  if (!daily?.localId || !daily?.date) {
    throw AppError.badRequest('Cada registro diario debe incluir localId y date');
  }
}

function validateParkingRecord(record) {
  if (!record?.localId || !record?.plateNumber || !record?.entryTime) {
    throw AppError.badRequest(
      'Cada parqueo debe incluir localId, plateNumber y entryTime'
    );
  }
}

function validateMobileComment(comment) {
  if (!comment?.localId || !comment?.message || !comment?.timestamp) {
    throw AppError.badRequest(
      'Cada comentario debe incluir localId, message y timestamp'
    );
  }
}

function resolveDeviceModel(payload, record) {
  return (
    record.deviceModel ||
    payload.deviceModel ||
    payload.device ||
    'mobile'
  );
}

const parkingSyncService = {
  async syncBatch(payload, user) {
    const { dailyRecords } = payload || {};
    if (!Array.isArray(dailyRecords)) {
      throw AppError.badRequest('dailyRecords debe ser un arreglo');
    }

    const config = await configService.getConfig();
    const timezone = config.timezone || 'UTC';

    let recordsProcessed = 0;
    const mappedDailyRecords = [];
    const touchedPlates = new Set();

    for (const daily of dailyRecords) {
      validateDailyRecord(daily);
      const dailyDoc = await this._upsertDailyRecord(daily, timezone);
      const mappedParkingRecords = [];

      for (const parkingRecord of daily.parkingRecords || []) {
        validateParkingRecord(parkingRecord);
        const parkingDoc = await this._upsertParkingRecord(
          parkingRecord,
          dailyDoc._id,
          { user, payload }
        );
        const mappedComments = await this._syncMobileComments(
          parkingDoc._id,
          parkingRecord.comments || [],
          user
        );

        if (!hasParkingRecord(dailyDoc, parkingDoc._id)) {
          dailyDoc.parkedCars.push(parkingDoc._id);
        }

        touchedPlates.add(parkingDoc.plateNumber);
        mappedParkingRecords.push({
          localId: parkingRecord.localId,
          remoteId: parkingDoc._id.toString(),
          price: parkingDoc.price,
          exitTime: parkingDoc.exitTime,
          comments: mappedComments,
        });
        recordsProcessed += 1;
      }

      dailyDoc.totalEarned = await this._recalculateDailyTotal(dailyDoc);
      await dailyDoc.save();

      mappedDailyRecords.push({
        localId: daily.localId,
        remoteId: dailyDoc._id.toString(),
        totalEarned: dailyDoc.totalEarned,
        parkingRecords: mappedParkingRecords,
      });
    }

    return {
      success: true,
      message:
        'Sincronización jerárquica con mapeo de doble ID procesada exitosamente.',
      recordsProcessed,
      configVersion: config.version,
      timezone,
      serverTimestamp: Date.now(),
      team: await this._teamSnapshot(touchedPlates),
      idMappings: { dailyRecords: mappedDailyRecords },
    };
  },

  async _upsertDailyRecord(daily, timezone) {
    const normalizedDate = TimeUtils.startOfDayInZone(daily.date, timezone);

    let dailyDoc = null;
    if (isValidObjectId(daily.remoteId)) {
      dailyDoc = await DailyParkingRecord.findById(daily.remoteId);
    }
    if (!dailyDoc) {
      dailyDoc = await DailyParkingRecord.findOne({ date: normalizedDate });
    }
    if (!dailyDoc) {
      dailyDoc = new DailyParkingRecord({
        date: normalizedDate,
        parkedCars: [],
        totalEarned: 0,
      });
    }
    return dailyDoc;
  },

  async _upsertParkingRecord(record, dailyRecordId, { user, payload }) {
    let parkingDoc = null;
    if (isValidObjectId(record.remoteId)) {
      parkingDoc = await ParkingRecord.findById(record.remoteId);
    }
    if (!parkingDoc) {
      parkingDoc = await ParkingRecord.findOne({ localId: record.localId });
    }

    const isNew = !parkingDoc;
    if (isNew) {
      parkingDoc = new ParkingRecord({ localId: record.localId });
    }

    const alreadyClosed = Boolean(parkingDoc.exitTime);
    const incomingExit = record.exitTime
      ? toDate(record.exitTime, 'exitTime')
      : null;

    parkingDoc.localId = record.localId;
    parkingDoc.plateNumber = record.plateNumber;
    parkingDoc.entryTime = toDate(record.entryTime, 'entryTime');
    parkingDoc.dailyParkingRecord = dailyRecordId;

    if (typeof record.hasTicket === 'boolean' && !alreadyClosed) {
      parkingDoc.hasTicket = record.hasTicket;
    }
    if (typeof record.isFree === 'boolean' && !alreadyClosed) {
      parkingDoc.isFree = record.isFree;
    }

    if (alreadyClosed) {
      // Política: la primera salida gana. Un sync posterior no reabre ni
      // recalcula un registro ya cerrado.
      parkingDoc.$locals.skipPriceRecalc = true;
    } else if (incomingExit) {
      parkingDoc.exitTime = incomingExit;
    }

    if (isNew) {
      parkingDoc.createdBy = user?.userId || null;
      parkingDoc.operatorName = user?.username || null;
      parkingDoc.deviceModel = resolveDeviceModel(payload, record);
    } else if (!parkingDoc.operatorName && user?.username) {
      parkingDoc.operatorName = user.username;
    }

    await parkingDoc.save();
    return parkingDoc;
  },

  async _recalculateDailyTotal(dailyDoc) {
    if (!dailyDoc.parkedCars.length) return 0;

    const [result] = await ParkingRecord.aggregate([
      { $match: { _id: { $in: dailyDoc.parkedCars } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    return Math.round(result?.total || 0);
  },

  async _teamSnapshot(plates) {
    if (!plates.size) return [];

    const records = await ParkingRecord.find({
      exitTime: null,
      plateNumber: { $in: Array.from(plates) },
    })
      .select(
        'plateNumber entryTime exitTime price isFree hasTicket operatorName deviceModel updatedAt'
      )
      .lean();

    return records.map((record) => ({
      ...record,
      entryTimeMillis: new Date(record.entryTime).getTime(),
      updatedAtMillis: record.updatedAt
        ? new Date(record.updatedAt).getTime()
        : null,
    }));
  },

  async _syncMobileComments(parkingRecordId, comments, user) {
    const mappedComments = [];

    for (const incomingComment of comments) {
      validateMobileComment(incomingComment);

      let commentDoc = await CommentParkingRecord.findOne({
        localId: incomingComment.localId,
      });

      if (!commentDoc) {
        commentDoc = new CommentParkingRecord({
          parkingRecordId,
          author: user.userId,
          message: incomingComment.message,
          localId: incomingComment.localId,
        });
      } else {
        commentDoc.message = incomingComment.message;
      }

      await commentDoc.save();

      mappedComments.push({
        localId: incomingComment.localId,
        remoteId: commentDoc._id.toString(),
      });
    }

    return mappedComments;
  },
};

module.exports = parkingSyncService;
