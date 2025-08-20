import { Request, Response } from 'express';
import { redisClient, redisPubSub } from '../../config/redis';
import { io } from '../../server';
import { analyzeTranscript } from '../../services/openaiService';
import { FacilitationConfig, TranscriptSegment } from '../../types/facilitation';

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
          
          // Reconstruct the full sentence from words
          const sentence = words.map(word => word.text).join(' ');
          console.log('Full Sentence:', sentence);
          
          // Get the bot ID to identify the meeting
          const botId = payload.data.bot.id;
          console.log('Bot ID:', botId);
          
          // Find the meeting by bot ID
          const meetingKeys = await redisClient.keys('meeting:*');
          console.log('Found Meeting Keys:', meetingKeys);
          let meetingId = null;
          
          for (const key of meetingKeys) {
            // Skip transcript keys which are lists, not hashes
            if (key.includes(':transcript')) continue;
            
            try {
              const recallBotId = await redisClient.hget(key, 'recallBotId');
              if (recallBotId === botId) {
                meetingId = key.split(':')[1];
                break;
              }
            } catch (keyError: any) {
              console.warn(`Error accessing key ${key}:`, keyError.message);
              // Continue to next key if there's an error with this one
              continue;
            }
          }
          
          if (meetingId) {
            console.log('Found Meeting ID:', meetingId);
            
            // Update the last word in Redis
            await redisClient.hset(`meeting:${meetingId}`, 'lastWord', lastWord);
            console.log('Updated Redis with last word:', lastWord);
            
            // Store the sentence in the transcript list
            const timestamp = Date.now();
            const transcriptSegment: TranscriptSegment = {
              text: sentence,
              timestamp,
              speaker: payload.data.data.participant?.name || 'Unknown'
            };
            
            // Add to transcript list in Redis (keep only last 10 segments for simplicity)
            await redisClient.lpush(`meeting:${meetingId}:transcript`, JSON.stringify(transcriptSegment));
            await redisClient.ltrim(`meeting:${meetingId}:transcript`, 0, 9);
            console.log('Added sentence to transcript history');
            
            // Immediately publish the update to Redis pub/sub and emit to clients
            await redisPubSub.publish(
              `meeting:${meetingId}:updates`,
              JSON.stringify({ lastWord, timestamp: new Date().toISOString() })
            );
            
            // Get the current facilitation config
            const facilitationConfigStr = await redisClient.hget(`meeting:${meetingId}`, 'facilitationConfig');
            const facilitationConfig = facilitationConfigStr ? JSON.parse(facilitationConfigStr) : null;
            
            // Immediately emit the transcript update to connected clients via Socket.io
            io.emit(`meeting:${meetingId}:update`, { 
              lastWord,
              currentSentence: sentence,
              facilitationConfig
            });
            console.log('Immediately emitted transcript update');
            
            // Now start the LLM analysis in the background (non-blocking)
            // Get meeting target from Redis
            const meetingTarget = await redisClient.hget(`meeting:${meetingId}`, 'meetingTarget') || 'Talk only about apples';
            
            // Get last 2 transcript segments for analysis
            const transcriptHistory = await redisClient.lrange(`meeting:${meetingId}:transcript`, 0, 1);
            const transcriptSegments = transcriptHistory.map(item => JSON.parse(item));
            
            // Run analysis in the background
            (async () => {
              try {
                // Analyze transcript with OpenAI
                console.log('Analyzing transcript with OpenAI in background...');
                const analysis = await analyzeTranscript({
                  meetingTarget,
                  transcript: transcriptSegments
                });
                
                // Update facilitation config in Redis
                const facilitationConfigData: FacilitationConfig = {
                  meetingTarget,
                  targetState: transcriptSegments.length < 1 ? 'neutral' : (analysis.isOnTopic ? 'on_topic' : 'off_topic'),
                  facilitationFeedback: analysis.feedback
                };
                
                await redisClient.hset(
                  `meeting:${meetingId}`, 
                  'facilitationConfig', 
                  JSON.stringify(facilitationConfigData)
                );
                
                console.log('Updated facilitation config:', facilitationConfigData);
                
                // Emit the facilitation update to connected clients
                io.emit(`meeting:${meetingId}:facilitation`, { facilitationConfig: facilitationConfigData });
                console.log('Emitted facilitation update');
              } catch (analysisError) {
                console.error('Error analyzing transcript:', analysisError);
              }
            })();
            console.log('Emitted Socket.io event:', `meeting:${meetingId}:update`);
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
