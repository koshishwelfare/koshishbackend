import express from 'express'
import upload from '../middleware/cloudimage/multer.js';
import {
	getStudentProfile,
	loginStudent,
	logoutStudent,
	recoverStudentCredentialsByEmail,
	registerStudent,
	updateStudentProfile
} from '../controller/user/studentAuthController.js';
import {
	getStudentAnswers,
	getStudentAttendance,
	getStudentTestById,
	getTestLeaderboard,
	listStudentTests,
	submitStudentTest
} from '../controller/user/studentTestController.js';
import {
	getStudentDashboard,
	listStudentAssignments,
	markStudentSelfAttendance
} from '../controller/user/studentDashboardController.js';
import {
	listStudentFollowing,
	studentFollowTeacher,
	studentUnfollowTeacher
} from '../controller/social/followController.js';
import studentAuth from '../middleware/authentication/studentAuth.js';

const userRoutes = express.Router();

userRoutes.post('/student/register', registerStudent);
userRoutes.post('/student/login', loginStudent);
userRoutes.post('/student/recover-credentials', recoverStudentCredentialsByEmail);
userRoutes.post('/student/logout', logoutStudent);
userRoutes.get('/student/profile', studentAuth, getStudentProfile);
userRoutes.patch('/student/profile', studentAuth, upload.single('image'), updateStudentProfile);
userRoutes.get('/student/dashboard', studentAuth, getStudentDashboard);
userRoutes.get('/student/test-series', studentAuth, listStudentTests);
userRoutes.get('/student/test-series/:testId', studentAuth, getStudentTestById);
userRoutes.post('/student/test-series/:testId/submit', studentAuth, submitStudentTest);
userRoutes.get('/student/test-series/:testId/answers', studentAuth, getStudentAnswers);
userRoutes.get('/student/test-series/:testId/leaderboard', studentAuth, getTestLeaderboard);
userRoutes.get('/student/attendance', studentAuth, getStudentAttendance);
userRoutes.post('/student/attendance/self-mark', studentAuth, markStudentSelfAttendance);
userRoutes.get('/student/assignments', studentAuth, listStudentAssignments);
userRoutes.post('/student/follow/:teacherId', studentAuth, studentFollowTeacher);
userRoutes.delete('/student/follow/:teacherId', studentAuth, studentUnfollowTeacher);
userRoutes.get('/student/following', studentAuth, listStudentFollowing);

export default userRoutes