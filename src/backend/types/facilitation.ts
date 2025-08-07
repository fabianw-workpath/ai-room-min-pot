export interface FacilitationConfig {
  meetingTarget: string;
  targetState: 'on_topic' | 'off_topic' | 'neutral';
  facilitationFeedback: string;
}

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  speaker?: string;
}

export interface TranscriptAnalysisRequest {
  meetingTarget: string;
  transcript: TranscriptSegment[];
}

export interface TranscriptAnalysisResponse {
  isOnTopic: boolean;
  feedback: string;
}
