import { AcademicSession } from '../../models/class/academicSessionSchema.js';
import MemberModel from '../../models/member/MemberSchema.js';
import { Class } from '../../models/class/classSchema.js';
import { Student } from '../../models/student/studentSchema.js';
import { TestSeries } from '../../models/App/testSeriesSchema.js';
import { Assignment } from '../../models/class/assignmentSchema.js';
import { StudentAttendance } from '../../models/student/studentAttendanceSchema.js';

const getCocirculerDashboard = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const [
            sessionCount,
            activeSessionCount,
            teacherCount,
            activeTeacherCount,
            classCount,
            activeClassCount,
            studentCount,
            testCount,
            assignmentCount,
            attendanceTodayCount,
            recentSessions,
            recentClasses
        ] = await Promise.all([
            AcademicSession.countDocuments({}),
            AcademicSession.countDocuments({ isActive: true }),
            MemberModel.countDocuments({ role: 'mentor' }),
            MemberModel.countDocuments({ role: 'mentor', isActive: true }),
            Class.countDocuments({}),
            Class.countDocuments({ isActive: true }),
            Student.countDocuments({}),
            TestSeries.countDocuments({}),
            Assignment.countDocuments({}),
            StudentAttendance.countDocuments({ date: today }),
            AcademicSession.find({}).sort({ createdAt: -1 }).limit(5),
            Class.find({})
                .populate('sessionId', 'name startYear endYear')
                .populate('teacherId', 'username email')
                .sort({ _id: -1 })
                .limit(5)
        ]);

        return res.json({
            success: true,
            message: 'Dashboard data fetched successfully',
            data: {
                counts: {
                    sessions: sessionCount,
                    activeSessions: activeSessionCount,
                    teachers: teacherCount,
                    activeTeachers: activeTeacherCount,
                    classes: classCount,
                    activeClasses: activeClassCount,
                    students: studentCount,
                    tests: testCount,
                    assignments: assignmentCount,
                    attendanceToday: attendanceTodayCount
                },
                recent: {
                    sessions: recentSessions,
                    classes: recentClasses
                }
            }
        });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

export default getCocirculerDashboard;