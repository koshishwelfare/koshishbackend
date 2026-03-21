import crypto from 'crypto';
import config from '../config.js';

const toDateKey = (dateValue = new Date().toISOString().slice(0, 10)) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const isWorkingDay = (dateValue) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const day = parsed.getDay();
  return day >= 1 && day <= 5;
};

const buildTeacherAttendanceToken = (dateValue) => {
  const dateKey = toDateKey(dateValue);
  if (!dateKey) return null;

  const secret = process.env.TEACHER_ATTENDANCE_QR_SECRET || config.jwt.secret || 'koshish-teacher-attendance';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`teacher-attendance:${dateKey}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();

  return `KOSHISH-${dateKey.replace(/-/g, '')}-${signature}`;
};

const getTeacherAttendanceQrPayload = (dateValue) => {
  const dateKey = toDateKey(dateValue);
  if (!dateKey) {
    return { date: null, token: null, workingDay: false };
  }

  return {
    date: dateKey,
    token: buildTeacherAttendanceToken(dateKey),
    workingDay: isWorkingDay(dateKey)
  };
};

export {
  toDateKey,
  isWorkingDay,
  buildTeacherAttendanceToken,
  getTeacherAttendanceQrPayload
};
