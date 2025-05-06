import { Component, inject, OnInit} from '@angular/core';
import { ChatService, MessageType } from '../../services/chat.service';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { MarkdownComponent } from 'ngx-markdown';



@Component({
  selector: 'app-chat',
  imports: [FormsModule, MarkdownComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  private chatService = inject(ChatService);
  userInput = '';
  isLoading = false;
  currentResponse = '';
  history = this.chatService.getHistory();
  sysRole = "Vous êtes un assistant utile, pertinent et précis. Répondez en français et dans un language familier des mecs de cité."
  //Array = Array;

  messages: MessageType[] = [
    { role: 'system', content: 'Vous êtes un assistant utile.' }
  ];

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor() {}

  ngOnInit() {
    this.chatService.initialize(this.sysRole);
    console.log("history", this.history())
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

  submit() {
    //this.selectedFile ? this.sendImg() : this.send()
    console.log(("GOOOO"))
    this.sendImg()
  }


  ///////////
  ///////////

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
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.currentResponse = 'Une erreur est survenue.';
    } finally {
      this.isLoading = false;
      this.userInput = '';
      this.currentResponse = "";
      console.log("history33", this.history())
    }

  }

  //////////
  //////////

  async send() {
    //////////////////
    
    if (!this.userInput.trim()) return;

    this.isLoading = true;
    this.currentResponse = '';
    console.log("history22", this.history())

    try {
      const stream = await this.chatService.sendMessage(this.userInput);
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        this.currentResponse += value;
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.currentResponse = 'Une erreur est survenue.';
    } finally {
      this.isLoading = false;
      this.userInput = '';
      this.currentResponse = "";
      console.log("history33", this.history())
    }
      
    //////////////////////
  }

}
