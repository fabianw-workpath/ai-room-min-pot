import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Define types
interface MeetingResponse {
  meetingId: string;
  recallBotId: string;
  status: string;
}

interface WordUpdate {
  lastWord: string;
}

export default function Home() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [lastWord, setLastWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize socket connection
  useEffect(() => {
    const socket = io('http://localhost:3000');
    
    // Listen for word updates
    socket.on('connect', () => {
      console.log('Socket connected');
      
      if (meetingId) {
        socket.on(`meeting:${meetingId}:word`, (data: WordUpdate) => {
          setLastWord(data.lastWord);
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [meetingId]);

  // Handle meeting creation
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meetingUrl) {
      setError('Please enter a meeting URL');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Call the backend API to create meeting

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create meeting');
      }

      const data = await response.json();
      setMeetingId(data.meetingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Meeting Transcript App</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <form onSubmit={handleCreateMeeting}>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="meeting-url" style={{ display: 'block', marginBottom: '5px' }}>
              Meeting URL
            </label>
            <input
              id="meeting-url"
              type="text"
              placeholder="https://zoom.us/j/123456789"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              disabled={isLoading || !!meetingId}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          
          {!meetingId && (
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              {isLoading ? 'Creating...' : 'Create Meeting'}
            </button>
          )}
          
          {error && (
            <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
          )}
        </form>
      </div>
      
      {meetingId && (
        <div style={{ border: '1px solid #eaeaea', borderRadius: '8px', padding: '20px' }}>
          <h2>Meeting Transcript</h2>
          <p>Meeting ID: {meetingId}</p>
          
          <div style={{ marginTop: '20px' }}>
            <h3>Last Word</h3>
            <div style={{ 
              backgroundColor: '#f0f0f0', 
              padding: '20px', 
              borderRadius: '4px',
              minHeight: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {lastWord ? (
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{lastWord}</p>
              ) : (
                <p style={{ color: '#666' }}>Waiting for transcript...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
