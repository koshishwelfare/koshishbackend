import express from 'express'
import asyncHandler from 'express-async-handler'
import loginTeacher from '../middleware/authentication/teacherLogin.js';
import authTeacher from '../middleware/authentication/teacherAuth.js';
import upload from '../middleware/cloudimage/multer.js';
import { addTestSeries, getAllTestSeriesForTeacher } from '../controller/teacher/testSeriesController.js';
import { getStudentsForAttendance, markStudentAttendance, listStudentAttendanceByTeacher } from '../controller/teacher/studentAttendanceController.js';
import {
	addStudentByTeacher,
	getStudentPerformanceByTeacher,
	listStudentsByTeacher,
	recoverTeacherCredentialsByEmail,
	recoverStudentCredentialsByEmail
} from '../controller/teacher/studentManagementController.js';
import { logoutTeacher } from '../controller/auth/logoutController.js';
import { createAssignment, getTeacherAssignments, updateTeacherAssignment } from '../controller/teacher/assignmentController.js';
import { getTeacherDashboard } from '../controller/teacher/dashboardController.js';
import { getTeacherAttendance, markTeacherSelfAttendance } from '../controller/teacher/teacherAttendanceController.js';
import { getDailyTeachingLogs, upsertDailyTeachingLog } from '../controller/teacher/dailyTeachingLogController.js';
import { getMyClasses } from '../controller/teacher/teacherClassController.js';
import { getTeacherProfile, updateTeacherPassword, updateTeacherProfile } from '../controller/teacher/teacherProfileController.js';
import {
	addClassChapter,
	addClassSubject,
	assignStudentsToClass,
	getClassCurriculum,
	listAvailableStudentsForClass,
	markClassChapterTaught
} from '../controller/teacher/classCurriculumController.js';
import {
	listTeacherFollowing,
	teacherAddProfileActivity,
	teacherFollowTeacher,
	teacherUnfollowTeacher
} from '../controller/social/followController.js';
import requirePermission from '../middleware/authorization/requirePermission.js';
const teacherRoutes = express.Router();

teacherRoutes.post('/login', loginTeacher);
teacherRoutes.post('/logout', asyncHandler(logoutTeacher));
teacherRoutes.get('/dashboard', authTeacher, asyncHandler(getTeacherDashboard));
teacherRoutes.get('/profile', authTeacher, asyncHandler(getTeacherProfile));
teacherRoutes.patch('/profile', authTeacher, upload.single('image'), asyncHandler(updateTeacherProfile));
teacherRoutes.patch('/profile/password', authTeacher, asyncHandler(updateTeacherPassword));
teacherRoutes.post('/test-series', authTeacher, asyncHandler(addTestSeries));
teacherRoutes.get('/test-series', authTeacher, asyncHandler(getAllTestSeriesForTeacher));
teacherRoutes.get('/students', authTeacher, asyncHandler(getStudentsForAttendance));
teacherRoutes.get('/students/list', authTeacher, asyncHandler(listStudentsByTeacher));
teacherRoutes.get('/students/performance/:studentId', authTeacher, asyncHandler(getStudentPerformanceByTeacher));
teacherRoutes.get('/classes/me', authTeacher, asyncHandler(getMyClasses));
teacherRoutes.get('/classes/:classId/curriculum', authTeacher, asyncHandler(getClassCurriculum));
teacherRoutes.post('/classes/:classId/subjects', authTeacher, asyncHandler(addClassSubject));
teacherRoutes.post('/classes/:classId/subjects/:subjectId/chapters', authTeacher, asyncHandler(addClassChapter));
teacherRoutes.patch('/classes/:classId/subjects/:subjectId/chapters/:chapterId/taught', authTeacher, asyncHandler(markClassChapterTaught));
teacherRoutes.get('/classes/:classId/students/available', authTeacher, asyncHandler(listAvailableStudentsForClass));
teacherRoutes.post('/classes/:classId/students/assign', authTeacher, asyncHandler(assignStudentsToClass));
teacherRoutes.post('/attendance/mark', authTeacher, asyncHandler(markStudentAttendance));
teacherRoutes.get('/attendance/student', authTeacher, asyncHandler(listStudentAttendanceByTeacher));
teacherRoutes.post('/attendance/teacher/self-mark', authTeacher, asyncHandler(markTeacherSelfAttendance));
teacherRoutes.get('/attendance/teacher', authTeacher, asyncHandler(getTeacherAttendance));
teacherRoutes.post('/daily-log', authTeacher, asyncHandler(upsertDailyTeachingLog));
teacherRoutes.get('/daily-log', authTeacher, asyncHandler(getDailyTeachingLogs));
teacherRoutes.post('/students/add', authTeacher, requirePermission('add_student'), asyncHandler(addStudentByTeacher));
teacherRoutes.post('/assignments', authTeacher, asyncHandler(createAssignment));
teacherRoutes.get('/assignments', authTeacher, asyncHandler(getTeacherAssignments));
teacherRoutes.patch('/assignments/:assignmentId', authTeacher, asyncHandler(updateTeacherAssignment));
teacherRoutes.post('/credentials/recover/teacher', asyncHandler(recoverTeacherCredentialsByEmail));
teacherRoutes.post('/credentials/recover/student', asyncHandler(recoverStudentCredentialsByEmail));
teacherRoutes.post('/follow/:teacherId', authTeacher, asyncHandler(teacherFollowTeacher));
teacherRoutes.delete('/follow/:teacherId', authTeacher, asyncHandler(teacherUnfollowTeacher));
teacherRoutes.get('/following', authTeacher, asyncHandler(listTeacherFollowing));
teacherRoutes.post('/profile/activity', authTeacher, asyncHandler(teacherAddProfileActivity));

export default teacherRoutes