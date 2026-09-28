import { create } from 'zustand';

export type MessageStatus = 'sending' | 'streaming' | 'completed' | 'saving' | 'saved' | 'error';

export interface Message {
  id: string; // client_message_id universal
  role: 'user' | 'ai' | 'system';
  content: string;
  thought_process?: string;
  is_thinking?: boolean;
  image_url?: string;
  status?: MessageStatus;
  createdAt?: number;
}

interface ChatStore {
  // Estado Legacy-Compatible para Zero Downtime
  messages: Message[];
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  
  // Aqui no futuro adicionaremos actions otimistas (addMessage, updateChunk, etc)
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  setMessages: (updater) => set((state) => ({
    messages: typeof updater === 'function' ? updater(state.messages) : updater
  }))
}));
