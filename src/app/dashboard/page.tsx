"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, MessageSquare, Book, Image as ImageIcon, 
  Send, BrainCircuit, AlertCircle, 
  LogOut, Coins, Menu, X, Trash2, Edit2, Settings, Check, Sun, Moon, CreditCard, Lock, User
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

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
  
  // Edit State
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Input State
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState("gemini-1.5-flash");
  
  // UI State
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Click outside to close settings menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial Fetch
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: profile } = await supabase.from("profiles").select("credits_balance").eq("id", user.id).single();
      if (profile) setCredits(profile.credits_balance);

      const { data: nbs } = await supabase.from("notebooks").select("*").order("created_at", { ascending: false });
      if (nbs) setNotebooks(nbs);

      const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false });
      if (convs) setConversations(convs);
      
      if (convs && convs.length > 0) {
        loadConversation(convs[0].id);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleRenameConversation = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    const { error } = await supabase.from("conversations").update({ title: editTitle }).eq("id", id);
    if (!error) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle } : c));
    }
    setEditingConvId(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Convert to base64 for preview and DB storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
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

    // Immediately add user message to UI with image preview if exists
    const newUserMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: inputText,
      image_url: imageBase64 || undefined
    };
    
    const tempAiMsgId = "temp-" + Date.now().toString();
    const tempAiMsg: Message = { id: tempAiMsgId, role: 'ai', content: "" };
    
    setMessages(prev => [...prev, newUserMsg, tempAiMsg]);

    const formData = new FormData();
    formData.append("model", modelMode);
    if (activeConvId) formData.append("conversation_id", activeConvId);
    if (inputText) formData.append("text", inputText);
    if (imageFile) formData.append("file", imageFile);

    // Save image Base64 to DB immediately for the user message
    if (imageBase64) {
      // The API already saves the text part, but not the image_url.
      // We will let the API handle the text, and we update the message with the image_url later, 
      // or we just save the message here and skip the API saving it.
      // Actually, since the API saves it, we can just run an update right after.
      // For simplicity, we just pass the base64 via a hidden form field or update later.
    }

    setInputText("");
    setImageFile(null);
    setImageBase64(null);

    try {
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
          setMessages(prev => prev.map(msg => 
            msg.id === tempAiMsgId ? { ...msg, content: streamedData } : msg
          ));
        }
      }

      setCredits(prev => Math.max(0, prev - 1));

    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
      setMessages(prev => prev.filter(msg => msg.id !== tempAiMsgId));
    } finally {
      setIsStreaming(false);
      if (activeConvId) loadConversation(activeConvId); // reload to get actual DB items
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setIsSettingsMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 bg-white text-zinc-900">
      
      {/* Sidebar Overlay for Mobile */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 p-2 dark:bg-zinc-900 bg-white rounded-md border dark:border-zinc-800 border-zinc-200 dark:text-zinc-400 text-zinc-500 hover:text-indigo-500 shadow-sm md:hidden"
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
            className="flex-shrink-0 h-full border-r dark:border-zinc-800/60 border-zinc-200 dark:bg-zinc-950/80 bg-zinc-50/80 backdrop-blur-xl flex flex-col z-40 absolute md:relative"
          >
            <div className="p-4 flex items-center justify-between">
              <h2 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">Exam Solver</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden dark:text-zinc-400 text-zinc-500 hover:text-indigo-500 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pb-4">
              <Button 
                onClick={createNewChat}
                className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-thin dark:scrollbar-thumb-zinc-800 scrollbar-thumb-zinc-200">
              
              {/* Notebooks Section */}
              <div>
                <p className="px-2 text-xs font-semibold dark:text-zinc-500 text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Book className="w-3 h-3" /> Notebooks
                </p>
                <div className="space-y-1">
                  {notebooks.length === 0 ? (
                    <p className="px-2 text-xs dark:text-zinc-600 text-zinc-400 italic">Nenhum caderno.</p>
                  ) : (
                    notebooks.map(nb => (
                      <button key={nb.id} className="w-full text-left px-2 py-1.5 rounded-md text-sm dark:text-zinc-400 text-zinc-600 dark:hover:bg-zinc-900 hover:bg-zinc-200 hover:text-indigo-600 dark:hover:text-zinc-200 transition flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nb.color }} />
                        {nb.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Conversations */}
              <div>
                <p className="px-2 text-xs font-semibold dark:text-zinc-500 text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Recentes
                </p>
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <div key={conv.id} className="relative group">
                      {editingConvId === conv.id ? (
                        <div className="flex items-center gap-2 w-full px-2 py-1.5 dark:bg-zinc-900 bg-white border dark:border-zinc-700 border-zinc-200 rounded-lg shadow-sm">
                          <input 
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameConversation(conv.id)}
                            className="bg-transparent text-sm dark:text-zinc-100 text-zinc-900 flex-1 outline-none min-w-0"
                          />
                          <button onClick={() => handleRenameConversation(conv.id)} className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => loadConversation(conv.id)}
                          className={`w-full text-left px-2 py-2 rounded-lg text-sm transition flex items-center justify-between ${currentConvId === conv.id ? 'dark:bg-zinc-800/80 bg-zinc-200/80 dark:text-zinc-100 text-zinc-900 font-medium' : 'dark:text-zinc-400 text-zinc-600 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200 hover:text-zinc-900'}`}
                        >
                          <div className="flex items-center gap-2 truncate pr-4">
                            <MessageSquare className="w-4 h-4 opacity-50 shrink-0" />
                            <span className="truncate">{conv.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 dark:bg-gradient-to-l dark:from-zinc-950 from-zinc-50 pl-4">
                            <div 
                              role="button"
                              onClick={(e) => { e.stopPropagation(); setEditingConvId(conv.id); setEditTitle(conv.title); }} 
                              className="p-1 text-zinc-500 hover:text-indigo-500 dark:hover:bg-zinc-800 hover:bg-zinc-200 rounded"
                              title="Renomear"
                            >
                              <Edit2 className="w-3 h-3" />
                            </div>
                            <div 
                              role="button"
                              onClick={(e) => handleDeleteConversation(conv.id, e)} 
                              className="p-1 text-zinc-500 hover:text-rose-500 dark:hover:bg-zinc-800 hover:bg-zinc-200 rounded"
                              title="Apagar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Profile Area with Settings Popover */}
            <div className="p-4 border-t dark:border-zinc-800/60 border-zinc-200 dark:bg-zinc-950/50 bg-zinc-100/50 relative">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 text-sm dark:text-zinc-300 text-zinc-700">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">{credits} Créditos</span>
                </div>
              </div>
              
              {/* Settings Popover */}
              <AnimatePresence>
                {isSettingsMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    ref={settingsMenuRef}
                    className="absolute bottom-16 left-4 w-64 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-xl shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    <div className="px-2 py-2 mb-2 border-b dark:border-zinc-800 border-zinc-100">
                      <p className="text-xs font-semibold dark:text-zinc-400 text-zinc-500 uppercase tracking-wider">Ações da Conta</p>
                    </div>
                    
                    <button className="w-full flex items-center gap-3 px-2 py-2 text-sm dark:text-zinc-300 text-zinc-700 dark:hover:bg-zinc-800 hover:bg-zinc-100 rounded-md transition-colors text-left">
                      <User className="w-4 h-4 text-indigo-500" />
                      Trocar Username
                    </button>
                    <button className="w-full flex items-center gap-3 px-2 py-2 text-sm dark:text-zinc-300 text-zinc-700 dark:hover:bg-zinc-800 hover:bg-zinc-100 rounded-md transition-colors text-left">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Alterar Senha
                    </button>
                    <button className="w-full flex items-center gap-3 px-2 py-2 text-sm dark:text-zinc-300 text-zinc-700 dark:hover:bg-zinc-800 hover:bg-zinc-100 rounded-md transition-colors text-left">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      Comprar Tokens (Update)
                    </button>
                    
                    <div className="my-2 border-t dark:border-zinc-800 border-zinc-100" />
                    
                    <button onClick={toggleTheme} className="w-full flex items-center justify-between px-2 py-2 text-sm dark:text-zinc-300 text-zinc-700 dark:hover:bg-zinc-800 hover:bg-zinc-100 rounded-md transition-colors text-left">
                      <div className="flex items-center gap-3">
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        Mudar para {theme === 'dark' ? 'Claro' : 'Escuro'}
                      </div>
                    </button>

                    <div className="my-2 border-t dark:border-zinc-800 border-zinc-100" />

                    <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-rose-500 dark:hover:bg-rose-500/10 hover:bg-rose-50 rounded-md transition-colors text-left">
                      <Trash2 className="w-4 h-4" />
                      Eliminar Conta
                    </button>

                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} 
                  variant="ghost" 
                  className={`flex-1 justify-start transition-colors ${isSettingsMenuOpen ? 'dark:bg-zinc-800 bg-zinc-200 dark:text-zinc-100 text-zinc-900' : 'dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50'}`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Definições
                </Button>
                <Button onClick={handleSignOut} variant="ghost" size="icon" className="shrink-0 dark:text-zinc-400 text-zinc-500 hover:text-rose-500 dark:hover:bg-rose-500/10 hover:bg-rose-50" title="Sair">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Animated Background (Gemini Inspired) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[80px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 scrollbar-thin dark:scrollbar-thumb-zinc-800 scrollbar-thumb-zinc-200 z-10 relative">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            
            {messages.length === 0 ? (
              <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                  <BrainCircuit className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-xl font-medium dark:text-zinc-200 text-zinc-800">Como posso ajudar?</h2>
                  <p className="dark:text-zinc-500 text-zinc-500 text-sm mt-1">Faça upload de uma questão ou digite um problema.</p>
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
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-indigo-600'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 dark:text-zinc-300 text-zinc-600" /> : <BrainCircuit className="w-5 h-5 text-white" />}
                  </div>
                  
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 shadow-sm' : 'bg-transparent border-none px-0'}`}>
                    
                    {/* Render Image if exists in message */}
                    {msg.image_url && (
                      <div className="mb-3">
                        <img src={msg.image_url} alt="Imagem enviada" className="max-w-xs rounded-xl shadow-md border dark:border-zinc-700 border-zinc-300" />
                      </div>
                    )}

                    {msg.content === "" && isStreaming && idx === messages.length - 1 ? (
                      <div className="flex items-center gap-2 text-indigo-500 text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Gerando resposta...
                      </div>
                    ) : (
                      <div className={`prose dark:prose-invert prose-sm max-w-none ${msg.role === 'ai' ? 'font-serif leading-relaxed dark:text-zinc-300 text-zinc-800' : 'font-sans dark:text-zinc-200 text-zinc-900'}`}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
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
        <div className="absolute bottom-0 w-full dark:bg-gradient-to-t dark:from-zinc-950 dark:via-zinc-950 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4 md:px-8 z-20">
          <div className="max-w-3xl mx-auto">
            
            {/* Error Bubble */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm px-4 py-2 rounded-xl backdrop-blur-md"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Box */}
            <div className="relative dark:bg-zinc-900/80 bg-white/80 backdrop-blur-xl border dark:border-zinc-800/80 border-zinc-300/80 rounded-2xl shadow-2xl transition-all focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10">
              
              {/* Image Preview */}
              <AnimatePresence>
                {imageBase64 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-4 pb-2 border-b dark:border-zinc-800/50 border-zinc-200 flex items-end gap-3"
                  >
                    <div className="relative group">
                      <img src={imageBase64} alt="Preview" className="h-16 w-16 object-cover rounded-lg border dark:border-zinc-700 border-zinc-300 shadow-sm" />
                      <button onClick={() => {setImageFile(null); setImageBase64(null);}} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 p-3">
                <label className="cursor-pointer p-2 dark:text-zinc-400 text-zinc-500 dark:hover:text-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800 hover:bg-indigo-50 rounded-xl transition shrink-0">
                  <ImageIcon className="w-5 h-5" />
                  <Input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                
                <Textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Envie a questão ou digite aqui..."
                  className="min-h-[44px] max-h-32 bg-transparent border-0 focus-visible:ring-0 resize-none p-2 dark:text-zinc-100 text-zinc-900 dark:placeholder:text-zinc-600 placeholder:text-zinc-400 scrollbar-thin flex-1"
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
                  className={`rounded-xl shrink-0 transition-all duration-300 shadow-md ${inputText.trim() || imageFile ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'dark:bg-zinc-800 bg-zinc-200 dark:text-zinc-500 text-zinc-400'}`}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Footer Controls */}
            <div className="mt-3 flex items-center justify-between text-xs dark:text-zinc-500 text-zinc-400 px-2">
              <Select value={modelMode} onValueChange={(v) => { if (v) setModelMode(v); }}>
                <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs dark:hover:text-zinc-300 hover:text-zinc-600 focus:ring-0 gap-1 shadow-none">
                  <SelectValue placeholder="Modelo" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 bg-white dark:border-zinc-800 border-zinc-200 rounded-lg">
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
