import express from 'express'
const coordinaterRoutes = express.Router();
import asyncHandler from 'express-async-handler'
import loginCoordinater from '../middleware/authentication/coordinatorLogin.js';
import authCoodinater from '../middleware/authentication/coordinaterAuth.js';
import changecocirculer, {
	listCocircularUsers,
	activateCocircularUser,
	deactivateCocircularUser
} from '../controller/coordinator/cocicular.js';
import { logoutCoordinator } from '../controller/auth/logoutController.js';
import upload from '../middleware/cloudimage/multer.js'
import { onboardCocircular } from '../controller/coordinator/onboardingController.js';
import requirePermission from '../middleware/authorization/requirePermission.js';
import {
	listMembersForCoordinator,
	listStudentsForCoordinator,
	listSessionsForCoordinator,
	listSessionClassesForCoordinator,
	listEventsForCoordinator,
	listNewsForCoordinator,
	listGalleryForCoordinator,
	getCocircularProfileByIdForCoordinator,
	getTeacherProfileByIdForCoordinator,
	getStudentProfileByIdForCoordinator
} from '../controller/coordinator/userDirectoryController.js';
coordinaterRoutes.post('/login', loginCoordinater);
coordinaterRoutes.post('/logout', asyncHandler(logoutCoordinator));
// coordinaterRoutes.get('/auth', authCoodinater);
coordinaterRoutes.post('/change-cociculer', authCoodinater, upload.single('image'), asyncHandler(changecocirculer));
coordinaterRoutes.get('/cocircular/list', authCoodinater, asyncHandler(listCocircularUsers));
coordinaterRoutes.get('/cocircular/profile/:id', authCoodinater, asyncHandler(getCocircularProfileByIdForCoordinator));
coordinaterRoutes.patch('/cocircular/activate/:id', authCoodinater, asyncHandler(activateCocircularUser));
coordinaterRoutes.patch('/cocircular/deactivate/:id', authCoodinater, asyncHandler(deactivateCocircularUser));
coordinaterRoutes.get('/members/list', authCoodinater, asyncHandler(listMembersForCoordinator));
coordinaterRoutes.get('/teacher/profile/:id', authCoodinater, asyncHandler(getTeacherProfileByIdForCoordinator));
coordinaterRoutes.get('/students/list', authCoodinater, asyncHandler(listStudentsForCoordinator));
coordinaterRoutes.get('/sessions/list', authCoodinater, asyncHandler(listSessionsForCoordinator));
coordinaterRoutes.get('/sessions/:sessionId/classes/list', authCoodinater, asyncHandler(listSessionClassesForCoordinator));
coordinaterRoutes.get('/events/list', authCoodinater, asyncHandler(listEventsForCoordinator));
coordinaterRoutes.get('/news/list', authCoodinater, asyncHandler(listNewsForCoordinator));
coordinaterRoutes.get('/gallery/list', authCoodinater, asyncHandler(listGalleryForCoordinator));
coordinaterRoutes.get('/student/profile/:id', authCoodinater, asyncHandler(getStudentProfileByIdForCoordinator));
coordinaterRoutes.post('/onboard-cocircular', authCoodinater, requirePermission('add_cocircular'), asyncHandler(onboardCocircular));
export default coordinaterRoutes