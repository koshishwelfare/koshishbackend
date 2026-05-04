import express from 'express'
import asyncHandler from 'express-async-handler'
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

userRoutes.post('/student/register', asyncHandler(registerStudent));
userRoutes.post('/student/login', asyncHandler(loginStudent));
userRoutes.post('/student/recover-credentials', asyncHandler(recoverStudentCredentialsByEmail));
userRoutes.post('/student/logout', asyncHandler(logoutStudent));
userRoutes.get('/student/profile', studentAuth, asyncHandler(getStudentProfile));
userRoutes.patch('/student/profile', studentAuth, upload.single('image'), asyncHandler(updateStudentProfile));
userRoutes.get('/student/dashboard', studentAuth, asyncHandler(getStudentDashboard));
userRoutes.get('/student/test-series', studentAuth, asyncHandler(listStudentTests));
userRoutes.get('/student/test-series/:testId', studentAuth, asyncHandler(getStudentTestById));
userRoutes.post('/student/test-series/:testId/submit', studentAuth, asyncHandler(submitStudentTest));
userRoutes.get('/student/test-series/:testId/answers', studentAuth, asyncHandler(getStudentAnswers));
userRoutes.get('/student/test-series/:testId/leaderboard', studentAuth, asyncHandler(getTestLeaderboard));
userRoutes.get('/student/attendance', studentAuth, asyncHandler(getStudentAttendance));
userRoutes.post('/student/attendance/self-mark', studentAuth, asyncHandler(markStudentSelfAttendance));
userRoutes.get('/student/assignments', studentAuth, asyncHandler(listStudentAssignments));
userRoutes.post('/student/follow/:teacherId', studentAuth, asyncHandler(studentFollowTeacher));
userRoutes.delete('/student/follow/:teacherId', studentAuth, asyncHandler(studentUnfollowTeacher));
userRoutes.get('/student/following', studentAuth, asyncHandler(listStudentFollowing));

export default userRoutes