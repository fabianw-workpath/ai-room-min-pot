// Meeting types
export interface Meeting {
  meetingId: string;
  meetingUrl: string;
  recallBotId: string;
  createdAt: string;
  lastWord: string;
  status: 'active' | 'ended';
}

// Transcript types
export interface Word {
  text: string;
  startTimestamp: number;
  endTimestamp: number | null;
}

export interface Participant {
  id: number;
  name: string | null;
  isHost: boolean;
  platform: string | null;
}

export interface TranscriptUpdate {
  lastWord: string;
  timestamp: string;
}
