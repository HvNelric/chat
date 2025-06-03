import { Injectable } from '@angular/core';

export interface AudioResponse {
  text: string;
  response: string;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private readonly apiUrl = 'http://localhost:8000'; // FastAPI server URL

  constructor() { }

  /**
   * Sends an audio file to the FastAPI backend and returns a streaming response
   * @param audioBlob The audio blob to be sent
   * @returns Promise with the transcription and response stream
   */
  async sendAudioToServer(audioBlob: Blob): Promise<{ text: string, stream: ReadableStream<string> }> {
    try {
      const response = await fetch(`${this.apiUrl}/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
        },
        body: audioBlob
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Créer un nouveau stream pour la réponse GPT
      const gptResponse = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: data.text
            }
          ]
        })
      });

      if (!gptResponse.ok) {
        throw new Error(`HTTP error! status: ${gptResponse.status}`);
      }

      // Créer un nouveau ReadableStream qui convertit les Uint8Array en string
      const textStream = new ReadableStream({
        async start(controller) {
          const reader = gptResponse.body!.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const text = decoder.decode(value, { stream: true });
              if (text) controller.enqueue(text);
            }
          } finally {
            controller.close();
            reader.releaseLock();
          }
        }
      });

      // Retourner la transcription et le stream de la réponse
      return {
        text: data.text,
        stream: textStream
      };
    } catch (error) {
      console.error('Error sending audio:', error);
      throw error;
    }
  }

  /**
   * Creates a media recorder instance
   * @returns Promise<MediaRecorder>
   */
  async createMediaRecorder(): Promise<MediaRecorder> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new MediaRecorder(stream);
  }

  /**
   * Stops all audio tracks in a stream
   * @param stream MediaStream to stop
   */
  stopMediaTracks(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
  }
}
