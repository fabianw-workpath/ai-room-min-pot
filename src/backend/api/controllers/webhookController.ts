import { Request, Response } from 'express';
import { redisClient, redisPubSub } from '../../config/redis';
import { io } from '../../server';

// Type definitions for webhook payload
interface Word {
  text: string;
  start_timestamp: { relative: number };
  end_timestamp: { relative: number } | null;
}

interface Participant {
  id: number;
  name: string | null;
  is_host: boolean;
  platform: string | null;
  extra_data: Record<string, any>;
}

interface TranscriptData {
  words: Word[];
  participant: Participant;
}

interface WebhookPayload {
  event: string;
  data: {
    data: TranscriptData;
    realtime_endpoint: {
      id: string;
      metadata: Record<string, any>;
    };
    transcript: {
      id: string;
      metadata: Record<string, any>;
    };
    recording: {
      id: string;
      metadata: Record<string, any>;
    };
    bot: {
      id: string;
      metadata: Record<string, any>;
    };
  };
}

// Webhook controller
const webhookController = {
  /**
   * Handle incoming webhook data from Recall.ai
   */
  handleWebhook: async (req: Request, res: Response) => {
    try {
      console.log('========== WEBHOOK REQUEST RECEIVED ==========');
      console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Request Body:', JSON.stringify(req.body, null, 2));
      
      const payload = req.body as WebhookPayload;
      
      // Log event type
      console.log('Webhook Event Type:', payload.event);
      
      // Check if this is a transcript event
      if (payload.event === 'transcript.data' || payload.event === 'transcript.partial_data') {
        console.log('Transcript Event Received:', payload.event);
        const { words } = payload.data.data;
        
        console.log('Words Count:', words ? words.length : 0);
        console.log('Words Data:', words ? JSON.stringify(words) : 'No words data');
        
        if (words && words.length > 0) {
          // Get the last word from the transcript
          const lastWord = words[words.length - 1].text;
          console.log('Last Word:', lastWord);
          
          // Get the bot ID to identify the meeting
          const botId = payload.data.bot.id;
          console.log('Bot ID:', botId);
          
          // Find the meeting by bot ID
          const meetingKeys = await redisClient.keys('meeting:*');
          console.log('Found Meeting Keys:', meetingKeys);
          let meetingId = null;
          
          for (const key of meetingKeys) {
            const recallBotId = await redisClient.hget(key, 'recallBotId');
            if (recallBotId === botId) {
              meetingId = key.split(':')[1];
              break;
            }
          }
          
          if (meetingId) {
            console.log('Found Meeting ID:', meetingId);
            
            // Update the last word in Redis
            await redisClient.hset(`meeting:${meetingId}`, 'lastWord', lastWord);
            console.log('Updated Redis with last word:', lastWord);
            
            // Publish the update to Redis pub/sub
            await redisPubSub.publish(
              `meeting:${meetingId}:updates`,
              JSON.stringify({ lastWord, timestamp: new Date().toISOString() })
            );
            
            // Emit the update to connected clients via Socket.io
            io.emit(`meeting:${meetingId}:word`, { lastWord });
            console.log('Emitted Socket.io event:', `meeting:${meetingId}:word`, { lastWord });
          } else {
            console.warn('No matching meeting found for bot ID:', botId);
          }
        }
      } else {
        console.log('Non-transcript event received:', payload.event);
      }
      
      // Always return a 200 OK to acknowledge receipt
      console.log('Returning 200 OK response');
      console.log('========== WEBHOOK REQUEST COMPLETED ==========');
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('========== WEBHOOK ERROR ==========');
      console.error('Error handling webhook:', error);
      console.error('Request Headers:', JSON.stringify(req.headers, null, 2));
      console.error('Request Body:', JSON.stringify(req.body, null, 2));
      // Still return 200 to prevent Recall.ai from retrying
      return res.status(200).json({ status: 'error', message: 'Error processing webhook' });
    }
  }
};

export default webhookController;
