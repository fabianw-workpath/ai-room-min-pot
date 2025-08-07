import OpenAI from 'openai';
import { TranscriptAnalysisRequest, TranscriptAnalysisResponse } from '../types/facilitation';
import dotenv from 'dotenv';
import axios from 'axios';

// Rate limiting variables
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 1000; // 1 second minimum between API calls

dotenv.config();

// Log OpenAI configuration
console.log('OpenAI Configuration:');
console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('API URL:', process.env.OPENAI_API_URL || 'Using default OpenAI URL');

// Check if we're using Azure OpenAI
const isAzure = process.env.OPENAI_API_URL?.includes('azure');
console.log('Using Azure OpenAI:', isAzure);

// Initialize OpenAI client (only used for non-Azure)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL
});

/**
 * Analyzes transcript segments to determine if they're on topic and provides ✅
 */
export async function analyzeTranscript(request: TranscriptAnalysisRequest): Promise<TranscriptAnalysisResponse> {
  console.log('Starting transcript analysis with OpenAI...');
  console.log('Meeting target:', request.meetingTarget);
  console.log('Transcript segments:', request.transcript.length);
  
  try {
    // Extract the last 1-2 sentences from the transcript
    const recentTranscript = request.transcript
      .slice(-2)
      .map(segment => segment.text)
      .join(' ');

    // Create the prompt for OpenAI
    const prompt = `
Meeting Target: "${request.meetingTarget}"

Recent transcript: "${recentTranscript}"

Based on the meeting target and the recent transcript, please analyze:
1. Are the participants talking about the meeting target? (true/false)
2. What feedback would you give the particpants to help them stay on topic? (5 words max)

Respond in JSON format:
{
  "isOnTopic": boolean,
  "feedback": "your facilitation feedback here (5 words max)"
}
`;

    // Call OpenAI API
    console.log('Sending request to OpenAI...');
    
    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
      const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
      console.log(`Rate limiting: Waiting ${waitTime}ms before making API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Update last API call time
    lastApiCallTime = Date.now();
    
    // Start timing the API call
    const startTime = Date.now();
    
    let content = '';

    if (isAzure) {
      // Use axios for Azure OpenAI
      try {
        console.log('Using Azure OpenAI API');
        // Use the full URL directly
        const url = process.env.OPENAI_API_URL || '';

        console.log('Azure OpenAI URL:', url);

        const response = await axios.post(url, {
          messages: [
            { role: "system", content: "You are a meeting facilitator assistant that helps keep meetings on topic." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.OPENAI_API_KEY || ''
          }
        });

        const responseTime = Date.now() - startTime;
        console.log(`Azure OpenAI response status: ${response.status} (${responseTime}ms)`);
        content = response.data.choices[0]?.message?.content || '';
        console.log(`OpenAI Response (${responseTime}ms):`, content);
      } catch (azureError: any) {
        console.error('Azure OpenAI API Error:', azureError.message);
        if (azureError.response) {
          console.error('Azure Error Status:', azureError.response.status);
          console.error('Azure Error Data:', azureError.response.data);
        }
        throw azureError; // Re-throw to be caught by the outer try-catch
      }
    } else {
      // Use OpenAI SDK for regular OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a meeting facilitator assistant that helps keep meetings on topic." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      });
      
      content = response.choices[0]?.message?.content || '';
      const responseTime = Date.now() - startTime;
      console.log(`OpenAI Response (${responseTime}ms):`, content);
    }
    
    try {
      // Try to parse as JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        return {
          isOnTopic: jsonResponse.isOnTopic,
          feedback: jsonResponse.feedback
        };
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
    }

    // Fallback if JSON parsing fails
    return {
      isOnTopic: content.toLowerCase().includes('true'),
      feedback: content.includes('feedback') 
        ? content.split('feedback:')[1]?.trim() || 'Keep the discussion focused on the meeting target.'
        : 'Keep the discussion focused on the meeting target.'
    };
    
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('OpenAI API Error Status:', error.response.status);
      console.error('OpenAI API Error Data:', error.response.data);
    }
    return {
      isOnTopic: false,
      feedback: 'Unable to analyze transcript at this time.'
    };
  }
}
