import { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../../config/redis';

// Meeting controller
const meetingController = {
  /**
   * Create a new meeting with Recall.ai
   */
  createMeeting: async (req: Request, res: Response) => {
    try {
      const { meetingUrl } = req.body;
      
      if (!meetingUrl) {
        return res.status(400).json({ error: 'Meeting URL is required' });
      }
      
      // Generate a unique meeting ID
      const meetingId = uuidv4();
      
      // Webhook URL for Recall.ai to send transcript data
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
      const webhookUrl = `${webhookBaseUrl}/api/webhook`;
      
      // Webhook URL for Recall.ai to send transcript data
      // This will be exposed via localtunnel
      
      // Prepare request data for Recall.ai API
      const requestData = {
        meeting_url: meetingUrl,
        recording_config: {
          transcript: {
            provider: {
              assembly_ai_v3_streaming: {}
            }
          },
          realtime_endpoints: [
            {
              type: 'webhook',
              url: webhookUrl,
              events: ['transcript.data', 'transcript.partial_data']
            }
          ]
        }
      };
      
      const headers = {
        'Authorization': `${process.env.RECALLAI_API_KEY}`,
        'accept': 'application/json',
        'content-type': 'application/json'
      };
      
      // Log the request details for debugging
      console.log('Recall.ai API Request:');
      console.log('URL:', 'https://us-west-2.recall.ai/api/v1/bot/');
      console.log('Headers:', JSON.stringify(headers));
      console.log('Request Data:', JSON.stringify(requestData));
      
      // Generate equivalent curl command for testing
      //     const curlCommand = `curl --request POST \
      // --url https://us-west-2.recall.ai/api/v1/bot/ \
      // --header "Authorization: ${process.env.RECALLAI_API_KEY}" \
      // --header "accept: application/json" \
      // --header "content-type: application/json" \
      // --data '${JSON.stringify(requestData, null, 2)}'`;
          
      //     console.log('Equivalent curl command:');
      //     console.log(curlCommand);
          
      // Call Recall.ai API to create a bot for the meeting
      const response = await axios.post(
        'https://us-west-2.recall.ai/api/v1/bot/',
        requestData,
        { headers }
      );

      // Log response for debugging
      console.log('Recall.ai API Response:');
      console.log('Status Code:', response.status);
      console.log('Headers:', JSON.stringify(response.headers));
      console.log('Data:', JSON.stringify(response.data));
      
      // Store meeting data in Redis
      await redisClient.hset(
        `meeting:${meetingId}`,
        'meetingUrl', meetingUrl,
        'recallBotId', response.data.id,
        'createdAt', new Date().toISOString(),
        'lastWord', '',
        'status', 'active'
      );
      
      return res.status(201).json({
        meetingId,
        recallBotId: response.data.id,
        status: 'active'
      });
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      
      // Log more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        return res.status(500).json({ 
          error: 'Failed to create meeting', 
          details: `API responded with status ${error.response.status}`,
          message: error.message
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        return res.status(500).json({ 
          error: 'Failed to create meeting', 
          details: 'No response received from API',
          message: error.message
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        return res.status(500).json({ 
          error: 'Failed to create meeting', 
          details: 'Error setting up API request',
          message: error.message
        });
      }
    }
  },
  
  /**
   * Get meeting details by ID
   */
  getMeeting: async (req: Request, res: Response) => {
    try {
      const { meetingId } = req.params;
      
      // Get meeting data from Redis
      const meetingData = await redisClient.hgetall(`meeting:${meetingId}`);
      
      if (!meetingData || Object.keys(meetingData).length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      return res.status(200).json({
        meetingId,
        meetingUrl: meetingData.meetingUrl,
        recallBotId: meetingData.recallBotId,
        createdAt: meetingData.createdAt,
        lastWord: meetingData.lastWord,
        status: meetingData.status
      });
    } catch (error: any) {
      console.error('Error getting meeting:', error);
      return res.status(500).json({ error: 'Failed to get meeting' });
    }
  }
};

export default meetingController;
