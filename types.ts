export enum Sender {
  User = 'user',
  AI = 'ai',
  System = 'system', // For system messages like errors
}

export interface Message {
  id: string;
  text: string; // Can be prompt for image, status, or chat text (final answer part)
  sender: Sender;
  timestamp: Date; // Will be stored as ISO string in localStorage then parsed back to Date
  imageUrl?: string; // URL of the generated image
  imagePrompt?: string; // The prompt used to generate the image
  isGeneratingImage?: boolean; // True if this message is an AI placeholder for a pending image
  isThinkingPhase?: boolean; // True if the AI is in a "Thinking..." dots phase before any content streams
  // thinkingSteps and isDisplayingThoughts are currently not used due to simplified AI instructions
  thinkingSteps?: string; 
  isDisplayingThoughts?: boolean;
}

export interface ChatSessionRecord {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string; // Store as ISO string
  lastUpdatedAt: string; // Store as ISO string
}
