import express from 'express';
import { register, login,createClient,createDietPlan,createProgramPlan,getTrainerDietPlans,
    getTrainerProgramPlans,
    getTrainerClients,getClientOverview,
    updateClientProfile,
    getTrainer,
    logout,
    forgetPassword,
    resetPassword,
    approveMeetingRequest,
    createMeetingRequest,
    home,
    getUpcomingMeetings,
    getTotalClients,
    getinfo,
    getTrainerMeetings,
    updateActivePlan,
    updateActiveNutrition,
    rescheduleMeetingRequest,
    cancelMeeting,
    notification,
    searchAPI
//   markNotificationRead,
//   markAllNotificationsRead
} from '../Controllers/TrainerAuth.js';
import authMiddleware from '../Middlewares/authMiddleware.js';
import upload from '../Middlewares/images.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/createClient',authMiddleware, upload.single('profilePic'), createClient);
router.post('/createDietPlan', authMiddleware,createDietPlan);
router.post('/createProgramPlan',authMiddleware, createProgramPlan);
router.get('/getTrainerDietPlans',authMiddleware, getTrainerDietPlans);
router.get('/getTrainerProgramPlans',authMiddleware, getTrainerProgramPlans);
router.get('/getTrainerClients',authMiddleware, getTrainerClients);
router.get('/getClientOverview/:id',authMiddleware, getClientOverview);
router.put('/updateClientProfile',authMiddleware, updateClientProfile);
router.get('/getTrainer',authMiddleware, getTrainer);
router.get('/logout',authMiddleware, logout);
router.post('/forgetPassword', forgetPassword);
router.post('/resetPassword', resetPassword);
router.post('/approveMeetingRequest',authMiddleware, approveMeetingRequest);
router.post('/createMeetingRequest',authMiddleware, createMeetingRequest);
router.get('/home',authMiddleware, home);
router.get('/getUpcomingMeetings/:trainerId',authMiddleware, getUpcomingMeetings);
router.get('/getTotalClients/:trainerId',authMiddleware, getTotalClients);
router.get('/getinfo/:trainerId',authMiddleware, getinfo);
router.get('/getTrainerMeetings',authMiddleware, getTrainerMeetings);
router.put('/updateActivePlan/:clientId',authMiddleware, updateActivePlan)
router.put('/updateActiveNutrition/:clientId',authMiddleware, updateActiveNutrition)
router.put('/rescheduleMeetingRequest',authMiddleware, rescheduleMeetingRequest)
router.post('/cancelMeeting', authMiddleware, cancelMeeting);
router.get('/notification', authMiddleware, notification);
router.get('/search', authMiddleware, searchAPI);
// router.post('/markNotificationRead', authMiddleware, markNotificationRead);
// router.post('/markAllNotificationsRead', authMiddleware, markAllNotificationsRead);
export default router;
