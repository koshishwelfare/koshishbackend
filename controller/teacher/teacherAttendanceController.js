import MemberModel from '../../models/member/MemberSchema.js';
import { TeacherAttendance } from '../../models/teacher/teacherAttendanceSchema.js';
import { Class } from '../../models/class/classSchema.js';
import { buildTeacherAttendanceToken, isWorkingDay } from '../../utils/teacherAttendanceQr.js';

const toRadians = (value) => (value * Math.PI) / 180;

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const markTeacherSelfAttendance = async (req, res) => {
  try {
    const { teacherId, classId, qrToken, latitude, longitude, date, remarks = '', status = 'Present' } = req.body;

    const effectiveTeacherId = req.teacher?.userId || teacherId;

    if (!effectiveTeacherId || !classId || !qrToken || latitude === undefined || longitude === undefined) {
      return res.json({
        success: false,
        message: 'teacherId, classId, qrToken, latitude and longitude are required'
      });
    }

    const effectiveDate = date || new Date().toISOString().slice(0, 10);
    if (!isWorkingDay(effectiveDate)) {
      return res.json({ success: false, message: 'Teacher attendance can only be marked on working days' });
    }

    const expectedQrToken = buildTeacherAttendanceToken(effectiveDate);
    if (String(qrToken) !== String(expectedQrToken)) {
      return res.json({ success: false, message: 'Invalid QR token' });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      return res.json({ success: false, message: 'Invalid latitude or longitude' });
    }

    const teacher = await MemberModel.findOne({ _id: effectiveTeacherId, role: 'mentor' });
    if (!teacher || !teacher.isActive) {
      return res.json({ success: false, message: 'Teacher not found or inactive' });
    }

    const classData = await Class.findById(classId).select('_id teacherId teacherIds isActive');
    if (!classData || classData.isActive === false) {
      return res.json({ success: false, message: 'Invalid classId' });
    }

    const classTeacherIds = Array.isArray(classData.teacherIds) ? classData.teacherIds.map((id) => String(id)) : [];
    const isTeacherAssigned =
      (classData.teacherId && String(classData.teacherId) === String(effectiveTeacherId)) ||
      classTeacherIds.includes(String(effectiveTeacherId));

    if ((classData.teacherId || classTeacherIds.length) && !isTeacherAssigned) {
      return res.json({ success: false, message: 'You are not assigned to this class' });
    }

    if (!classTeacherIds.includes(String(effectiveTeacherId))) {
      classData.teacherIds = [...(classData.teacherIds || []), effectiveTeacherId];
    }

    if (!classData.teacherId) {
      classData.teacherId = effectiveTeacherId;
      await classData.save();
    } else if (!isTeacherAssigned) {
      await classData.save();
    }

    const centerLat = Number(process.env.TEACHER_ATTENDANCE_CENTER_LAT);
    const centerLng = Number(process.env.TEACHER_ATTENDANCE_CENTER_LNG);
    const maxRadiusMeters = Number(process.env.TEACHER_ATTENDANCE_RADIUS_METERS || 300);

    let distanceMeters = null;
    if (!Number.isNaN(centerLat) && !Number.isNaN(centerLng)) {
      distanceMeters = haversineDistanceMeters(centerLat, centerLng, parsedLatitude, parsedLongitude);
      if (distanceMeters > maxRadiusMeters) {
        return res.json({
          success: false,
          message: `Out of allowed range. Distance ${Math.round(distanceMeters)}m exceeds ${maxRadiusMeters}m`
        });
      }
    }

    const existingForDay = await TeacherAttendance.findOne({ teacherId: effectiveTeacherId, date: effectiveDate });
    if (existingForDay && String(existingForDay.classId || '') !== String(classId)) {
      return res.json({
        success: false,
        message: 'You already selected a different class for this date. One class attendance is allowed per day.'
      });
    }

    const attendance = await TeacherAttendance.findOneAndUpdate(
      { teacherId: effectiveTeacherId, date: effectiveDate },
      {
        teacherId: effectiveTeacherId,
        classId,
        date: effectiveDate,
        status,
        remarks,
        qrTokenUsed: true,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        distanceMeters,
        ipAddress: req.ip || '',
        deviceInfo: req.headers['user-agent'] || ''
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.json({
      success: true,
      message: 'Teacher attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getTeacherAttendance = async (req, res) => {
  try {
    const { teacherId, date, classId } = req.query;
    const filter = {};

    if (teacherId) {
      filter.teacherId = teacherId;
    }

    if (classId) {
      filter.classId = classId;
    }

    if (date) {
      filter.date = date;
    }

    const data = await TeacherAttendance.find(filter)
      .populate('teacherId', 'username email phoneNumber')
      .populate('classId', 'name grade section')
      .sort({ date: -1, createdAt: -1 });

    return res.json({ success: true, message: 'Teacher attendance fetched successfully', data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { markTeacherSelfAttendance, getTeacherAttendance };
