import { Student } from '../../models/student/studentSchema.js';
import { StudentAttendance } from '../../models/student/studentAttendanceSchema.js';
import { TeacherAttendance } from '../../models/teacher/teacherAttendanceSchema.js';
import { Class } from '../../models/class/classSchema.js';
import { DailyTeachingLog } from '../../models/teacher/dailyTeachingLogSchema.js';
import mongoose from 'mongoose';

const isWorkingDay = (dateValue) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const day = parsed.getDay();
  return day >= 1 && day <= 5;
};

const getStudentsForAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.classId) {
      filter.classId = req.query.classId;
    }

    const students = await Student.find(filter, {
      _id: 1,
      name: 1,
      username: 1,
      rollNumber: 1,
      registrationNumber: 1,
      classId: 1,
      sessionId: 1,
      course: 1,
      year: 1
    }).sort({ name: 1 });

    return res.json({ success: true, data: students, message: 'Students fetched successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const markStudentAttendance = async (req, res) => {
  try {
    const { studentId, classId, date, status, remarks } = req.body;
    const teacherId = req.teacher?.userId;

    if (!studentId || !classId || !date || !status) {
      return res.json({ success: false, message: 'studentId, classId, date and status are required' });
    }

    if (!isWorkingDay(date)) {
      return res.json({ success: false, message: 'Student attendance can only be marked on working days' });
    }

    const student = await Student.findById(studentId).select('_id classId');
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    if (String(student.classId || '') !== String(classId)) {
      return res.json({ success: false, message: 'Student does not belong to selected class' });
    }

    if (teacherId) {
      const teacherDay = await TeacherAttendance.findOne({ teacherId, date }).select('classId');
      if (!teacherDay) {
        return res.json({
          success: false,
          message: 'Mark your own attendance with class selection first before student attendance.'
        });
      }

      if (String(teacherDay.classId || '') !== String(classId)) {
        return res.json({
          success: false,
          message: 'You can only mark attendance for your selected class of the day.'
        });
      }
    }

    const attendance = await StudentAttendance.findOneAndUpdate(
      { studentId, date },
      {
        studentId,
        date,
        status,
        remarks: remarks || '',
        markedByRole: 'teacher',
        source: 'teacher',
        ipAddress: req.ip || '',
        deviceInfo: req.headers['user-agent'] || ''
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    return res.json({ success: true, data: attendance, message: 'Attendance marked successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const listStudentAttendanceByTeacher = async (req, res) => {
  try {
    const teacherId = req.teacher?.userId;
    if (!teacherId) {
      return res.json({ success: false, message: 'Teacher authentication required' });
    }

    const {
      search = '',
      classId = '',
      date = '',
      status = '',
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query || {};

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const teacherClasses = await Class.find({
      isActive: true,
      $or: [{ teacherId }, { teacherIds: teacherId }]
    }).select('_id');

    const teacherClassIds = teacherClasses.map((cls) => cls._id);
    if (!teacherClassIds.length) {
      return res.json({
        success: true,
        message: 'Student attendance fetched successfully',
        data: {
          records: [],
          pagination: {
            page: safePage,
            limit: safeLimit,
            total: 0,
            totalPages: 1
          }
        }
      });
    }

    const studentFilter = { classId: { $in: teacherClassIds } };
    if (classId) {
      const isOwnedClass = teacherClassIds.some((id) => String(id) === String(classId));
      if (!isOwnedClass) {
        return res.json({ success: false, message: 'You are not assigned to selected class' });
      }
      studentFilter.classId = classId;
    }

    const safeSearch = String(search || '').trim();
    let searchedStudentIds = [];
    if (safeSearch) {
      searchedStudentIds = await Student.find(
        {
          ...studentFilter,
          $or: [
            { name: { $regex: safeSearch, $options: 'i' } },
            { username: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
            { rollNumber: { $regex: safeSearch, $options: 'i' } },
            { registrationNumber: { $regex: safeSearch, $options: 'i' } }
          ]
        },
        { _id: 1 }
      ).lean();
    }

    const baseStudentIds = await Student.find(studentFilter, { _id: 1 }).lean();
    const attendanceFilter = {
      studentId: { $in: baseStudentIds.map((item) => item._id) }
    };

    if (date) {
      attendanceFilter.date = date;
    }
    if (status) {
      attendanceFilter.status = status;
    }

    if (safeSearch) {
      attendanceFilter.$or = [
        { date: { $regex: safeSearch, $options: 'i' } },
        { status: { $regex: safeSearch, $options: 'i' } },
        { remarks: { $regex: safeSearch, $options: 'i' } },
        { studentId: { $in: searchedStudentIds.map((item) => item._id) } }
      ];
    }

    const allowedSort = ['date', 'status', 'createdAt'];
    const effectiveSortBy = allowedSort.includes(String(sortBy)) ? String(sortBy) : 'date';
    const effectiveSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const total = await StudentAttendance.countDocuments(attendanceFilter);
    const records = await StudentAttendance.find(attendanceFilter)
      .populate({
        path: 'studentId',
        select: 'name username email rollNumber registrationNumber classId sessionId',
        populate: [
          { path: 'classId', select: '_id name grade section sessionId' },
          { path: 'sessionId', select: '_id name startYear endYear' }
        ]
      })
      .sort({ [effectiveSortBy]: effectiveSortOrder, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    const classIdsInPage = [
      ...new Set(
        records
          .map((row) => String(row?.studentId?.classId?._id || row?.studentId?.classId || ''))
          .filter(Boolean)
      )
    ];
    const datesInPage = [...new Set(records.map((row) => String(row?.date || '')).filter(Boolean))];

    let classTotalMap = new Map();
    let classPresentMap = new Map();
    let classTopicMap = new Map();

    if (classIdsInPage.length) {
      const classObjectIds = classIdsInPage
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (!classObjectIds.length) {
        return res.json({
          success: true,
          message: 'Student attendance fetched successfully',
          data: {
            records: records.map((row) => ({
              ...row.toObject(),
              classSummary: {
                totalStudents: 0,
                presentStudents: 0,
                presentPercentage: 0,
                subjectTaught: ''
              }
            })),
            pagination: {
              page: safePage,
              limit: safeLimit,
              total,
              totalPages: Math.max(Math.ceil(total / safeLimit), 1)
            },
            filters: {
              search: safeSearch,
              classId: classId || null,
              date: date || null,
              status: status || null,
              sortBy: effectiveSortBy,
              sortOrder: effectiveSortOrder === 1 ? 'asc' : 'desc'
            }
          }
        });
      }

      const classTotalRows = await Student.aggregate([
        { $match: { classId: { $in: classObjectIds } } },
        { $group: { _id: '$classId', totalStudents: { $sum: 1 } } }
      ]);
      classTotalMap = new Map(classTotalRows.map((row) => [String(row._id), Number(row.totalStudents || 0)]));

      if (datesInPage.length) {
        const presentRows = await StudentAttendance.aggregate([
          {
            $match: {
              date: { $in: datesInPage },
              status: 'Present',
              studentId: { $in: baseStudentIds.map((item) => item._id) }
            }
          },
          {
            $lookup: {
              from: 'students',
              localField: 'studentId',
              foreignField: '_id',
              as: 'student'
            }
          },
          { $unwind: '$student' },
          { $match: { 'student.classId': { $in: classObjectIds } } },
          {
            $group: {
              _id: { classId: '$student.classId', date: '$date' },
              presentStudents: { $sum: 1 }
            }
          }
        ]);

        classPresentMap = new Map(
          presentRows.map((row) => [
            `${String(row?._id?.classId || '')}__${String(row?._id?.date || '')}`,
            Number(row.presentStudents || 0)
          ])
        );

        const dailyLogs = await DailyTeachingLog.find({
          teacherId,
          classId: { $in: classObjectIds },
          date: { $in: datesInPage }
        }).select('classId date topic');

        classTopicMap = new Map(
          dailyLogs.map((log) => [`${String(log.classId || '')}__${String(log.date || '')}`, String(log.topic || '')])
        );
      }
    }

    const recordsWithSummary = records.map((row) => {
      const classIdValue = String(row?.studentId?.classId?._id || row?.studentId?.classId || '');
      const dateValue = String(row?.date || '');
      const totalStudents = Number(classTotalMap.get(classIdValue) || 0);
      const presentStudents = Number(classPresentMap.get(`${classIdValue}__${dateValue}`) || 0);
      const presentPercentage = totalStudents ? Number(((presentStudents / totalStudents) * 100).toFixed(2)) : 0;
      const subjectTaught = classTopicMap.get(`${classIdValue}__${dateValue}`) || '';

      return {
        ...row.toObject(),
        classSummary: {
          totalStudents,
          presentStudents,
          presentPercentage,
          subjectTaught
        }
      };
    });

    return res.json({
      success: true,
      message: 'Student attendance fetched successfully',
      data: {
        records: recordsWithSummary,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(Math.ceil(total / safeLimit), 1)
        },
        filters: {
          search: safeSearch,
          classId: classId || null,
          date: date || null,
          status: status || null,
          sortBy: effectiveSortBy,
          sortOrder: effectiveSortOrder === 1 ? 'asc' : 'desc'
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getStudentsForAttendance, markStudentAttendance, listStudentAttendanceByTeacher };
