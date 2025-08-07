import express from 'express';
import meetingController from './controllers/meetingController';
import webhookController from './controllers/webhookController';

const router = express.Router();

// Meeting routes
router.post('/meetings', meetingController.createMeeting);
router.get('/meetings/:meetingId', meetingController.getMeeting);

// Webhook routes
router.post('/webhook', webhookController.handleWebhook);

export default router;
