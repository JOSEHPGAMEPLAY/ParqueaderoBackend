const mongoose = require('mongoose');
const ParkingRecord = require('../models/ParkingRecord');
const DailyParkingRecord = require('../models/DailyParkingRecord');
const CommentParkingRecord = require('../models/CommentParkingRecord');
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
  return dailyRecord.parkedCars.some((id) => id.toString() === parkingRecordId.toString());
}

function validateDailyRecord(daily) {
  if (!daily?.localId || !daily?.date) {
    throw AppError.badRequest('Cada registro diario debe incluir localId y date');
  }
}

function validateParkingRecord(record) {
  if (!record?.localId || !record?.plateNumber || !record?.entryTime) {
    throw AppError.badRequest('Cada parqueo debe incluir localId, plateNumber y entryTime');
  }
}

function validateMobileComment(comment) {
  if (!comment?.localId || !comment?.message || !comment?.timestamp) {
    throw AppError.badRequest('Cada comentario debe incluir localId, message y timestamp');
  }
}

const parkingSyncService = {
  async syncBatch(payload, user) {
    const { dailyRecords } = payload;
    if (!Array.isArray(dailyRecords)) {
      throw AppError.badRequest('dailyRecords debe ser un arreglo');
    }

    let recordsProcessed = 0;
    const mappedDailyRecords = [];

    for (const daily of dailyRecords) {
      validateDailyRecord(daily);
      const dailyDoc = await this._upsertDailyRecord(daily);
      const mappedParkingRecords = [];

      for (const parkingRecord of daily.parkingRecords || []) {
        validateParkingRecord(parkingRecord);
        const parkingDoc = await this._upsertParkingRecord(parkingRecord, dailyDoc._id);
        const mappedComments = await this._syncMobileComments(
          parkingDoc._id,
          parkingRecord.comments || [],
          user
        );

        if (!hasParkingRecord(dailyDoc, parkingDoc._id)) {
          dailyDoc.parkedCars.push(parkingDoc._id);
        }

        mappedParkingRecords.push({
          localId: parkingRecord.localId,
          remoteId: parkingDoc._id.toString(),
          comments: mappedComments,
        });
        recordsProcessed += 1;
      }

      if (typeof daily.totalEarned === 'number') {
        dailyDoc.totalEarned = daily.totalEarned;
      }
      await dailyDoc.save();

      mappedDailyRecords.push({
        localId: daily.localId,
        remoteId: dailyDoc._id.toString(),
        parkingRecords: mappedParkingRecords,
      });
    }

    return {
      success: true,
      message: 'Sincronización jerárquica con mapeo de doble ID procesada exitosamente.',
      recordsProcessed,
      serverTimestamp: Date.now(),
      idMappings: { dailyRecords: mappedDailyRecords },
    };
  },

  async _upsertDailyRecord(daily) {
    let dailyDoc = null;
    if (isValidObjectId(daily.remoteId)) {
      dailyDoc = await DailyParkingRecord.findById(daily.remoteId);
    }
    if (!dailyDoc) {
      dailyDoc = await DailyParkingRecord.findOne({ date: toDate(daily.date, 'date') });
    }
    if (!dailyDoc) {
      dailyDoc = new DailyParkingRecord({
        date: toDate(daily.date, 'date'),
        parkedCars: [],
        totalEarned: typeof daily.totalEarned === 'number' ? daily.totalEarned : 0,
      });
    }
    return dailyDoc;
  },

  async _upsertParkingRecord(record, dailyRecordId) {
    let parkingDoc = null;
    if (isValidObjectId(record.remoteId)) {
      parkingDoc = await ParkingRecord.findById(record.remoteId);
    }
    if (!parkingDoc) {
      parkingDoc = await ParkingRecord.findOne({ localId: record.localId });
    }
    if (!parkingDoc) {
      parkingDoc = new ParkingRecord({ localId: record.localId });
    }

    parkingDoc.localId = record.localId;
    parkingDoc.plateNumber = record.plateNumber;
    parkingDoc.entryTime = toDate(record.entryTime, 'entryTime');
    parkingDoc.exitTime = record.exitTime ? toDate(record.exitTime, 'exitTime') : null;
    parkingDoc.isFree = Boolean(record.isFree);
    parkingDoc.dailyParkingRecord = dailyRecordId;
    if (typeof record.price === 'number') {
      parkingDoc.price = record.price;
    }

    await parkingDoc.save();
    return parkingDoc;
  },

  async _syncMobileComments(parkingRecordId, comments, user) {
    const mappedComments = [];

    for (const incomingComment of comments) {
      validateMobileComment(incomingComment);

      let commentDoc = await CommentParkingRecord.findOne({ localId: incomingComment.localId });

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
