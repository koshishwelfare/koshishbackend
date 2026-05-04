import express from 'express'
import asyncHandler from 'express-async-handler'
import getHeader from '../controller/app/getHeader.js';
import {getEventById,getAllEvents,getNewEvents,getpastEvents} from '../controller/app/getevents.js';
import {getAllAnnouncement,getnewAnnouncement,getpastAnnouncement,getmyAnnouncement} from '../controller/app/getAnnouncement.js';
import getTestmorals from '../controller/app/getTestmorals.js';
import { memberList } from '../controller/app/mentor.js';
import { listCocircularPublic, getCocircularPublicById } from '../controller/app/cocircular.js';
import { listCollaboratorsPublic, getCollaboratorPublicById } from '../controller/app/collaborator.js';
import contactcontroller from '../controller/app/contactcontroller.js';
import getMyMember from '../controller/app/getmyMentor.js';
import { getMemberProfileDashboard } from '../controller/app/memberProfileDashboard.js';
import {getAllMemories,getAllNews,getGalleryById} from '../controller/app/gallery.js'
import {getCertificate, DownloadCirtificate} from '../controller/app/getCertificate.js';
const appRoutes = express.Router();
appRoutes.get('/header', asyncHandler(getHeader));
appRoutes.get('/member/certify/:type/:id', asyncHandler(getCertificate))
appRoutes.post('/member/certify/download', asyncHandler(DownloadCirtificate))
appRoutes.get('/events', asyncHandler(getAllEvents))
appRoutes.get('/events/new', asyncHandler(getNewEvents))
appRoutes.get('/events/past', asyncHandler(getpastEvents))
appRoutes.post('/events/id', asyncHandler(getEventById))
appRoutes.get('/announcement/new', asyncHandler(getnewAnnouncement))
appRoutes.get('/announcement/past', asyncHandler(getpastAnnouncement))
appRoutes.get('/announcement', asyncHandler(getAllAnnouncement))
appRoutes.post('/announcement/id', asyncHandler(getmyAnnouncement))
appRoutes.get('/testimorals', asyncHandler(getTestmorals));
appRoutes.get('/member/all', asyncHandler(memberList));
appRoutes.get('/co-curricular/list', asyncHandler(listCocircularPublic));
appRoutes.get('/co-curricular/view/:id', asyncHandler(getCocircularPublicById));
appRoutes.get('/collaborators/list', asyncHandler(listCollaboratorsPublic));
appRoutes.get('/collaborators/view/:id', asyncHandler(getCollaboratorPublicById));
appRoutes.post('/member/my', asyncHandler(getMyMember));
appRoutes.get('/member/profile/:id', asyncHandler(getMemberProfileDashboard));
appRoutes.post('/contact', asyncHandler(contactcontroller));
appRoutes.get('/memories', asyncHandler(getAllMemories));
appRoutes.get('/newspaper', asyncHandler(getAllNews));
appRoutes.get('/gallery/:id', asyncHandler(getGalleryById));
export default appRoutes