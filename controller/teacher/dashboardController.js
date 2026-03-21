import { Student } from '../../models/student/studentSchema.js';
import { TestSeries } from '../../models/App/testSeriesSchema.js';
import { Assignment } from '../../models/class/assignmentSchema.js';
import { StudentAttendance } from '../../models/student/studentAttendanceSchema.js';

const getTeacherDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      studentCount,
      testCount,
      assignmentCount,
      activeAssignmentCount,
      attendanceToday,
      recentTests,
      recentAssignments,
      weeklyAttendance
    ] = await Promise.all([
      Student.countDocuments({}),
      TestSeries.countDocuments({ createdByRole: 'teacher' }),
      Assignment.countDocuments({}),
      Assignment.countDocuments({ isActive: true, deadline: { $gte: new Date() } }),
      StudentAttendance.countDocuments({ date: today, markedByRole: 'teacher' }),
      TestSeries.find({ createdByRole: 'teacher' })
        .select('title subject className createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Assignment.find({})
        .select('title subject grade deadline isActive createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      StudentAttendance.countDocuments({
        markedByRole: 'teacher',
        createdAt: { $gte: sevenDaysAgo }
      })
    ]);

    return res.json({
      success: true,
      message: 'Teacher dashboard fetched successfully',
      data: {
        counts: {
          students: studentCount,
          tests: testCount,
          assignments: assignmentCount,
          activeAssignments: activeAssignmentCount,
          attendanceToday,
          weeklyAttendance
        },
        recent: {
          tests: recentTests,
          assignments: recentAssignments
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export { getTeacherDashboard };
