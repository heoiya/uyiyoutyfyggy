import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import ChatMessage from './ChatMessage';

interface ChatHistoryProps {
  messages: Message[];
  currentAIMessageId: string | null;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, currentAIMessageId }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAIMessageId]); // Scroll when messages update or AI starts/stops typing

  return (
    <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-900">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} isStreaming={msg.id === currentAIMessageId && msg.sender === 'ai'} />
      ))}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatHistory;
