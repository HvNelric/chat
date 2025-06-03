export interface Message {
  content: string;
  role: 'user' | 'assistant';
  image?: string;  // Optional field for image URLs
} 