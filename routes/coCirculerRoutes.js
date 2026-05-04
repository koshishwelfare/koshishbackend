import express from 'express'
import asyncHandler from 'express-async-handler'
import authCociculer from '../middleware/authentication/cocirculerAuth.js';
import loginCociculer from '../middleware/authentication/logincocerculer.js';
import updatecocerculerprofile from '../controller/cocirculer/cocerculer.js';
import{ addMentor,CertifyMember, terminateMentor, AllMentor,getMentorById, updateMentorById,TopMentor, updateMemberRoleById} from '../controller/cocirculer/mentor.js';
import { addHeader,updateHeader,AllHeader,HeaderChange,HeaderById } from '../controller/cocirculer/manageHeader.js';
import { Addevent,updateEvent,hideEvent,EventById,topEvent,AllEvents,deleteById } from '../controller/cocirculer/event.js';
import { addtestimorals,updatetestimorals,Alltestimorals,testimoralsById,TerminateTestimorals } from '../controller/cocirculer/testimorals.js';
import getcontact from '../controller/cocirculer/getcontact.js';
import upload from '../middleware/cloudimage/multer.js'
import {CreateAnnouncement,UpdateAnnouncement,hideAnnouncement,getNewsAll,getNewsById } from '../controller/cocirculer/announcement.js';
import {UpdateGallery,DeleteGallery ,AddGallery,getAllGallery,getGalleryById} from '../controller/cocirculer/gallery.js'
import {
	addAcademicSession,
	getAcademicSessions,
	getAcademicSessionById,
	updateAcademicSession,
	listAcademicSessionHolidays,
	addAcademicSessionHoliday,
	updateAcademicSessionHoliday,
	deleteAcademicSessionHoliday,
	getMentorsForClass,
	createClass,
	getClasses,
	getClassById,
	updateClass
} from '../controller/cocirculer/academicController.js';
import {
	listCocircularForConsole,
	getCocircularForConsoleById,
	createCocircularForConsole,
	updateCocircularForConsole,
	deleteCocircularForConsole
} from '../controller/cocirculer/cocircularDirectory.js';
import {
  listCollaboratorsForConsole,
  getCollaboratorForConsoleById,
  createCollaboratorForConsole,
  updateCollaboratorForConsole
} from '../controller/cocirculer/collaboratorDirectory.js';
import { getOwnProfile, updateOwnProfile } from '../controller/cocirculer/profileManagementController.js';
import getCocirculerDashboard from '../controller/cocirculer/dashboard.js';
import { logoutCocirculer } from '../controller/auth/logoutController.js';
import { getTeacherAttendanceByDailyToken, getTeacherAttendanceDailyQr } from '../controller/cocirculer/teacherAttendanceQrController.js';
import { recoverCocirculerCredentialsByEmail } from '../controller/cocirculer/authRecoveryController.js';
const coCirculerRoutes = express.Router();
coCirculerRoutes.post('/login', loginCociculer);
coCirculerRoutes.post('/credentials/recover', asyncHandler(recoverCocirculerCredentialsByEmail));
coCirculerRoutes.post('/logout', asyncHandler(logoutCocirculer));

// coCirculerRoutes.get('/auth', authCociculer);
coCirculerRoutes.patch('/update/cocirculer-profile', authCociculer, asyncHandler(updatecocerculerprofile));
// Member
coCirculerRoutes.post('/member/add', authCociculer, upload.single('image'), asyncHandler(addMentor))
coCirculerRoutes.get('/member/u/:id', authCociculer, asyncHandler(getMentorById))
coCirculerRoutes.patch('/member/update/:id', authCociculer, upload.single('image'), asyncHandler(updateMentorById))
coCirculerRoutes.patch('/member/role/:id', authCociculer, asyncHandler(updateMemberRoleById))
coCirculerRoutes.patch('/member/terminate/:id', authCociculer, asyncHandler(terminateMentor))
coCirculerRoutes.patch('/member/top/:id', authCociculer, asyncHandler(TopMentor))
coCirculerRoutes.get('/member/all', authCociculer, asyncHandler(AllMentor))
coCirculerRoutes.get('/member/certificate/:id', authCociculer, asyncHandler(AllMentor))
coCirculerRoutes.get('/cocircular/list', authCociculer, asyncHandler(listCocircularForConsole))
coCirculerRoutes.get('/cocircular/view/:id', authCociculer, asyncHandler(getCocircularForConsoleById))
coCirculerRoutes.post('/cocircular/add', authCociculer, upload.single('image'), asyncHandler(createCocircularForConsole))
coCirculerRoutes.patch('/cocircular/update/:id', authCociculer, upload.single('image'), asyncHandler(updateCocircularForConsole))
coCirculerRoutes.delete('/cocircular/delete/:id', authCociculer, asyncHandler(deleteCocircularForConsole))
coCirculerRoutes.get('/collaborators/list', authCociculer, asyncHandler(listCollaboratorsForConsole))
coCirculerRoutes.get('/collaborators/view/:id', authCociculer, asyncHandler(getCollaboratorForConsoleById))
coCirculerRoutes.post('/collaborators/add', authCociculer, upload.single('image'), asyncHandler(createCollaboratorForConsole))
coCirculerRoutes.patch('/collaborators/update/:id', authCociculer, upload.single('image'), asyncHandler(updateCollaboratorForConsole))


// event
coCirculerRoutes.post('/event/add', authCociculer, upload.single('image'), asyncHandler(Addevent))
coCirculerRoutes.patch('/event/update/:id', authCociculer, upload.single('image'), asyncHandler(updateEvent))
coCirculerRoutes.put('/event/hide/:id', authCociculer, asyncHandler(hideEvent))
coCirculerRoutes.put('/event/top/:id', authCociculer, asyncHandler(topEvent))
coCirculerRoutes.delete('/event/delete/:id', authCociculer, asyncHandler(deleteById))
coCirculerRoutes.get('/events/all', authCociculer, asyncHandler(AllEvents))
coCirculerRoutes.get('/event/view/:id', authCociculer, asyncHandler(EventById))
// contact
coCirculerRoutes.get('/contact/all', authCociculer, asyncHandler(getcontact))
// header
coCirculerRoutes.post('/header/add', authCociculer, upload.single('image'), asyncHandler(addHeader))
coCirculerRoutes.patch('/header/update/:id', authCociculer, upload.single('image'), asyncHandler(updateHeader))
coCirculerRoutes.get('/header/all', authCociculer, asyncHandler(AllHeader));
coCirculerRoutes.get('/header/view/:id', authCociculer, asyncHandler(HeaderById));
coCirculerRoutes.patch('/header/hide/:id', authCociculer, asyncHandler(HeaderChange));
// announcement
coCirculerRoutes.get('/announcement', authCociculer, asyncHandler(getNewsAll))
coCirculerRoutes.post('/announcement/add', authCociculer, upload.single('image'), asyncHandler(CreateAnnouncement))
coCirculerRoutes.patch('/announcement/update/:id', authCociculer, upload.single('image'), asyncHandler(UpdateAnnouncement))
coCirculerRoutes.patch('/announcement/hide/:id', authCociculer, asyncHandler(hideAnnouncement))
coCirculerRoutes.get('/announcement/view/:id', authCociculer, asyncHandler(getNewsById))
// testimonial
coCirculerRoutes.post('/testimorals/add', authCociculer, upload.single('image'), asyncHandler(addtestimorals))
coCirculerRoutes.patch('/testimorals/update/:id', authCociculer, upload.single('image'), asyncHandler(updatetestimorals))
coCirculerRoutes.get('/testimorals/view/:id', authCociculer, asyncHandler(testimoralsById))
coCirculerRoutes.patch('/testimorals/change/:id', authCociculer, asyncHandler(TerminateTestimorals))
coCirculerRoutes.get('/testimorals', authCociculer, asyncHandler(Alltestimorals));
// Gallery
coCirculerRoutes.get('/gallery', authCociculer, asyncHandler(getAllGallery));
coCirculerRoutes.post('/gallery/add', authCociculer, upload.any(), asyncHandler(AddGallery));
coCirculerRoutes.get('/gallery/:id', authCociculer, asyncHandler(getGalleryById));
coCirculerRoutes.patch('/gallery/update/:id', authCociculer, upload.any(), asyncHandler(UpdateGallery));
coCirculerRoutes.delete('/gallery/delete/:id', authCociculer, asyncHandler(DeleteGallery));

// Academic management
coCirculerRoutes.get('/dashboard', authCociculer, asyncHandler(getCocirculerDashboard));
coCirculerRoutes.get('/attendance/teacher-qr', authCociculer, asyncHandler(getTeacherAttendanceDailyQr));
coCirculerRoutes.get('/attendance/teacher-daily', authCociculer, asyncHandler(getTeacherAttendanceByDailyToken));
coCirculerRoutes.post('/academic/session/add', authCociculer, asyncHandler(addAcademicSession));
coCirculerRoutes.get('/academic/sessions', authCociculer, asyncHandler(getAcademicSessions));
coCirculerRoutes.get('/academic/session/:id', authCociculer, asyncHandler(getAcademicSessionById));
coCirculerRoutes.patch('/academic/session/update/:id', authCociculer, asyncHandler(updateAcademicSession));
coCirculerRoutes.get('/academic/holidays', authCociculer, asyncHandler(listAcademicSessionHolidays));
coCirculerRoutes.post('/academic/session/:sessionId/holidays/add', authCociculer, asyncHandler(addAcademicSessionHoliday));
coCirculerRoutes.patch('/academic/session/:sessionId/holidays/update/:holidayId', authCociculer, asyncHandler(updateAcademicSessionHoliday));
coCirculerRoutes.delete('/academic/session/:sessionId/holidays/delete/:holidayId', authCociculer, asyncHandler(deleteAcademicSessionHoliday));
coCirculerRoutes.get('/academic/mentors', authCociculer, asyncHandler(getMentorsForClass));
coCirculerRoutes.post('/academic/class/add', authCociculer, asyncHandler(createClass));
coCirculerRoutes.get('/academic/classes', authCociculer, asyncHandler(getClasses));
coCirculerRoutes.get('/academic/class/:id', authCociculer, asyncHandler(getClassById));
coCirculerRoutes.patch('/academic/class/update/:id', authCociculer, asyncHandler(updateClass));

// Profile management
coCirculerRoutes.get('/profile-management', authCociculer, asyncHandler(getOwnProfile));
coCirculerRoutes.patch('/profile-management', authCociculer, upload.single('image'), asyncHandler(updateOwnProfile));

export default coCirculerRoutes