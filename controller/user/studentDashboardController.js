import { Student } from '../../models/student/studentSchema.js';
import { TestSeries } from '../../models/App/testSeriesSchema.js';
import { TestSubmission } from '../../models/App/testSubmissionSchema.js';
import { StudentAttendance } from '../../models/student/studentAttendanceSchema.js';
import { Assignment } from '../../models/class/assignmentSchema.js';

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

const getStudentDashboard = async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    const [totalTests, attemptedTests, attendanceCount, presentCount, totalAssignments, pendingAssignments] = await Promise.all([
      TestSeries.countDocuments({ isActive: true }),
      TestSubmission.countDocuments({ studentId: student._id }),
      StudentAttendance.countDocuments({ studentId: student._id }),
      StudentAttendance.countDocuments({ studentId: student._id, status: 'Present' }),
      Assignment.countDocuments({ classId: student.classId, sessionId: student.sessionId, isActive: true }),
      Assignment.countDocuments({
        classId: student.classId,
        sessionId: student.sessionId,
        isActive: true,
        deadline: { $gte: new Date() }
      })
    ]);

    const attendanceRate = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0;

    return res.json({
      success: true,
      message: 'Student dashboard fetched successfully',
      data: {
        counts: {
          totalTests,
          attemptedTests,
          attendanceCount,
          presentCount,
          attendanceRate,
          totalAssignments,
          pendingAssignments
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listStudentAssignments = async (req, res) => {
  try {
    const student = await Student.findById(req.studentId);
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    const data = await Assignment.find({
      classId: student.classId,
      sessionId: student.sessionId,
      isActive: true
    })
      .populate('classId', 'name grade')
      .populate('sessionId', 'name startYear endYear')
      .populate('teacherId', 'username email')
      .sort({ deadline: 1 });

    return res.json({ success: true, message: 'Assignments fetched successfully', data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const markStudentSelfAttendance = async (req, res) => {
  try {
    const { qrToken, latitude, longitude, remarks = '' } = req.body;

    if (!qrToken) {
      return res.json({ success: false, message: 'qrToken is required' });
    }

    const expectedQrToken = process.env.STUDENT_ATTENDANCE_QR_TOKEN || 'KOSHISH-SELF-ATTENDANCE';
    if (String(qrToken) !== String(expectedQrToken)) {
      return res.json({ success: false, message: 'Invalid QR token' });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      return res.json({ success: false, message: 'latitude and longitude are required' });
    }

    const campusLat = Number(process.env.STUDENT_ATTENDANCE_CENTER_LAT);
    const campusLng = Number(process.env.STUDENT_ATTENDANCE_CENTER_LNG);
    const maxRadiusMeters = Number(process.env.STUDENT_ATTENDANCE_RADIUS_METERS || 300);

    let distanceMeters = null;
    if (!Number.isNaN(campusLat) && !Number.isNaN(campusLng)) {
      distanceMeters = haversineDistanceMeters(campusLat, campusLng, parsedLatitude, parsedLongitude);
      if (distanceMeters > maxRadiusMeters) {
        return res.json({
          success: false,
          message: `Out of allowed range. Distance ${Math.round(distanceMeters)}m exceeds ${maxRadiusMeters}m`
        });
      }
    }

    const date = new Date().toISOString().slice(0, 10);
    const existingAttendance = await StudentAttendance.findOne({ studentId: req.studentId, date });
    if (existingAttendance && existingAttendance.markedByRole === 'teacher') {
      return res.json({
        success: false,
        message: 'Attendance already marked by teacher for today'
      });
    }

    const attendance = await StudentAttendance.findOneAndUpdate(
      { studentId: req.studentId, date },
      {
        studentId: req.studentId,
        date,
        status: 'Present',
        remarks,
        markedByRole: 'student',
        source: 'student-self',
        ipAddress: req.ip || '',
        deviceInfo: req.headers['user-agent'] || '',
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        distanceMeters
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    return res.json({
      success: true,
      message: 'Self attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getStudentDashboard, listStudentAssignments, markStudentSelfAttendance };
