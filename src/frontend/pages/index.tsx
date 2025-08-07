import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Define types
interface MeetingResponse {
  meetingId: string;
  recallBotId: string;
  status: string;
}

interface FacilitationConfig {
  meetingTarget: string;
  targetState: 'on_topic' | 'off_topic' | 'neutral';
  facilitationFeedback: string;
}

interface MeetingUpdate {
  lastWord: string;
  currentSentence?: string;
  facilitationConfig?: FacilitationConfig;
}

export default function Home() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [lastWord, setLastWord] = useState('');
  const [currentSentence, setCurrentSentence] = useState('');
  const [facilitationConfig, setFacilitationConfig] = useState<FacilitationConfig>({
    meetingTarget: '',
    targetState: 'neutral',
    facilitationFeedback: 'Waiting for conversation to begin...'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Socket reference to prevent recreation on each render
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:3000');
    }
    
    const socket = socketRef.current;
    
    // Listen for updates
    const handleConnect = () => {
      console.log('Socket connected');
    };
    
    const handleUpdate = (data: MeetingUpdate) => {
      console.log('Received transcript update:', data);
      if (data.lastWord) setLastWord(data.lastWord);
      if (data.currentSentence) setCurrentSentence(data.currentSentence);
      if (data.facilitationConfig) setFacilitationConfig(data.facilitationConfig);
    };
    
    const handleFacilitationUpdate = (data: { facilitationConfig: FacilitationConfig }) => {
      console.log('Received facilitation update:', data);
      if (data.facilitationConfig) setFacilitationConfig(data.facilitationConfig);
    };
    
    socket.on('connect', handleConnect);
    
    if (meetingId) {
      socket.on(`meeting:${meetingId}:update`, handleUpdate);
      socket.on(`meeting:${meetingId}:facilitation`, handleFacilitationUpdate);
    }
    
    return () => {
      socket.off('connect', handleConnect);
      if (meetingId) {
        socket.off(`meeting:${meetingId}:update`, handleUpdate);
        socket.off(`meeting:${meetingId}:facilitation`, handleFacilitationUpdate);
      }
    };
  }, [meetingId]);

  // Handle meeting creation
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meetingUrl) {
      setError('Please enter a meeting URL');
      return;
    }
    
    // Default meeting target
    const meetingTarget = 'Talk only about apples';

    try {
      setIsLoading(true);
      setError('');
      
      // Call the backend API to create meeting

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          meetingUrl,
          meetingTarget: facilitationConfig.meetingTarget 
        }),
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
    <div style={{ 
      backgroundColor: '#363953', 
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        padding: '1rem', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <img 
          src="/images/workpath-logo.png" 
          alt="Workpath Logo" 
          style={{ height: '20px' }} 
        />
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>AI Room Proof of Technology</h1>
      </header>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem', fontWeight: 'bold', fontSize: '2rem' }}>Transcript Feedback Test</h1>
      
      {!meetingId ? (
        <div style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleCreateMeeting}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="meeting-url" style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                Connect your call
              </label>
              <input
                id="meeting-url"
                type="text"
                placeholder="Your call url (Teams, Zoom or Google Meet)"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                disabled={isLoading || !!meetingId}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '0.375rem', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'white'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="meeting-target" style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                Meeting Target
              </label>
              <input
                id="meeting-target"
                type="text"
                value={facilitationConfig.meetingTarget}
                onChange={(e) => setFacilitationConfig({...facilitationConfig, meetingTarget: e.target.value})}
                disabled={isLoading || !!meetingId}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '0.375rem', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'white'
                }}
              />
            </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#FFDA44', 
              color: '#363953', 
              border: 'none', 
              borderRadius: '0.375rem', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {isLoading ? 'Creating...' : 'Connect'}
          </button>
          
          {error && (
            <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>{error}</p>
          )}
        </form>
      </div>
      ) : null}
      
      {meetingId && (
        <div style={{ 
          borderRadius: '0.5rem', 
          padding: '1.5rem',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Meeting Target with Status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(255,255,255,0.05)'
          }}>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>Meeting target</h3>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{facilitationConfig.meetingTarget}</p>
            </div>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: '#ffffffaa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              {facilitationConfig.targetState === 'on_topic' ? '✅' : 
               facilitationConfig.targetState === 'off_topic' ? '👀' : 
               '🐢'}
            </div>
          </div>
          
          {/* Current Sentence */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>Current Speech</h3>
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              padding: '1rem', 
              borderRadius: '0.375rem',
              minHeight: '60px',
            }}>
              {currentSentence ? (
                <p style={{ margin: 0, fontSize: '1.125rem' }}>{currentSentence}</p>
              ) : (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>Waiting for transcript...</p>
              )}
            </div>
          </div>
          
          {/* Facilitation Feedback */}
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>Facilitation Feedback</h3>
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              padding: '1rem', 
              borderRadius: '0.375rem',
              minHeight: '60px',
              borderLeft: '4px solid #FFDA44'
            }}>
              <p style={{ margin: 0, fontSize: '1.125rem' }}>{facilitationConfig.facilitationFeedback}</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
