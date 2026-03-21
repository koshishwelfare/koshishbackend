import { getTeacherAttendanceQrPayload } from '../../utils/teacherAttendanceQr.js';
import { TeacherAttendance } from '../../models/teacher/teacherAttendanceSchema.js';
import mongoose from 'mongoose';

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const buildSummaryFromStatusCounts = (rows = []) => {
  const summary = { total: 0, present: 0, absent: 0, late: 0 };
  for (const row of rows) {
    const status = String(row?._id || '').toLowerCase();
    const count = Number(row?.count || 0);
    summary.total += count;
    if (status === 'present') summary.present += count;
    if (status === 'absent') summary.absent += count;
    if (status === 'late') summary.late += count;
  }
  return summary;
};

const getTeacherAttendanceDailyQr = async (req, res) => {
  try {
    const date = req.query?.date || new Date().toISOString().slice(0, 10);
    const payload = getTeacherAttendanceQrPayload(date);

    if (!payload.date || !payload.token) {
      return res.json({ success: false, message: 'Invalid date for QR generation' });
    }

    return res.json({
      success: true,
      message: 'Teacher attendance QR token generated successfully',
      data: payload
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const getTeacherAttendanceByDailyToken = async (req, res) => {
  try {
    const {
      date,
      dateFrom,
      dateTo,
      sessionId,
      classId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query || {};

    const safePage = toPositiveInt(page, 1);
    const safeLimit = Math.min(toPositiveInt(limit, 10), 100);

    const baseMatch = { qrTokenUsed: true };
    if (date) {
      baseMatch.date = String(date);
    } else {
      if (dateFrom || dateTo) {
        baseMatch.date = {};
      }
      if (dateFrom) baseMatch.date.$gte = String(dateFrom);
      if (dateTo) baseMatch.date.$lte = String(dateTo);
      if (baseMatch.date && !Object.keys(baseMatch.date).length) {
        delete baseMatch.date;
      }
    }

    const classObjectId = toObjectId(classId);
    if (classId && !classObjectId) {
      return res.json({ success: false, message: 'Invalid classId' });
    }
    if (classObjectId) {
      baseMatch.classId = classObjectId;
    }

    if (status && ['Present', 'Absent', 'Late'].includes(String(status))) {
      baseMatch.status = String(status);
    }

    const sortFieldMap = {
      createdAt: 'createdAt',
      date: 'date',
      status: 'status',
      teacher: 'teacherData.name',
      className: 'classData.name'
    };
    const sortField = sortFieldMap[sortBy] || 'createdAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'classData'
        }
      },
      { $unwind: { path: '$classData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'teachermodels',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacherData'
        }
      },
      { $unwind: { path: '$teacherData', preserveNullAndEmptyArrays: true } }
    ];

    const sessionObjectId = toObjectId(sessionId);
    if (sessionId && !sessionObjectId) {
      return res.json({ success: false, message: 'Invalid sessionId' });
    }
    if (sessionObjectId) {
      pipeline.push({ $match: { 'classData.sessionId': sessionObjectId } });
    }

    const safeSearch = String(search || '').trim();
    if (safeSearch) {
      pipeline.push({
        $match: {
          $or: [
            { 'teacherData.name': { $regex: safeSearch, $options: 'i' } },
            { 'teacherData.username': { $regex: safeSearch, $options: 'i' } },
            { 'teacherData.email': { $regex: safeSearch, $options: 'i' } },
            { 'classData.name': { $regex: safeSearch, $options: 'i' } },
            { 'classData.section': { $regex: safeSearch, $options: 'i' } },
            { status: { $regex: safeSearch, $options: 'i' } }
          ]
        }
      });
    }

    const [result] = await TeacherAttendance.aggregate([
      ...pipeline,
      {
        $facet: {
          data: [
            { $sort: { [sortField]: sortDirection, _id: -1 } },
            { $skip: (safePage - 1) * safeLimit },
            { $limit: safeLimit },
            {
              $project: {
                _id: 1,
                date: 1,
                status: 1,
                remarks: 1,
                createdAt: 1,
                qrTokenUsed: 1,
                distanceMeters: 1,
                teacherId: {
                  _id: '$teacherData._id',
                  name: '$teacherData.name',
                  username: '$teacherData.username',
                  email: '$teacherData.email',
                  phoneNumber: '$teacherData.phoneNumber'
                },
                classId: {
                  _id: '$classData._id',
                  name: '$classData.name',
                  grade: '$classData.grade',
                  section: '$classData.section',
                  sessionId: '$classData.sessionId'
                }
              }
            }
          ],
          totalCount: [{ $count: 'count' }],
          statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }]
        }
      }
    ]);

    const total = Number(result?.totalCount?.[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const summary = buildSummaryFromStatusCounts(result?.statusCounts || []);
    const payload = date ? getTeacherAttendanceQrPayload(date) : null;

    return res.json({
      success: true,
      message: 'Teacher attendance listing fetched successfully',
      data: {
        date: payload?.date || null,
        token: payload?.token || null,
        workingDay: payload?.workingDay ?? null,
        summary,
        attendance: result?.data || [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages
        },
        filters: {
          date: date || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          sessionId: sessionId || null,
          classId: classId || null,
          status: status || null,
          search: safeSearch,
          sortBy,
          sortOrder: sortDirection === 1 ? 'asc' : 'desc'
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getTeacherAttendanceDailyQr, getTeacherAttendanceByDailyToken };
