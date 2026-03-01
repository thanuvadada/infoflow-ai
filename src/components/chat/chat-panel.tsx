'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { handleQuery } from '@/app/actions';
import { ChatMessage, type Message } from '@/components/chat/chat-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'bot',
  content: "Welcome to InfoWise! I'm here to help you with your questions about our company. How can I assist you today?",
};

interface Document {
  id: string;
  title: string;
  content: string;
  fileType: string;
  originalFilename?: string;
  ingestedAt: Timestamp | null;
}

export function ChatPanel() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const documentsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'documents') : null),
    [firestore, user]
  );
  const { data: documents, isLoading: documentsLoading } = useCollection<Document>(documentsCollection);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await processQuery(input);
  };
  
  const processQuery = async (query: string) => {
    // The history is the state of messages *before* this new query.
    const conversationHistory = messages
      .slice(1) // remove welcome message
      .filter((m) => typeof m.content === 'string')
      .map((m) => ({
        role: m.role as 'user' | 'bot',
        content: m.content as string,
      }));

    const userInput: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };
    
    const newMessages = [...messages, userInput];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const loadingMessage: Message = { id: 'loading', role: 'bot', content: '' };
    setMessages((prev) => [...prev, loadingMessage]);

    if (!user) {
        setIsLoading(false);
        const botResponse: Message = {
          id: Date.now().toString(),
          role: 'bot',
          content: 'Please log in or sign up to search the knowledge base.',
          data: { type: 'answer', citations: [] },
        };
        setMessages((prev) => [...prev.slice(0, -1), botResponse]);
        return;
    }

    const contextDocuments = documents
      ? documents.map((doc) => ({ title: doc.title, content: doc.content }))
      : [];

    const result = await handleQuery(query, conversationHistory, contextDocuments);

    setIsLoading(false);

    if (result.type === 'error') {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: result.message,
      });
      setMessages((prev) => prev.slice(0, -1)); // Remove loading indicator
      return;
    }

    const botResponse: Message = {
      id: Date.now().toString(),
      role: 'bot',
      content: result.type === 'answer' ? result.answer : result.question,
      data: result,
    };

    setMessages((prev) => [...prev.slice(0, -1), botResponse]);
  };

  const formDisabled = isLoading || documentsLoading || isUserLoading;

  return (
    <div className="relative flex h-full w-full flex-col">
      <ScrollArea className="flex-1" viewportRef={scrollAreaRef}>
        <div className="p-4 pb-8 sm:p-6 sm:pb-8">
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLoading={isLoading && msg.id === 'loading'}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="relative mx-auto max-w-2xl"
        >
          <div className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"></div>
          <Input
            type="text"
            placeholder={user ? "Ask anything about the company..." : "Log in to ask questions"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={formDisabled || !user}
            className="h-14 w-full rounded-full border-2 border-border/80 bg-background/80 py-4 pl-6 pr-16 text-base shadow-lg backdrop-blur-md focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full btn-primary-gradient transition-transform duration-300 hover:scale-110"
            disabled={formDisabled || !input.trim() || !user}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
