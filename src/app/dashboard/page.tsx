"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, MessageSquare, Book, Image as ImageIcon, 
  Send, BrainCircuit, AlertCircle, CheckCircle2, 
  LogOut, Coins, Menu, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  image_url?: string;
  created_at?: string;
};

type Conversation = {
  id: string;
  title: string;
  notebook_id?: string;
};

type Notebook = {
  id: string;
  name: string;
  color: string;
};

export default function EcosystemDashboard() {
  const supabase = createClient();
  const router = useRouter();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [user, setUser] = useState<{ id: string } | null>(null);
  
  // Input State
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [modelMode, setModelMode] = useState("gemini-1.5-flash"); // Flash or Pro
  
  // UI State
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Fetch
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Fetch credits
      const { data: profile } = await supabase.from("profiles").select("credits_balance").eq("id", user.id).single();
      if (profile) setCredits(profile.credits_balance);

      // Fetch notebooks
      const { data: nbs } = await supabase.from("notebooks").select("*").order("created_at", { ascending: false });
      if (nbs) setNotebooks(nbs);

      // Fetch conversations
      const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false });
      if (convs) setConversations(convs);
      
      // Auto-select first conversation or leave empty
      if (convs && convs.length > 0) {
        loadConversation(convs[0].id);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const loadConversation = async (id: string) => {
    setCurrentConvId(id);
    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
    if (msgs) setMessages(msgs);
  };

  const createNewChat = async () => {
    if (!user) return;
    const { data } = await supabase.from("conversations").insert({
      user_id: user.id,
      title: "Nova Conversa"
    }).select().single();
    
    if (data) {
      setConversations([data, ...conversations]);
      setCurrentConvId(data.id);
      setMessages([]);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!inputText.trim() && !imageFile) return;
    if (credits < 1) {
      setError("Créditos insuficientes.");
      return;
    }

    setIsStreaming(true);
    setError(null);

    let activeConvId = currentConvId;
    
    // Create conversation if none active
    if (!activeConvId) {
      const { data } = await supabase.from("conversations").insert({
        user_id: user.id,
        title: inputText.trim() ? inputText.slice(0, 30) + "..." : "Resolução de Imagem"
      }).select().single();
      if (data) {
        activeConvId = data.id;
        setConversations([data, ...conversations]);
        setCurrentConvId(activeConvId);
      } else {
        setError("Falha ao criar conversa. Verifique sua conexão.");
        setIsStreaming(false);
        return;
      }
    }

    // Immediately add user message to UI
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    
    // We create a temporary AI message that we will stream into
    const tempAiMsgId = "temp-" + Date.now().toString();
    const tempAiMsg: Message = { id: tempAiMsgId, role: 'ai', content: "" };
    
    setMessages(prev => [...prev, newUserMsg, tempAiMsg]);

    const formData = new FormData();
    formData.append("mode", "estudo"); // Legacy mode payload if needed
    formData.append("model", modelMode);
    if (activeConvId) formData.append("conversation_id", activeConvId);
    if (inputText) formData.append("text", inputText);
    if (imageFile) formData.append("file", imageFile);

    // Clear inputs
    setInputText("");
    setImageFile(null);

    try {
      // Call our API (which will stream and insert into DB internally)
      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro no servidor.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Erro ao iniciar o stream.");
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let streamedData = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          streamedData += decoder.decode(value, { stream: true });
          // Update the temporary AI message in state
          setMessages(prev => prev.map(msg => 
            msg.id === tempAiMsgId ? { ...msg, content: streamedData } : msg
          ));
        }
      }

      // Decrement credits in UI since backend successfully charged
      setCredits(prev => Math.max(0, prev - 1));

    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
      // Se falhou, remova a bolha da IA temporária
      setMessages(prev => prev.filter(msg => msg.id !== tempAiMsgId));
    } finally {
      setIsStreaming(false);
      // Reload actual messages to get DB IDs and persistent state
      if (activeConvId) loadConversation(activeConvId);
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Sidebar Overlay for Mobile */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 p-2 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* LEFT SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 h-full border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl flex flex-col z-40 absolute md:relative"
          >
            <div className="p-4 flex items-center justify-between">
              <h2 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Exam Solver</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-zinc-100 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pb-4">
              <Button 
                onClick={createNewChat}
                className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
              
              {/* Notebooks Section */}
              <div>
                <p className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Book className="w-3 h-3" /> Notebooks
                </p>
                <div className="space-y-1">
                  {notebooks.length === 0 ? (
                    <p className="px-2 text-xs text-zinc-600 italic">Nenhum caderno.</p>
                  ) : (
                    notebooks.map(nb => (
                      <button key={nb.id} className="w-full text-left px-2 py-1.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nb.color }} />
                        {nb.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Conversations */}
              <div>
                <p className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Recentes
                </p>
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <button 
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition truncate flex items-center gap-2 ${currentConvId === conv.id ? 'bg-zinc-800/80 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'}`}
                    >
                      <MessageSquare className="w-4 h-4 opacity-50 shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Profile Area */}
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/50">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">{credits} Créditos</span>
                </div>
              </div>
              <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10">
                <LogOut className="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full bg-zinc-950 relative">
        
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            
            {messages.length === 0 ? (
              <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <BrainCircuit className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-zinc-200">Como posso ajudar?</h2>
                  <p className="text-zinc-500 text-sm mt-1">Faça upload de uma questão ou digite um problema.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-indigo-600'}`}>
                    {msg.role === 'user' ? <span className="text-xs font-bold">U</span> : <BrainCircuit className="w-5 h-5 text-white" />}
                  </div>
                  
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-zinc-900 border border-zinc-800' : 'bg-transparent border-none px-0'}`}>
                    {msg.content === "" && isStreaming && idx === messages.length - 1 ? (
                      <div className="flex items-center gap-2 text-indigo-400 text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        Gerando resposta...
                      </div>
                    ) : (
                      <div className={`prose prose-invert prose-sm max-w-none ${msg.role === 'ai' ? 'font-serif leading-relaxed text-zinc-300' : 'font-sans text-zinc-200'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* LUXURY INPUT BAR */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10 pb-6 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            
            {/* Error Bubble */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-4 py-2 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Box */}
            <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl transition-all focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10">
              
              {/* Image Preview */}
              <AnimatePresence>
                {imageFile && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-4 pb-2 border-b border-zinc-800/50 flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {imageFile.name}
                    </div>
                    <button onClick={() => setImageFile(null)} className="text-zinc-500 hover:text-rose-400">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 p-3">
                <label className="cursor-pointer p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition shrink-0">
                  <ImageIcon className="w-5 h-5" />
                  <Input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                
                <Textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Envie a questão ou digite aqui..."
                  className="min-h-[44px] max-h-32 bg-transparent border-0 focus-visible:ring-0 resize-none p-2 text-zinc-100 placeholder:text-zinc-600 scrollbar-thin flex-1"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />

                <Button 
                  onClick={handleSubmit}
                  disabled={isStreaming || (!inputText.trim() && !imageFile)}
                  size="icon"
                  className={`rounded-xl shrink-0 transition-all duration-300 ${inputText.trim() || imageFile ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Footer Controls */}
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 px-2">
              <Select value={modelMode} onValueChange={setModelMode}>
                <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs hover:text-zinc-300 focus:ring-0 gap-1 shadow-none">
                  <SelectValue placeholder="Modelo" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-lg">
                  <SelectItem value="gemini-1.5-flash">Gemini Flash (Rápido)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini Pro (Complexo)</SelectItem>
                </SelectContent>
              </Select>
              <p>O modelo pode cometer erros. Revise os cálculos.</p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
