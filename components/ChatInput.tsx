
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './icons/SendIcon';
import { LoadingSpinner } from './LoadingSpinner';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean; // Global loading state from App
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`; // Set to scroll height
      
      if (scrollHeight > textareaRef.current.clientHeight && textareaRef.current.scrollTop + textareaRef.current.clientHeight >= textareaRef.current.scrollHeight - 20 ) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }
  }, [inputValue]);


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pt-3 pb-3 sm:pb-4 bg-slate-950 sticky bottom-0"> 
      <form 
        onSubmit={handleSubmit} 
        className="relative mx-auto max-w-3xl bg-slate-900 shadow-2xl rounded-xl p-1.5 flex items-end space-x-2"
        aria-label="Chat input form"
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ /image <คำสั่งสร้างภาพ> หรือข้อความของคุณ..."
          className="flex-grow p-3 bg-transparent focus:outline-none text-slate-200 placeholder-slate-500 resize-none overflow-y-auto max-h-48 border-none focus:ring-0"
          rows={1}
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-2.5 bg-cyan-500 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-500/50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 self-end mb-[2px] mr-[2px]"
          aria-label="Send message"
        >
          {isLoading ? <LoadingSpinner size="w-5 h-5" color="text-white" /> : <SendIcon />}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;