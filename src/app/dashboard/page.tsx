"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Menu, X, Plus, Image as ImageIcon, 
  BrainCircuit, AlertCircle, Edit2, Trash2, 
  Check, Sun, Moon, User, 
  Book, Sparkles, LogOut, ChevronDown, PenSquare, ArrowUp, Mic, ShieldCheck,
  Paperclip, Cloud, Camera, Search, FileText
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
};

type GalleryImage = {
  id: string;
  url: string;
  created_at: string;
  conversation_id: string;
};

export default function ExamSolverGrand() {
  const supabase = createClient();
  const router = useRouter();

  // Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [user, setUser] = useState<{ id: string, email?: string } | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  // UI State
  const [activeView, setActiveView] = useState<'chat' | 'notebooks' | 'images'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState("gemini-1.5-flash");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Popovers & Modals
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  
  // Editing State
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // GUEST MODE
        const guestCreds = localStorage.getItem("guestCredits");
        setCredits(guestCreds ? parseInt(guestCreds) : 2);
        return;
      }
      setUser({ id: user.id, email: user.email });

      const { data: profile } = await supabase.from("profiles").select("credits_balance").eq("id", user.id).single();
      if (profile) setCredits(profile.credits_balance);

      const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false });
      if (convs) setConversations(convs);
      
      if (convs && convs.length > 0) loadConversation(convs[0].id);
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, activeView]);

  // Fetch Gallery Images
  useEffect(() => {
    if (activeView === 'images' && user) {
      const fetchImages = async () => {
        // Obter as imagens apenas dos chats atuais do usuário
        const convIds = conversations.map(c => c.id);
        if (convIds.length === 0) {
          setGalleryImages([]);
          return;
        }
        const { data } = await supabase
          .from("messages")
          .select("id, image_url, created_at, conversation_id")
          .in("conversation_id", convIds)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false });
        
        if (data) setGalleryImages(data as GalleryImage[]);
      };
      fetchImages();
    }
  }, [activeView, conversations, user, supabase]);

  // Core Actions
  const loadConversation = async (id: string) => {
    setCurrentConvId(id);
    setActiveView('chat');
    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
    if (msgs) setMessages(msgs);
  };

  const createNewChat = async () => {
    setActiveView('chat');
    if (!user) {
      setCurrentConvId(null);
      setMessages([]);
      return;
    }
    const { data } = await supabase.from("conversations").insert({
      user_id: user.id,
      title: "Novo Atendimento"
    }).select().single();
    if (data) {
      setConversations([data, ...conversations]);
      setCurrentConvId(data.id);
      setMessages([]);
    }
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return setEditingConvId(null);
    const { error } = await supabase.from("conversations").update({ title: editTitle }).eq("id", id);
    if (!error) setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle } : c));
    setEditingConvId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (!error) {
      // Se o chat é apagado, a cascata do banco exclui mensagens e, consequentemente, as imagens somem da galeria!
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

  // Chat Submission
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result as string);
      reader.readAsDataURL(file);
      setIsAttachMenuOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && !imageFile) return;
    if (credits < 1) {
      if (!user) {
        setError("Créditos de teste esgotados. Crie uma conta grátis para continuar!");
        setTimeout(() => router.push("/login"), 3000);
        return;
      }
      return setError("Créditos insuficientes para nova resolução.");
    }

    setIsStreaming(true);
    setError(null);
    let activeConvId = currentConvId;
    
    if (!user) {
      activeConvId = "guest"; 
    } else if (!activeConvId) {
      const { data } = await supabase.from("conversations").insert({
        user_id: user.id,
        title: inputText.trim() ? inputText.slice(0, 30) + "..." : "Resolução de Imagem"
      }).select().single();
      if (data) {
        activeConvId = data.id;
        setConversations([data, ...conversations]);
        setCurrentConvId(activeConvId);
      } else {
        setError("Erro de rede. Tente novamente.");
        setIsStreaming(false);
        return;
      }
    }

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText, image_url: imageBase64 || undefined };
    const tempAiMsgId = "temp-" + Date.now().toString();
    const tempAiMsg: Message = { id: tempAiMsgId, role: 'ai', content: "" };
    
    setMessages(prev => [...prev, newUserMsg, tempAiMsg]);

    const formData = new FormData();
    formData.append("model", modelMode);
    if (activeConvId) formData.append("conversation_id", activeConvId);
    if (inputText) formData.append("text", inputText);
    if (imageFile) formData.append("file", imageFile);

    setInputText("");
    setImageFile(null);
    setImageBase64(null);

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text() || "Erro no servidor.");
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Erro de stream.");
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let streamedData = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          streamedData += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: streamedData } : msg));
        }
      }
      
      setCredits(prev => {
        const newVal = Math.max(0, prev - 1);
        if (!user) localStorage.setItem("guestCredits", newVal.toString());
        return newVal;
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setMessages(prev => prev.filter(msg => msg.id !== tempAiMsgId));
    } finally {
      setIsStreaming(false);
      if (activeConvId && activeConvId !== "guest") loadConversation(activeConvId);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f9f9fa] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-sans overflow-hidden transition-colors duration-500">
      
      {/* ---------------- SIDEBAR ---------------- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 h-full bg-[#f0f0f0] dark:bg-[#1e1e20] flex flex-col z-40 relative shadow-[1px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[1px_0_10px_rgba(0,0,0,0.2)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 mb-2">
              <div className="flex items-center gap-2 px-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-[15px] tracking-tight">ExamSolver</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition md:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="px-3 space-y-1">
              <button onClick={createNewChat} className={`w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-xl transition ${activeView === 'chat' && currentConvId === null ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                <PenSquare className="w-4 h-4" />
                Iniciar novo
              </button>
              <button onClick={() => setActiveView('notebooks')} className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-xl transition ${activeView === 'notebooks' ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                <Book className="w-4 h-4" /> Cadernos de estudo
              </button>
              <button onClick={() => setActiveView('images')} className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-xl transition ${activeView === 'images' ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                <ImageIcon className="w-4 h-4" /> Minhas Imagens
              </button>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto px-3 mt-8 scrollbar-hide">
              <p className="px-3 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Meus Chats</p>
              <div className="space-y-0.5">
                {conversations.map(conv => (
                  <div key={conv.id} onMouseEnter={() => setHoveredConvId(conv.id)} onMouseLeave={() => setHoveredConvId(null)} className="relative">
                    {editingConvId === conv.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-indigo-500/30">
                        <input 
                          autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRename(conv.id)}
                          className="bg-transparent text-[13px] text-zinc-900 dark:text-zinc-100 flex-1 outline-none min-w-0"
                        />
                        <button onClick={() => handleRename(conv.id)} className="text-indigo-500"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => loadConversation(conv.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition flex items-center justify-between ${activeView === 'chat' && currentConvId === conv.id ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40'}`}
                      >
                        <span className="truncate pr-4">{conv.title}</span>
                        {hoveredConvId === conv.id && (
                          <div className="flex items-center gap-1 absolute right-2 bg-zinc-200/70 dark:bg-zinc-800 pl-2">
                            <Edit2 onClick={(e) => { e.stopPropagation(); setEditingConvId(conv.id); setEditTitle(conv.title); }} className="w-3.5 h-3.5 text-zinc-500 hover:text-indigo-500" />
                            <Trash2 onClick={(e) => handleDelete(conv.id, e)} className="w-3.5 h-3.5 text-zinc-500 hover:text-rose-500" />
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/60 space-y-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-3 text-white shadow-lg relative overflow-hidden group cursor-pointer">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-[13px] font-semibold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> ExamSolver Pro</p>
                    <p className="text-[11px] text-blue-100 mt-0.5">{credits} Créditos {user ? 'disponíveis' : 'de teste'}</p>
                  </div>
                  <Button size="sm" onClick={() => !user && router.push("/login")} className="bg-white text-blue-600 hover:bg-zinc-100 h-7 text-xs rounded-lg px-3">Upgrade</Button>
                </div>
              </div>

              <div onClick={() => !user && router.push("/login")} className="flex items-center justify-between px-2 py-2 mt-2 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden max-w-[120px]">
                    {user ? (
                      <>
                        <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-200 truncate">{user?.email?.split('@')[0] || "Usuário"}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                      </>
                    ) : (
                      <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-200 truncate">Iniciar sessão</p>
                    )}
                  </div>
                </div>
                {user && <LogOut onClick={handleSignOut} className="w-4 h-4 text-zinc-400 hover:text-rose-500 transition" />}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ---------------- MAIN AREA ---------------- */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40 dark:opacity-20">
          <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '15s' }} />
          <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        </div>

        {/* Top Navbar */}
        <header className="h-14 flex items-center px-4 relative z-20">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[13px] font-medium text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Conexão Blindada
            </span>
          </div>
        </header>

        {/* ---------------- VIEWS ---------------- */}

        {activeView === 'images' && (
          <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Minhas Imagens</h1>
              <p className="text-zinc-500 mb-8">O histórico completo de imagens enviadas. Se o chat for apagado, a imagem também some.</p>
              
              {!user ? (
                <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200">Faça login para ver suas imagens</h3>
                  <p className="text-zinc-500 mt-2">Convidados não possuem histórico salvo.</p>
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200">Nenhuma imagem enviada</h3>
                  <p className="text-zinc-500 mt-2">As fotos e provas que você enviar nos chats aparecerão aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galleryImages.map(img => (
                    <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group cursor-pointer shadow-sm hover:shadow-md transition">
                      <img src={img.url} alt="Galeria" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm truncate w-full">
                          {new Date(img.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'notebooks' && (
          <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Cadernos de estudo</h1>
              <p className="text-zinc-500 mb-8">Filtre livros, artigos da internet e adicione lógica estruturada ao seu aprendizado.</p>
              
              <div className="relative mb-8">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar nos seus cadernos ou na web..." 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-[15px] shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex gap-4 hover:border-indigo-500/50 transition cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Física Quântica - Resumo</h3>
                    <p className="text-sm text-zinc-500 mt-1">Gerado a partir do Chat "Atendimento de Física". (Exemplo)</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex gap-4 hover:border-indigo-500/50 transition cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Book className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Cálculo II - Integrais</h3>
                    <p className="text-sm text-zinc-500 mt-1">Materiais e links coletados da web. (Exemplo)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 md:px-12 scrollbar-hide z-10 flex flex-col relative">
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-rose-500 text-white text-sm px-4 py-2 rounded-full shadow-lg">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-end max-w-3xl mx-auto w-full pb-10">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    className="text-3xl md:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 text-center"
                  >
                    Como posso ajudar, estudante?
                  </motion.h1>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full space-y-8 pb-40 pt-4">
                  {messages.map((msg, idx) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md mt-1">
                          <BrainCircuit className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'bg-[#f4f4f4] dark:bg-[#2f2f32] text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-3xl rounded-tr-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]' : 'text-zinc-800 dark:text-zinc-200 px-2 py-1'}`}>
                        {msg.image_url && (
                          <div className="mb-3">
                            <img src={msg.image_url} alt="Uploaded" className="max-w-sm w-full rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700" />
                          </div>
                        )}
                        {msg.content === "" && isStreaming && idx === messages.length - 1 ? (
                          <div className="flex items-center gap-2 text-indigo-500 text-sm py-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                          </div>
                        ) : (
                          <div className={`prose dark:prose-invert prose-sm max-w-none ${msg.role === 'ai' ? 'leading-relaxed' : ''}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ---------------- FLOATING INPUT AREA ---------------- */}
            <div className={`left-0 right-0 w-full px-4 md:px-12 transition-all duration-700 z-30 flex flex-col items-center justify-end pointer-events-none ${messages.length === 0 ? 'relative pb-[20vh]' : 'absolute bottom-0 pb-8 bg-gradient-to-t from-[#f9f9fa] via-[#f9f9fa]/80 dark:from-[#131314] dark:via-[#131314]/80 to-transparent'}`}>
              <div className="max-w-3xl w-full pointer-events-auto">
                
                {/* Input Container */}
                <div className="relative bg-white dark:bg-[#1e1e20] border border-zinc-200/80 dark:border-zinc-700/80 rounded-[32px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] transition-all focus-within:shadow-[0_8px_40px_-12px_rgba(79,70,229,0.15)] flex flex-col">
                  
                  {/* Image Preview Area */}
                  <AnimatePresence>
                    {imageBase64 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-6 pt-4 pb-1">
                        <div className="relative inline-block group">
                          <img src={imageBase64} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm" />
                          <button onClick={() => {setImageFile(null); setImageBase64(null);}} className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main Input Row */}
                  <div className="flex items-end gap-2 px-3 py-3">
                    
                    {/* Attachment Dropdown logic */}
                    <div className="relative">
                      <button onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)} className="p-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0">
                        <Plus className="w-5 h-5" />
                      </button>
                      
                      <AnimatePresence>
                        {isAttachMenuOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#252528] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden py-2 z-50"
                          >
                            <button onClick={() => { setIsAttachMenuOpen(false); fileInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left">
                              <Paperclip className="w-4 h-4 text-zinc-500" /> Carregar ficheiros
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left">
                              <Cloud className="w-4 h-4 text-blue-500" /> Adicionar a partir do Drive
                            </button>
                            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                            <button className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left">
                              <span className="flex items-center gap-3"><Camera className="w-4 h-4 text-zinc-500" /> Tirar foto</span>
                              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-zinc-400" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                    
                    <Textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Pergunte qualquer coisa..."
                      className="min-h-[24px] max-h-40 bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-1 text-[15px] dark:text-zinc-100 text-zinc-900 placeholder:text-zinc-400 scrollbar-hide flex-1"
                      rows={1}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    />

                    <div className="flex items-center gap-1 pb-1 pr-1 shrink-0">
                      
                      {/* Model Selector Pill */}
                      <div className="relative">
                        <button onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                          {modelMode === "gemini-1.5-flash" ? "Instant" : "Pro"}
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {isModelDropdownOpen && (
                          <div className="absolute bottom-full right-0 mb-2 w-40 bg-white dark:bg-[#252528] border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1 z-50">
                            <button onClick={() => {setModelMode("gemini-1.5-flash"); setIsModelDropdownOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700">Instant (Rápido)</button>
                            <button onClick={() => {setModelMode("gemini-1.5-pro"); setIsModelDropdownOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700">Pro (Complexo)</button>
                          </div>
                        )}
                      </div>

                      <button className="p-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                        <Mic className="w-5 h-5" />
                      </button>

                      <button 
                        onClick={handleSubmit}
                        disabled={isStreaming || (!inputText.trim() && !imageFile)}
                        className={`p-2.5 rounded-full transition-all duration-300 shadow-sm ml-1 ${inputText.trim() || imageFile ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'}`}
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtext */}
                <p className="text-center text-[11.5px] text-zinc-400 dark:text-zinc-500 mt-4 font-medium px-4">
                  A IA pode cometer erros. Ao usar o ExamSolver, você concorda com nossos <button onClick={() => setIsPrivacyOpen(true)} className="underline hover:text-zinc-600 dark:hover:text-zinc-300">Termos</button> e <button onClick={() => setIsPrivacyOpen(true)} className="underline hover:text-zinc-600 dark:hover:text-zinc-300">Política de privacidade</button>.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ---------------- PRIVACY MODAL ---------------- */}
      <AnimatePresence>
        {isPrivacyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#1e1e20] w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800/60">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Política de Privacidade</h2>
                <button onClick={() => setIsPrivacyOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300">
                <h3>Introdução</h3>
                <p>Bem-vindo ao Exam Solver AI, uma plataforma avançada de assistência acadêmica criada por <strong>José Escrivão</strong>. Nossa prioridade é garantir a precisão e a segurança absoluta dos seus dados durante a resolução de exames e perguntas.</p>
                
                <h3>Dados Coletados e Sua Exclusão (Cascata)</h3>
                <p>Quando você utiliza nossos serviços, armazenamos temporariamente suas <strong>imagens, textos e cadernos de estudo</strong> para fornecer continuidade nos chats. No entanto, aplicamos uma rigorosa política de <em>Cascade Delete</em> (Exclusão em Cascata). <strong>Isso significa que, assim que você exclui um chat, todos os registros, imagens e análises associadas a ele são sumariamente apagados de nossos servidores, de forma irreversível.</strong></p>
                
                <h3>Uso da Inteligência Artificial</h3>
                <p>O envio de imagens e perguntas é processado por motores de inteligência artificial de ponta (Gemini-Vision). O conteúdo que você envia não é utilizado para treinar nossos modelos publicamente, sendo restrito apenas à sua sessão de estudo.</p>

                <h3>Cadernos de Estudo e "Minhas Imagens"</h3>
                <p>As visões de "Cadernos de Estudo" e "Minhas Imagens" funcionam apenas como um reflexo dos seus chats ativos. A privacidade é garantida pelo modelo: apagar a origem apaga o reflexo.</p>

                <h3>Contato</h3>
                <p>Se tiver dúvidas sobre nossa blindagem de dados ou sugerir melhorias no sistema, sinta-se à vontade para nos contactar. Exam Solver AI, focado na sua vitória acadêmica de forma segura.</p>
              </div>
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/60 flex justify-end bg-zinc-50 dark:bg-[#1a1a1c]">
                <Button onClick={() => setIsPrivacyOpen(false)} className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8">
                  Concordar e Fechar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
