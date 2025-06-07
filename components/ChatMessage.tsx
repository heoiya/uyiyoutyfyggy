
import React, { useState } from 'react';
import { Message, Sender } from '../types';
import { UserIcon } from './icons/UserIcon';
import { AiIcon } from './icons/AiIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { LightningIcon } from './icons/LightningIcon'; // Import the new icon

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean; 
}

interface TextPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
  id?: string; // For code blocks
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const { id: messageId, text, sender, timestamp, imageUrl, imagePrompt, isGeneratingImage, isThinkingPhase } = message;
  // thinkingSteps และ isDisplayingThoughts จะไม่ถูกใช้ในโหมดทดสอบนี้

  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});

  const isUser = sender === Sender.User;
  const isSystem = sender === Sender.System;

  const bubbleStyles = isUser
    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white self-end shadow-lg'
    : isSystem
    ? 'bg-red-600/90 backdrop-blur-sm text-red-100 self-center text-sm shadow-md' // For errors
    : 'bg-slate-800 text-slate-200 self-start shadow-lg';
  
  const alignmentStyles = isUser 
    ? 'items-end' 
    : isSystem
    ? 'items-center'
    : 'items-start';

  const formattedTime = timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const handleCopy = (codeBlockId: string, codeContent: string) => {
    navigator.clipboard.writeText(codeContent).then(() => {
      setCopiedStates(prev => ({ ...prev, [codeBlockId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [codeBlockId]: false }));
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  
  const parseAndRenderContent = (rawText: string | undefined, baseId: string): React.ReactElement[] => {
    if (!rawText) return [];

    const parts: TextPart[] = [];
    const codeBlockRegex = /```(\w*?)?\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;
    let codeBlockIndex = 0;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: rawText.substring(lastIndex, match.index) });
      }
      const language = match[1]?.toLowerCase() || '';
      const code = match[2].trim(); 
      const codeBlockId = `${baseId}-code-${codeBlockIndex++}`;
      parts.push({ type: 'code', language, content: code, id: codeBlockId });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < rawText.length) {
      parts.push({ type: 'text', content: rawText.substring(lastIndex) });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'code' && part.id && part.content) {
        return (
          <div key={part.id} className="relative group my-2">
            {part.language && (
              <div className="text-xs text-slate-400 bg-slate-700/80 px-2 py-0.5 rounded-sm absolute top-1 left-2 select-none">
                {part.language}
              </div>
            )}
            <button
              onClick={() => handleCopy(part.id!, part.content!)}
              className="absolute top-1 right-2 z-10 p-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center"
              aria-label={copiedStates[part.id!] ? "คัดลอกโค้ดแล้ว" : "คัดลอกโค้ด"}
            >
              {copiedStates[part.id!] ? <CheckIcon /> : <ClipboardIcon />}
              <span className={`ml-1 ${copiedStates[part.id!] ? 'text-cyan-400' : ''}`}>
                {copiedStates[part.id!] ? 'คัดลอกแล้ว!' : 'คัดลอก'}
              </span>
            </button>
            <pre><code className={part.language ? `language-${part.language}` : ''}>{part.content}</code></pre>
          </div>
        );
      }
      return <span key={`${baseId}-text-${index}`} className="whitespace-pre-wrap break-words">{part.content}</span>;
    });
  };
  
  const showStreamingCaretForAnswer = isStreaming && text && text.length > 0;
  const showFallbackStreamingCaret = isStreaming && (!text || text.length ===0);
  
  const mainAnswerContent = parseAndRenderContent(text, `${messageId}-answer`);

  return (
    <div className={`flex flex-col w-full ${alignmentStyles} mb-3`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[90%] md:max-w-[80%] ${isSystem ? 'w-auto max-w-full' : ''}`}>
        
        {!isSystem && (
            <div className={`flex-shrink-0 p-1.5 rounded-full ${isUser ? 'bg-cyan-500 ml-2' : 'bg-slate-700 mr-2'} text-white`}>
            {isUser ? <UserIcon /> : <AiIcon />}
            </div>
        )}

        <div 
            className={`rounded-xl px-4 py-3 ${bubbleStyles} relative min-w-0 
                        ${isSystem ? 'flex items-center' : ''}
                        ${isSystem ? 'max-w-full' : ''}`}
            aria-live={isStreaming || isGeneratingImage || isThinkingPhase ? "polite" : "off"}
            aria-atomic="true"
        >
          {isSystem && !imageUrl && !isGeneratingImage && (
            <div className="flex-shrink-0 mr-2"> 
                 <AlertTriangleIcon />
            </div>
          )}

          {isGeneratingImage && (
            <div className="flex items-center">
              <LoadingSpinner size="w-4 h-4 mr-2" color="text-slate-300" />
              <span className="text-sm italic text-slate-300">{text || `กำลังสร้างภาพ: ${imagePrompt}`}</span>
            </div>
          )}
          {!isGeneratingImage && imageUrl && (
            <div className="flex flex-col items-center">
              {isSystem && ( 
                <div className="flex-shrink-0 mb-2 self-center"> 
                    <AlertTriangleIcon />
                </div>
              )}
              <img 
                src={imageUrl} 
                alt={imagePrompt || 'ภาพที่สร้างขึ้น'} 
                className="rounded-lg max-w-full h-auto md:max-w-md my-2 shadow-xl border border-slate-700/50" 
                loading="lazy"
              />
              {imagePrompt && <p className="text-xs text-slate-500 italic mt-1.5 text-center">คำสั่งสร้างภาพ: "{imagePrompt}"</p>}
              {isSystem && text && <p className="whitespace-pre-wrap break-words mt-1">{text}</p>}
            </div>
          )}
          {!isGeneratingImage && !imageUrl && (
            <>
              {isThinkingPhase && (
                <div className="flex items-center justify-center h-6"> 
                  <LightningIcon className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
              )}
              
              {!isThinkingPhase && (mainAnswerContent.length > 0 || showFallbackStreamingCaret) && (
                <div>
                  {mainAnswerContent}
                  {(showStreamingCaretForAnswer || showFallbackStreamingCaret) && (
                    <span className={`inline-block w-1 h-4 ml-1 ${isUser ? 'bg-white' : 'bg-slate-200'} animate-pulse`}></span>
                  )}
                </div>
              )}
              {/* This handles system messages that are not "thinking" (e.g. errors that might have content) */}
              {isSystem && !isThinkingPhase && mainAnswerContent.length > 0 && (
                 <div>{mainAnswerContent}</div>
              )}
            </>
          )}
        </div>
      </div>
      <span className={`text-xs text-slate-500 mt-1.5 
                        ${isUser ? 'self-end mr-14 pr-1' : ''} 
                        ${!isUser && !isSystem ? 'self-start ml-14 pl-1' : ''}
                        ${isSystem ? 'self-center' : ''}`}>
        {formattedTime}
      </span>
    </div>
  );
};

export default ChatMessage;
