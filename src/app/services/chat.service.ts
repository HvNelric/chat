import { Injectable, signal } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { HttpClient } from '@angular/common/http';


export interface MessageType {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private url = "http://localhost:8000";
  conversationHistory = signal<MessageType[]>([]);

  constructor(private http: HttpClient) {}

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  //////////////////////////////////////////////////////////////

  async chatWithImage(userInput: string, imgFile?: File): Promise<ReadableStream<string>> {

    const imageBase64 = imgFile ? await this.fileToBase64(imgFile) : "";

    this.conversationHistory.update(history => [
      ...history,
      imgFile ?
      {
        role: 'user', 
        content: userInput,
        image: imageBase64
      }
      :
      {
        role: 'user', 
        content: userInput
      }
    ]);

    // Préparer les messages à envoyer (on peut limiter à N derniers messages)
    const messagesToSend = this.getRecentMessages(10);

    try {
      const response = await fetch(`${this.url}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messagesToSend })
      });

      if (!response.ok || !response.body) {
        throw new Error('Erreur lors de la requête');
      }

      // Créer un stream pour le traitement progressif
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      return new ReadableStream({
        start: async (controller) => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              assistantMessage += chunk;
              controller.enqueue(chunk);
            }

            // Ajouter la réponse complète à l'historique une fois reçue
            this.conversationHistory.update(history => [
              ...history,
              { role: 'assistant', content: assistantMessage }
            ]);

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
    
  }
  

  //////////////////////////
  /////////////////////////

  async sendMessage(userInput: string): Promise<ReadableStream<string>> {
    // Ajouter le message utilisateur à l'historique
    this.conversationHistory.update(history => [
      ...history,
      { role: 'user', content: userInput }
    ]);

    // Préparer les messages à envoyer (on peut limiter à N derniers messages)
    const messagesToSend = this.getRecentMessages(10);

    try {
      const response = await fetch(`${this.url}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messagesToSend })
      });

      if (!response.ok || !response.body) {
        throw new Error('Erreur lors de la requête');
      }

      // Créer un stream pour le traitement progressif
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      return new ReadableStream({
        start: async (controller) => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              assistantMessage += chunk;
              controller.enqueue(chunk);
            }

            // Ajouter la réponse complète à l'historique une fois reçue
            this.conversationHistory.update(history => [
              ...history,
              { role: 'assistant', content: assistantMessage }
            ]);

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  }

  private getRecentMessages(limit: number): MessageType[] {
    const history = this.conversationHistory();
    // Garder le message système s'il existe (toujours le premier)
    const systemMessage = history.find(m => m.role === 'system');
    const otherMessages = history.filter(m => m.role !== 'system').slice(-limit);
    
    return systemMessage ? [systemMessage, ...otherMessages] : [...otherMessages];
  }

  getHistory() {
    return this.conversationHistory.asReadonly();
  }

  clearHistory() {
    this.conversationHistory.set([]);
  }

  initialize(systemPrompt?: string) {
    this.clearHistory();
    if (systemPrompt) {
      this.conversationHistory.set([{ role: 'system', content: systemPrompt }]);
    }
  }

//////////////////
}