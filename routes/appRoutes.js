import express from 'express'
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
appRoutes.get('/header',getHeader );
appRoutes.get('/member/certify/:type/:id',getCertificate)
appRoutes.post('/member/certify/download',DownloadCirtificate)
appRoutes.get('/events',getAllEvents)
appRoutes.get('/events/new',getNewEvents)
appRoutes.get('/events/past',getpastEvents)
appRoutes.post('/events/id',getEventById)
appRoutes.get('/announcement/new',getnewAnnouncement )
appRoutes.get('/announcement/past',getpastAnnouncement )
appRoutes.get('/announcement',getAllAnnouncement )
appRoutes.post('/announcement/id', getmyAnnouncement )
appRoutes.get('/testimorals', getTestmorals);
appRoutes.get('/member/all', memberList);
appRoutes.get('/co-curricular/list', listCocircularPublic);
appRoutes.get('/co-curricular/view/:id', getCocircularPublicById);
appRoutes.get('/collaborators/list', listCollaboratorsPublic);
appRoutes.get('/collaborators/view/:id', getCollaboratorPublicById);
appRoutes.post('/member/my', getMyMember);
appRoutes.get('/member/profile/:id', getMemberProfileDashboard);
appRoutes.post('/contact', contactcontroller);
appRoutes.get('/memories', getAllMemories);
appRoutes.get('/newspaper', getAllNews);
appRoutes.get('/gallery/:id', getGalleryById);
export default appRoutes