import MemberModel from '../../models/member/MemberSchema.js';
import { Follow } from '../../models/member/followSchema.js';
import { MemberActivity } from '../../models/member/memberActivitySchema.js';
import { DailyTeachingLog } from '../../models/teacher/dailyTeachingLogSchema.js';
import { TeacherAttendance } from '../../models/teacher/teacherAttendanceSchema.js';
import { TestSeries } from '../../models/App/testSeriesSchema.js';
import { homeEventsModel } from '../../models/Events/eventsSchema.js';
import { Class } from '../../models/class/classSchema.js';
import { verifyAuthToken } from '../../utils/authToken.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

const allowedActivityTabs = new Set(['all', 'daily_activity', 'test', 'event', 'attendance', 'class']);
const allowedSortBy = new Set(['date', 'title', 'type']);

const normalizeSortOrder = (value) => (String(value || '').toLowerCase() === 'asc' ? 1 : -1);

const textIncludes = (value, query) => String(value || '').toLowerCase().includes(String(query || '').toLowerCase());

const escapeRegex = (text = '') => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(0);
  return date;
};

const parseViewerFromRequest = async (req, memberId) => {
  let token = null;
  let decoded = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token && req.headers.authstudenttoken) token = req.headers.authstudenttoken;
  if (!token && req.headers.authteachertoken) token = req.headers.authteachertoken;
  if (!token && req.cookies?.studentToken) token = req.cookies.studentToken;
  if (!token && req.cookies?.teacherToken) token = req.cookies.teacherToken;

  if (!token) {
    return {
      type: null,
      canFollow: false,
      isFollowing: false
    };
  }

  try {
    decoded = verifyAuthToken(token);
  } catch (error) {
    return {
      type: null,
      canFollow: false,
      isFollowing: false
    };
  }

  if (decoded?.role === 'student' && decoded?.studentId) {
    const isFollowing = await Follow.exists({
      followerStudentId: decoded.studentId,
      followingTeacherId: memberId
    });

    return {
      type: 'student',
      canFollow: true,
      isFollowing: Boolean(isFollowing)
    };
  }

  if ((decoded?.role === 'teacher' || decoded?.role === 'mentor') && decoded?.userId) {
    const isSelf = String(decoded.userId) === String(memberId);
    if (isSelf) {
      return {
        type: 'teacher',
        canFollow: false,
        isFollowing: false
      };
    }

    const isFollowing = await Follow.exists({
      followerTeacherId: decoded.userId,
      followingTeacherId: memberId
    });

    return {
      type: 'teacher',
      canFollow: true,
      isFollowing: Boolean(isFollowing)
    };
  }

  return {
    type: null,
    canFollow: false,
    isFollowing: false
  };
};

const getMemberProfileDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.json({ success: false, message: 'Member id is required' });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);
    const activityTab = allowedActivityTabs.has(String(req.query.activityTab || '').toLowerCase())
      ? String(req.query.activityTab || '').toLowerCase()
      : 'all';
    const searchValue = String(req.query.q || '').trim().toLowerCase();
    const filterBy = String(req.query.filterBy || 'all').toLowerCase();
    const sortBy = allowedSortBy.has(String(req.query.sortBy || '').toLowerCase())
      ? String(req.query.sortBy || '').toLowerCase()
      : 'date';
    const sortOrder = normalizeSortOrder(req.query.sortOrder);

    const member = await MemberModel.findById(id).select(
      'name role image profileImage linkedin linkedinUrl instagramUrl facebookUrl youtubeUrl websiteUrl speciality quote aboutHead about joinTime leaveTime yog isActive isTop type email'
    );

    if (!member) {
      return res.json({ success: false, message: 'Member not found' });
    }

    const [followersCount, followingCount, manualActivities, dailyLogs, tests, events, attendanceRows, directClasses, viewer] = await Promise.all([
      Follow.countDocuments({ followingTeacherId: member._id }),
      Follow.countDocuments({ followerTeacherId: member._id }),
      MemberActivity.find({ memberId: member._id })
        .sort({ activityDate: -1 })
        .limit(120),
      DailyTeachingLog.find({ teacherId: member._id })
        .populate('classId', 'name grade')
        .sort({ date: -1, updatedAt: -1 })
        .limit(120),
      TestSeries.find({ createdById: member._id })
        .select('title subject className createdAt')
        .sort({ createdAt: -1 })
        .limit(120),
      homeEventsModel.find({
        $or: [
          { 'particpent.email': member.email },
          { 'particpent.name': { $regex: new RegExp(`^${escapeRegex(member.name)}$`, 'i') } }
        ]
      })
        .select('name startdate endDate isActive')
        .sort({ startdate: -1 })
        .limit(120),
      TeacherAttendance.find({ teacherId: member._id })
        .populate('classId', 'name grade')
        .select('date status remarks classId createdAt')
        .sort({ date: -1 })
        .limit(120),
      Class.find({
        $or: [
          { mentorId: member._id },
          { teacherId: member._id },
          { teacherIds: member._id }
        ]
      })
        .select('name grade section isActive createdAt updatedAt subjects')
        .sort({ updatedAt: -1 })
        .limit(120),
      parseViewerFromRequest(req, member._id)
    ]);

    const manualTimeline = manualActivities.map((item) => ({
      id: `manual-${item._id}`,
      type: item.activityType,
      title: item.title,
      description: item.description,
      date: normalizeDate(item.activityDate),
      source: item.source,
      filterTag: item.source || 'manual'
    }));

    const dailyTimeline = dailyLogs.map((item) => ({
      id: `daily-${item._id}`,
      type: 'daily_activity',
      title: item.topic || 'Daily teaching activity',
      description: [
        item.summary,
        item.homework ? `Homework: ${item.homework}` : '',
        item.classId?.name ? `Class: ${item.classId.name}` : ''
      ]
        .filter(Boolean)
        .join(' | '),
      date: normalizeDate(item.date || item.updatedAt || item.createdAt),
      source: 'system',
      filterTag: 'system'
    }));

    const testTimeline = tests.map((item) => ({
      id: `test-${item._id}`,
      type: 'test',
      title: item.title || 'Test activity',
      description: [item.subject, item.className].filter(Boolean).join(' | '),
      date: normalizeDate(item.createdAt),
      source: 'system',
      filterTag: 'system'
    }));

    const eventTimeline = events.map((item) => ({
      id: `event-${item._id}`,
      type: 'event',
      title: item.name || 'Event participation',
      description: item.isActive ? 'Active event participant' : 'Past event participant',
      date: normalizeDate(item.startdate || item.endDate),
      source: 'system',
      filterTag: item.isActive ? 'active' : 'past'
    }));

    const attendanceTimeline = attendanceRows.map((item) => ({
      id: `attendance-${item._id}`,
      type: 'attendance',
      title: `Attendance: ${item.status}`,
      description: [
        item.classId?.name ? `Class: ${item.classId.name}` : '',
        item.remarks || ''
      ].filter(Boolean).join(' | '),
      date: normalizeDate(item.date || item.createdAt),
      source: 'system',
      filterTag: String(item.status || '').toLowerCase()
    }));

    const classMap = new Map();

    for (const classDoc of directClasses) {
      const classId = String(classDoc._id);
      const title = [classDoc.name, classDoc.grade ? `Grade ${classDoc.grade}` : '', classDoc.section ? `Sec ${classDoc.section}` : '']
        .filter(Boolean)
        .join(' | ');

      const subjects = Array.isArray(classDoc.subjects) ? classDoc.subjects : [];
      const chapterCount = subjects.reduce((acc, subject) => acc + (Array.isArray(subject.chapters) ? subject.chapters.length : 0), 0);
      const taughtChapterCount = subjects.reduce(
        (acc, subject) =>
          acc +
          (Array.isArray(subject.chapters)
            ? subject.chapters.filter((chapter) => chapter.isTaught).length
            : 0),
        0
      );

      classMap.set(classId, {
        id: `class-${classDoc._id}`,
        type: 'class',
        title: title || 'Joined Class',
        description: `${classDoc.isActive ? 'Currently active class' : 'Inactive class'} | Subjects: ${subjects.length} | Chapters: ${chapterCount} | Taught: ${taughtChapterCount}`,
        date: normalizeDate(classDoc.updatedAt || classDoc.createdAt),
        source: 'system',
        filterTag: 'direct'
      });
    }

    for (const logRow of dailyLogs) {
      if (!logRow.classId?._id) continue;
      const classId = String(logRow.classId._id);
      const existing = classMap.get(classId);
      const logDate = normalizeDate(logRow.date || logRow.updatedAt || logRow.createdAt);

      if (!existing) {
        classMap.set(classId, {
          id: `class-${classId}`,
          type: 'class',
          title: [logRow.classId?.name, logRow.classId?.grade ? `Grade ${logRow.classId.grade}` : ''].filter(Boolean).join(' | ') || 'Joined Class',
          description: 'Class found from teaching logs',
          date: logDate,
          source: 'system',
          filterTag: 'activity'
        });
      } else if (logDate.getTime() > existing.date.getTime()) {
        existing.date = logDate;
      }
    }

    for (const attendanceRow of attendanceRows) {
      if (!attendanceRow.classId?._id) continue;
      const classId = String(attendanceRow.classId._id);
      const existing = classMap.get(classId);
      const attendanceDate = normalizeDate(attendanceRow.date || attendanceRow.createdAt);

      if (!existing) {
        classMap.set(classId, {
          id: `class-${classId}`,
          type: 'class',
          title: [attendanceRow.classId?.name, attendanceRow.classId?.grade ? `Grade ${attendanceRow.classId.grade}` : ''].filter(Boolean).join(' | ') || 'Joined Class',
          description: 'Class found from attendance history',
          date: attendanceDate,
          source: 'system',
          filterTag: 'activity'
        });
      } else if (attendanceDate.getTime() > existing.date.getTime()) {
        existing.date = attendanceDate;
      }
    }

    const classTimeline = Array.from(classMap.values());

    const fullTimeline = [...manualTimeline, ...dailyTimeline, ...testTimeline, ...eventTimeline, ...attendanceTimeline, ...classTimeline];

    let timeline = fullTimeline;

    if (activityTab !== 'all') {
      timeline = timeline.filter((item) => item.type === activityTab);
    }

    if (searchValue) {
      timeline = timeline.filter((item) =>
        textIncludes(item.title, searchValue) || textIncludes(item.description, searchValue)
      );
    }

    if (filterBy && filterBy !== 'all') {
      timeline = timeline.filter((item) => String(item.filterTag || '').toLowerCase() === filterBy);
    }

    timeline = timeline.sort((a, b) => {
      const direction = sortOrder;
      if (sortBy === 'title') {
        return direction * String(a.title || '').localeCompare(String(b.title || ''));
      }
      if (sortBy === 'type') {
        return direction * String(a.type || '').localeCompare(String(b.type || ''));
      }
      return direction * (a.date.getTime() - b.date.getTime());
    });

    const attendanceStats = attendanceRows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === 'Present') acc.present += 1;
        else if (row.status === 'Absent') acc.absent += 1;
        else if (row.status === 'Late') acc.late += 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0 }
    );

    const attendanceRate = attendanceStats.total
      ? Number(((attendanceStats.present / attendanceStats.total) * 100).toFixed(2))
      : 0;

    const total = timeline.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTimeline = timeline.slice(start, end).map((item) => ({
      ...item,
      date: item.date.toISOString()
    }));

    const stats = {
      followersCount,
      followingCount,
      dailyActivityCount: manualTimeline.filter((item) => item.type === 'daily_activity').length + dailyTimeline.length,
      testsCount: manualTimeline.filter((item) => item.type === 'test').length + testTimeline.length,
      eventsCount: manualTimeline.filter((item) => item.type === 'event').length + eventTimeline.length,
      joinedClassesCount: classTimeline.length,
      attendanceCount: attendanceStats.total,
      attendanceRate,
      attendancePresent: attendanceStats.present,
      attendanceAbsent: attendanceStats.absent,
      attendanceLate: attendanceStats.late
    };

    return res.json({
      success: true,
      message: 'Member profile dashboard fetched successfully',
      data: {
        profile: member,
        stats,
        timeline: paginatedTimeline,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        activityControls: {
          activityTab,
          q: searchValue,
          filterBy,
          sortBy,
          sortOrder: sortOrder === 1 ? 'asc' : 'desc'
        },
        viewer,
        followRules: {
          student: 'Student can follow teacher profiles',
          teacher: 'Teacher can follow other teachers only',
          teacherCannotFollowStudent: true
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getMemberProfileDashboard };
