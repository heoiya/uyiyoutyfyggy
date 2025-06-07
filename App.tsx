
import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import * as geminiService from './services/geminiService';
import * as localStorageService from './services/localStorageService';
import { Message, Sender, ChatSessionRecord } from './types';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import HistorySidebar from './components/HistorySidebar';
import { MenuIcon } from './components/icons/MenuIcon';

const App: React.FC = () => {
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAIMessageId, setCurrentAIMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const [allSessions, setAllSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState<boolean>(true); // Default open on desktop

  const getInitialGreetingMessage = (): Message => ({
    id: 'initial-ai-greeting',
    text: "สวัสดี! ฉันคือผู้ช่วย Gemini ของคุณ ถามอะไรฉันก็ได้เลย หรือพิมพ์ `/image <คำสั่งของคุณ>` เพื่อสร้างภาพ!",
    sender: Sender.AI,
    timestamp: new Date(),
  });

  const initializeNewChat = (sessionId: string, sessionName?: string): ChatSessionRecord => {
    const newSession: ChatSessionRecord = {
      id: sessionId,
      name: sessionName || `แชท - ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ${new Date().toLocaleDateString('th-TH')}`,
      messages: [getInitialGreetingMessage()],
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    
    try {
        const newGeminiChat = geminiService.createChatSession(); // Fresh session for new chat
        setChatSession(newGeminiChat);
        setMessages(newSession.messages);
        setActiveSessionId(sessionId);
    } catch (e: unknown) {
        handleInitializationError(e);
        // Return a minimal session record even on error to avoid breaking state logic
        return { ...newSession, messages: [] }; 
    }
    return newSession;
  };
  
  const handleInitializationError = (e: unknown) => {
    const errorMessage = (e as Error).message;
    console.error("Initialization or session creation failed:", errorMessage);
    if (errorMessage.includes("API_KEY") || errorMessage.includes("process.env.API_KEY")) {
      setApiKeyError("ไม่พบ Google API Key (process.env.API_KEY) หรือคีย์ไม่ถูกต้อง โปรดตรวจสอบว่าได้กำหนดค่าในสภาพแวดล้อมของคุณอย่างถูกต้อง");
    } else {
      setError(`เกิดข้อผิดพลาดในการเริ่มต้นหรือสร้างเซสชัน: ${errorMessage}`);
    }
    setChatSession(null);
    setMessages([]);
  };

  useEffect(() => {
    // Check API Key first
    try {
        geminiService.createChatSession(); // This will throw if API_KEY is missing
        setApiKeyError(null); // Clear any previous API key error
    } catch(e: unknown) {
        handleInitializationError(e);
        return; // Stop further initialization if API key is bad
    }

    const loadedSessions = localStorageService.loadSessions();
    setAllSessions(loadedSessions);
    const lastActiveId = localStorageService.loadActiveSessionId();
    
    let sessionToLoad = loadedSessions.find(s => s.id === lastActiveId);

    if (sessionToLoad) {
      loadChatSession(sessionToLoad.id, loadedSessions);
    } else {
      // If no active session or no sessions at all, start a new one
      const newSessionId = `session-${Date.now()}`;
      const newSession = initializeNewChat(newSessionId);
      const updatedSessions = [...loadedSessions, newSession];
      setAllSessions(updatedSessions);
      localStorageService.saveSessions(updatedSessions);
      localStorageService.saveActiveSessionId(newSessionId);
    }
    
    // Adjust sidebar visibility based on screen size
    const handleResize = () => {
        if (window.innerWidth < 768) { // Tailwind md breakpoint
            setIsHistoryPanelOpen(false);
        } else {
            setIsHistoryPanelOpen(true);
        }
    };
    handleResize(); // Call on initial load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, []);


  const startNewChatHandler = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession = initializeNewChat(newSessionId);
    
    setAllSessions(prevSessions => {
        const updated = [...prevSessions, newSession];
        localStorageService.saveSessions(updated);
        return updated;
    });
    localStorageService.saveActiveSessionId(newSessionId);
    if (window.innerWidth < 768) setIsHistoryPanelOpen(false); // Close panel on mobile after new chat
  };

  const loadChatSession = (sessionId: string, currentSessionsList?: ChatSessionRecord[]) => {
    const sessionsToSearch = currentSessionsList || allSessions;
    const sessionToLoad = sessionsToSearch.find(s => s.id === sessionId);
    if (sessionToLoad) {
      try {
        // Pass existing messages to createChatSession to rehydrate AI's context
        const newGeminiChat = geminiService.createChatSession(sessionToLoad.messages);
        setChatSession(newGeminiChat);
        setMessages(sessionToLoad.messages);
        setActiveSessionId(sessionToLoad.id);
        localStorageService.saveActiveSessionId(sessionToLoad.id);
        if (window.innerWidth < 768) setIsHistoryPanelOpen(false); // Close panel on mobile
      } catch (e: unknown) {
        handleInitializationError(e);
      }
    } else {
      console.error("Session not found for ID:", sessionId, "Starting new chat instead.");
      startNewChatHandler(); // Fallback to new chat if session is somehow missing
    }
  };

  const deleteChatSession = (sessionId: string) => {
    const updatedSessions = allSessions.filter(s => s.id !== sessionId);
    setAllSessions(updatedSessions);
    localStorageService.saveSessions(updatedSessions);

    if (activeSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        // Load the most recent chat as active
        const mostRecentSession = updatedSessions.sort((a,b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0];
        loadChatSession(mostRecentSession.id, updatedSessions);
      } else {
        // If no chats left, start a new one
        startNewChatHandler();
      }
    }
  };
  
  const saveMessageToActiveSession = useCallback((message: Message) => {
    if (!activeSessionId) return;

    setAllSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prevSessions;

      const updatedSession = {
        ...prevSessions[sessionIndex],
        messages: [...prevSessions[sessionIndex].messages, message],
        lastUpdatedAt: new Date().toISOString(),
      };
      
      // Auto-generate name from first user message if current name is the default timestamp one
      if (message.sender === Sender.User && updatedSession.name.startsWith("แชท - ")) {
          const firstMeaningfulWords = message.text.split(' ').slice(0, 5).join(' ');
          if (firstMeaningfulWords.length > 3) { // Basic check for meaningfulness
            updatedSession.name = firstMeaningfulWords.length > 30 ? firstMeaningfulWords.substring(0, 27) + "..." : firstMeaningfulWords;
          }
      }


      const newSessions = [...prevSessions];
      newSessions[sessionIndex] = updatedSession;
      localStorageService.saveSessions(newSessions); // Save all sessions to localStorage
      return newSessions;
    });
  }, [activeSessionId]);

  const updateAIMessageInActiveSession = useCallback((messageId: string, updates: Partial<Message>) => {
     if (!activeSessionId) return;

    setAllSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prevSessions;
      
      const currentSessionMessages = prevSessions[sessionIndex].messages;
      const messageIndex = currentSessionMessages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return prevSessions; // Should not happen if message is in UI

      const updatedMessages = [...currentSessionMessages];
      updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };
      
      const updatedSession = {
        ...prevSessions[sessionIndex],
        messages: updatedMessages,
        lastUpdatedAt: new Date().toISOString(),
      };
      
      const newSessions = [...prevSessions];
      newSessions[sessionIndex] = updatedSession;
      localStorageService.saveSessions(newSessions);
      return newSessions;
    });
  }, [activeSessionId]);


  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isLoading || apiKeyError || !activeSessionId) return;
    
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      text: inputText,
      sender: Sender.User,
      timestamp: new Date(),
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    saveMessageToActiveSession(userMessage);


    if (inputText.toLowerCase().startsWith("/image ")) {
      const imagePromptContent = inputText.substring("/image ".length).trim();
      if (!imagePromptContent) {
        const errorMsg = "เกิดข้อผิดพลาดในการสร้างภาพ: ไม่ได้ระบุคำสั่งหลังจากคำสั่ง /image";
        setError(errorMsg); 
        const systemErrorMsg: Message = { 
          id: `${Date.now()}-system-error`, 
          text: errorMsg, 
          sender: Sender.System, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, systemErrorMsg]);
        saveMessageToActiveSession(systemErrorMsg);
        setIsLoading(false);
        return;
      }

      const aiImagePlaceholderId = `${Date.now()}-ai-image`;
      const placeholderMessage: Message = {
        id: aiImagePlaceholderId,
        text: `กำลังสร้างภาพสำหรับ: "${imagePromptContent}"`,
        sender: Sender.AI,
        timestamp: new Date(),
        isGeneratingImage: true,
        imagePrompt: imagePromptContent,
      };
      setMessages(prevMessages => [...prevMessages, placeholderMessage]);
      saveMessageToActiveSession(placeholderMessage);


      try {
        const result = await geminiService.generateImageApi(imagePromptContent);
        const finalImageMessage: Partial<Message> = result.imageUrl
            ? { imageUrl: result.imageUrl, text: "", isGeneratingImage: false, imagePrompt: result.prompt }
            : { text: `เกิดข้อผิดพลาดในการสร้างภาพ: ${result.error || 'ไม่ทราบสาเหตุ'}`, sender: Sender.System, isGeneratingImage: false };

        setMessages(prev => prev.map(msg => msg.id === aiImagePlaceholderId ? { ...msg, ...finalImageMessage } : msg ));
        updateAIMessageInActiveSession(aiImagePlaceholderId, finalImageMessage);

      } catch (e) {
        const err = e as Error;
        console.error("Error calling generateImageApi:", err);
        const errorUpdate: Partial<Message> = { text: `เกิดข้อผิดพลาดในการสร้างภาพ: ${err.message}`, sender: Sender.System, isGeneratingImage: false };
        setMessages(prev => prev.map(msg => msg.id === aiImagePlaceholderId ? { ...msg, ...errorUpdate } : msg ));
        updateAIMessageInActiveSession(aiImagePlaceholderId, errorUpdate);
      } finally {
        setIsLoading(false);
      }

    } else { 
      if (!chatSession) {
        const chatSessionError = "เซสชันแชทยังไม่ได้เริ่มต้น ไม่สามารถส่งข้อความได้";
        setError(chatSessionError);
        const systemErrorMsg: Message = { 
          id: `${Date.now()}-system-error`, 
          text: chatSessionError, 
          sender: Sender.System, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, systemErrorMsg]);
        saveMessageToActiveSession(systemErrorMsg);
        setIsLoading(false);
        return;
      }
      const aiMessageId = `${Date.now()}-ai-text`;
      setCurrentAIMessageId(aiMessageId);
      
      const initialAIMsg: Message = { 
          id: aiMessageId, 
          text: "", 
          sender: Sender.AI, 
          timestamp: new Date(), 
          isThinkingPhase: true, 
          thinkingSteps: "", 
          isDisplayingThoughts: false, 
        };
      setMessages(prevMessages => [...prevMessages, initialAIMsg]);
      saveMessageToActiveSession(initialAIMsg); // Save the placeholder

      let accumulatedRawAiText = ""; 

      try {
        await geminiService.sendMessageStream(
          chatSession,
          inputText,
          (streamData) => { 
            let finalUpdateToPersist: Partial<Message> | null = null;

            setMessages(prevMsgs => {
              const targetMsgIndex = prevMsgs.findIndex(m => m.id === aiMessageId);
               // Allow creating message if not found yet, but only if not final chunk
              if (targetMsgIndex === -1 && !streamData.isFinalChunk) { 
                 return prevMsgs; // Should be created by initialAIMsg, but as a safeguard
              }

              const baseMessage = targetMsgIndex !== -1 
                ? prevMsgs[targetMsgIndex]
                : initialAIMsg; // Fallback if somehow not found (shouldn't happen)


              let updatedMessageState = { ...baseMessage };
              
              if (streamData.error) {
                console.error("Error from AI stream:", streamData.error);
                setError(`ข้อผิดพลาดสตรีม AI: ${streamData.error}`);
                updatedMessageState = {
                  ...updatedMessageState,
                  text: `AI Error: ${streamData.error}`,
                  sender: Sender.System,
                  isThinkingPhase: false,
                };
                finalUpdateToPersist = { text: updatedMessageState.text, sender: Sender.System, isThinkingPhase: false };
                setIsLoading(false); 
                setCurrentAIMessageId(null);
              }
              
              if (streamData.text) {
                accumulatedRawAiText += streamData.text; 
                updatedMessageState.isThinkingPhase = false; 
                updatedMessageState.text = accumulatedRawAiText;
                // For this simplified test, no thinkingSteps/isDisplayingThoughts
              } 
              
              if (streamData.isFinalChunk) {
                updatedMessageState.isThinkingPhase = false;
                updatedMessageState.text = accumulatedRawAiText; // Ensure final text
                finalUpdateToPersist = { text: accumulatedRawAiText, isThinkingPhase: false };
                setIsLoading(false); 
                setCurrentAIMessageId(null);
              }
              
              if (targetMsgIndex !== -1) {
                const newMessages = [...prevMsgs];
                newMessages[targetMsgIndex] = updatedMessageState;
                return newMessages;
              } else if (streamData.isFinalChunk || streamData.error) { 
                // If message wasn't found but it's the end or an error, add it if it's the one we're tracking
                if (baseMessage.id === aiMessageId) return [...prevMsgs, updatedMessageState];
              }
              return prevMsgs; 
            });
            if (finalUpdateToPersist) {
                updateAIMessageInActiveSession(aiMessageId, finalUpdateToPersist);
            }
          }
        );
      } catch (e) { 
          const err = e as Error;
          const failureMessage = `ไม่สามารถส่งข้อความได้: ${err.message}.`;
          console.error(failureMessage, err);
          setError(failureMessage); 
          
          const errorUpdate: Partial<Message> = { 
              text: `${failureMessage}${accumulatedRawAiText ? ` ส่วนที่ได้รับ: ${accumulatedRawAiText}` : ''}`, 
              sender: Sender.System, 
              isThinkingPhase: false,
          };
          setMessages(prevMessages => prevMessages.map(msg => msg.id === aiMessageId ? { ...msg, ...errorUpdate } : msg ));
          updateAIMessageInActiveSession(aiMessageId, errorUpdate);
          setIsLoading(false); 
          if (currentAIMessageId === aiMessageId) setCurrentAIMessageId(null);
      } 
    }
  }, [chatSession, isLoading, apiKeyError, activeSessionId, saveMessageToActiveSession, updateAIMessageInActiveSession, currentAIMessageId]); 

  if (apiKeyError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-300 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 mb-4 text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <h1 className="text-2xl font-bold my-4 text-red-300">ข้อผิดพลาดในการกำหนดค่า</h1>
        <p className="text-center max-w-md">{apiKeyError}</p>
        <p className="text-sm text-slate-400 mt-4">
          แอปพลิเคชันนี้ต้องการ Google API Key เพื่อทำงาน
          โปรดตรวจสอบว่าตัวแปรสภาพแวดล้อม <code>API_KEY</code> ได้รับการตั้งค่าอย่างถูกต้องในที่ที่แอปพลิเคชันนี้กำลังทำงาน
          โค้ดของแอปพลิเคชันไม่ได้จัดการการป้อน API Key ด้วยเหตุผลด้านความปลอดภัย
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      <HistorySidebar 
        sessions={allSessions}
        activeSessionId={activeSessionId}
        onLoadSession={loadChatSession}
        onNewSession={startNewChatHandler}
        onDeleteSession={deleteChatSession}
        isOpen={isHistoryPanelOpen}
        onToggle={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
      />
      <div className="flex flex-col flex-grow">
        <header className="bg-slate-900 p-4 shadow-lg border-b border-slate-700/60 flex items-center">
          <button 
            onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} 
            className="md:hidden p-2 mr-2 text-slate-400 hover:text-slate-200"
            aria-label="Toggle history panel"
          >
            <MenuIcon />
          </button>
          <h1 className="text-xl font-semibold text-slate-100">Gemini แชท</h1>
        </header>
        
        <ChatHistory messages={messages} currentAIMessageId={currentAIMessageId} />

        {error && (
          <div 
              className="bg-red-500/90 text-red-100 p-3 text-center text-sm shadow-md mx-4 mb-2 rounded-lg" 
              role="alert"
          >
            {error}
          </div>
        )}

        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;
