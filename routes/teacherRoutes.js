import express from 'express'
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
teacherRoutes.post('/logout', logoutTeacher);
teacherRoutes.get('/dashboard', authTeacher, getTeacherDashboard);
teacherRoutes.get('/profile', authTeacher, getTeacherProfile);
teacherRoutes.patch('/profile', authTeacher, upload.single('image'), updateTeacherProfile);
teacherRoutes.patch('/profile/password', authTeacher, updateTeacherPassword);
teacherRoutes.post('/test-series', authTeacher, addTestSeries);
teacherRoutes.get('/test-series', authTeacher, getAllTestSeriesForTeacher);
teacherRoutes.get('/students', authTeacher, getStudentsForAttendance);
teacherRoutes.get('/students/list', authTeacher, listStudentsByTeacher);
teacherRoutes.get('/students/performance/:studentId', authTeacher, getStudentPerformanceByTeacher);
teacherRoutes.get('/classes/me', authTeacher, getMyClasses);
teacherRoutes.get('/classes/:classId/curriculum', authTeacher, getClassCurriculum);
teacherRoutes.post('/classes/:classId/subjects', authTeacher, addClassSubject);
teacherRoutes.post('/classes/:classId/subjects/:subjectId/chapters', authTeacher, addClassChapter);
teacherRoutes.patch('/classes/:classId/subjects/:subjectId/chapters/:chapterId/taught', authTeacher, markClassChapterTaught);
teacherRoutes.get('/classes/:classId/students/available', authTeacher, listAvailableStudentsForClass);
teacherRoutes.post('/classes/:classId/students/assign', authTeacher, assignStudentsToClass);
teacherRoutes.post('/attendance/mark', authTeacher, markStudentAttendance);
teacherRoutes.get('/attendance/student', authTeacher, listStudentAttendanceByTeacher);
teacherRoutes.post('/attendance/teacher/self-mark', authTeacher, markTeacherSelfAttendance);
teacherRoutes.get('/attendance/teacher', authTeacher, getTeacherAttendance);
teacherRoutes.post('/daily-log', authTeacher, upsertDailyTeachingLog);
teacherRoutes.get('/daily-log', authTeacher, getDailyTeachingLogs);
teacherRoutes.post('/students/add', authTeacher, requirePermission('add_student'), addStudentByTeacher);
teacherRoutes.post('/assignments', authTeacher, createAssignment);
teacherRoutes.get('/assignments', authTeacher, getTeacherAssignments);
teacherRoutes.patch('/assignments/:assignmentId', authTeacher, updateTeacherAssignment);
teacherRoutes.post('/credentials/recover/teacher', recoverTeacherCredentialsByEmail);
teacherRoutes.post('/credentials/recover/student', recoverStudentCredentialsByEmail);
teacherRoutes.post('/follow/:teacherId', authTeacher, teacherFollowTeacher);
teacherRoutes.delete('/follow/:teacherId', authTeacher, teacherUnfollowTeacher);
teacherRoutes.get('/following', authTeacher, listTeacherFollowing);
teacherRoutes.post('/profile/activity', authTeacher, teacherAddProfileActivity);

export default teacherRoutes