import { Component, inject, OnInit, ElementRef, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { ChatService, MessageType } from '../../services/chat.service';
import { AudioService } from '../../services/audio.service';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { MarkdownComponent } from 'ngx-markdown';
import { TextareaResizeDirective } from '../../directives/textarea-resize.directive';
import { fromEvent, Subscription } from 'rxjs';
@Component({
  selector: 'app-chat',
  imports: [
    FormsModule, 
    MarkdownComponent,
    TextareaResizeDirective
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, AfterViewChecked {
  private chatService = inject(ChatService);
  private audioService = inject(AudioService);
  
  userInput = '';
  isLoading = false;
  currentResponse = '';
  history = this.chatService.getHistory();
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];

  sysRole = "Vous êtes un assistant utile. Répondez en français avec un language familier des mecs de la cité."

  messages: MessageType[] = [
    { role: 'system', content: this.sysRole }
  ];

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  userScrolledUp = false;
  lastScrollPosition = 0;

  svgGo = "../../../assets/bulb.svg";
  svgUser = "../../../assets/svg/user.svg";
  svgIa = "../../../assets/svg/ia.svg"

  constructor() {}

  ngOnInit() {
    this.chatService.initialize(this.sysRole);
  }

  ngAfterViewChecked() {
    //if(this.isLoading) this.scrollToBottom()
    //console.log('view ')
  }

  scrollToBottom() {
    try {

      const element = this.messageContainer.nativeElement;

      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth' // ← Ajoute une animation
      });
    } catch (err) {
      console.error(err);
    }
  }

  clear() {
    this.chatService.initialize(this.sysRole);
    this.selectedFile = null;
    this.imagePreview = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreview = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  submit(event: any) {
    event.preventDefault();
    //this.selectedFile ? this.sendImg() : this.send()
    console.log(("GOOOO"))
    this.sendImg()
  }

  async sendImg() {
    if (!this.userInput.trim()) return;

    this.isLoading = true;
    this.currentResponse = '';
    console.log("history22", this.history())

    try {
      const stream = await this.chatService.chatWithImage(this.userInput, this.selectedFile ?  this.selectedFile : null);
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        this.currentResponse += value;
        this.scrollToBottom()
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.currentResponse = 'Une erreur est survenue.';
    } finally {
      this.isLoading = false;
      this.userInput = '';
      this.currentResponse = "";
      this.scrollToBottom()
      console.log("history33", this.history())
    }
  }

  async startRecording() {
    if (this.isRecording) return;

    try {
      this.mediaRecorder = await this.audioService.createMediaRecorder();
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
    }
  }

  async stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;

    this.isRecording = false;

    return new Promise<void>((resolve) => {
      if (this.mediaRecorder) {
        this.mediaRecorder.onstop = async () => {
          try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.isLoading = true;

            // Ajouter un message temporaire pour l'audio en cours de traitement
            this.chatService.conversationHistory.update(history => [
              ...history,
              {
                role: 'user',
                content: 'Audio en cours de traitement...'
              }
            ]);

            const { text, stream } = await this.audioService.sendAudioToServer(audioBlob);

            // Mettre à jour le message utilisateur avec la transcription
            this.chatService.conversationHistory.update(history => {
              const newHistory = [...history];
              newHistory[newHistory.length - 1] = {
                role: 'user',
                content: `🎤 ${text}`
              };
              return newHistory;
            });

            // Ajouter un message vide pour la réponse de l'assistant
            this.chatService.conversationHistory.update(history => [
              ...history,
              {
                role: 'assistant',
                content: ''
              }
            ]);

            // Traiter la réponse en streaming
            const reader = stream.getReader();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Mettre à jour le dernier message de l'assistant avec le nouveau contenu
                this.chatService.conversationHistory.update(history => {
                  const newHistory = [...history];
                  const lastMessage = newHistory[newHistory.length - 1];
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content += value;
                  }
                  return newHistory;
                });

                this.scrollToBottom();
              }
            } finally {
              reader.releaseLock();
            }

          } catch (error) {
            console.error('Erreur lors du traitement audio:', error);
            this.chatService.conversationHistory.update(history => [
              ...history,
              {
                role: 'assistant',
                content: 'Une erreur est survenue lors du traitement audio.'
              }
            ]);
          } finally {
            this.isLoading = false;
            this.isRecording = false;
            if (this.mediaRecorder?.stream) {
              this.audioService.stopMediaTracks(this.mediaRecorder.stream);
            }
            resolve();
          }
        };

        this.mediaRecorder.stop();
      }
    });
  }

}
