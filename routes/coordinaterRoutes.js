import express from 'express'
const coordinaterRoutes = express.Router();
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
coordinaterRoutes.post('/logout', logoutCoordinator);
// coordinaterRoutes.get('/auth', authCoodinater);
coordinaterRoutes.post('/change-cociculer', authCoodinater,upload.single('image'), changecocirculer);
coordinaterRoutes.get('/cocircular/list', authCoodinater, listCocircularUsers);
coordinaterRoutes.get('/cocircular/profile/:id', authCoodinater, getCocircularProfileByIdForCoordinator);
coordinaterRoutes.patch('/cocircular/activate/:id', authCoodinater, activateCocircularUser);
coordinaterRoutes.patch('/cocircular/deactivate/:id', authCoodinater, deactivateCocircularUser);
coordinaterRoutes.get('/members/list', authCoodinater, listMembersForCoordinator);
coordinaterRoutes.get('/teacher/profile/:id', authCoodinater, getTeacherProfileByIdForCoordinator);
coordinaterRoutes.get('/students/list', authCoodinater, listStudentsForCoordinator);
coordinaterRoutes.get('/sessions/list', authCoodinater, listSessionsForCoordinator);
coordinaterRoutes.get('/sessions/:sessionId/classes/list', authCoodinater, listSessionClassesForCoordinator);
coordinaterRoutes.get('/events/list', authCoodinater, listEventsForCoordinator);
coordinaterRoutes.get('/news/list', authCoodinater, listNewsForCoordinator);
coordinaterRoutes.get('/gallery/list', authCoodinater, listGalleryForCoordinator);
coordinaterRoutes.get('/student/profile/:id', authCoodinater, getStudentProfileByIdForCoordinator);
coordinaterRoutes.post('/onboard-cocircular', authCoodinater, requirePermission('add_cocircular'), onboardCocircular);
export default coordinaterRoutes