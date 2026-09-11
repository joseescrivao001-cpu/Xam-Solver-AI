"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { 
  Menu, X, Plus, Image as ImageIcon, 
  BrainCircuit, AlertCircle, Edit2, Trash2, 
  Check, Sun, Moon, User, 
  Book, Sparkles, LogOut, ChevronDown, PenSquare, ArrowUp, Mic, ShieldCheck,
  Paperclip, Cloud, Camera, Search, Settings, Folder, FolderPlus,
  RefreshCw, Key, Activity, Upload, Loader2, Crown, Zap
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import useDrivePicker from 'react-google-drive-picker';
import PricingModal from "@/components/pricing-modal";

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

type Notebook = {
  id: string;
  name: string;
  color: string;
  created_at?: string;
};

export default function ExamSolverGrand() {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'ultra' | 'premium' | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [user, setUser] = useState<{ id: string, email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [newAvatarInput, setNewAvatarInput] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  // UI State
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeView, setActiveView] = useState<'chat' | 'notebooks' | 'images'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState("gemini-3.6-flash");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adaptive Sidebar & Persistence
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      const saved = localStorage.getItem("sidebar_open");
      if (saved !== null) {
        setIsSidebarOpen(saved === "true");
      } else {
        setIsSidebarOpen(!mobile);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = (open: boolean) => {
    setIsSidebarOpen(open);
    localStorage.setItem("sidebar_open", open ? "true" : "false");
  };

  // Notebooks State (CRUD & Linking)
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [notebookFilter, setNotebookFilter] = useState<string | null>(null);
  const [isNewNotebookModalOpen, setIsNewNotebookModalOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookColor, setNewNotebookColor] = useState("indigo");
  const [convNotebookMap, setConvNotebookMap] = useState<Record<string, string>>({});
  const [movingConvId, setMovingConvId] = useState<string | null>(null);

  // Settings & Account Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isRefreshingCredits, setIsRefreshingCredits] = useState(false);

  // Gallery Modal State
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);

  // Google Drive Modal State
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  
  // Auto-dismiss toasts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Popovers, Modals & Refs
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  
  const attachRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Editing State
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);

  // APIs State
  const [openDrivePicker] = useDrivePicker();
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize Data
  useEffect(() => {
    const initData = async () => {
      setIsDataLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // GUEST MODE
        const guestCreds = localStorage.getItem("guestCredits");
        setCredits(guestCreds ? parseInt(guestCreds) : 2);
        setUserPlan("free");
        setIsProfileLoaded(true);
        loadNotebooksState("guest");
        setIsDataLoading(false);
        return;
      }
      setUser({ id: user.id, email: user.email });

      // Sincronizar dados do Perfil via API interna com service_role (robusto contra RLS)
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.ok) {
          const { profile, user: profileUser } = await res.json();
          if (profile) {
            if (profile.credits_balance !== undefined && profile.credits_balance !== null) {
              setCredits(profile.credits_balance);
            }
            if (profile.plan_type) {
              setUserPlan(profile.plan_type as 'free' | 'pro' | 'ultra' | 'premium');
            } else {
              setUserPlan("free");
            }
            if (profile.is_admin) {
              setIsAdmin(true);
            }
            if (profile.avatar_url) {
              setUserAvatar(profile.avatar_url);
            } else if (profileUser?.googleAvatar) {
              setUserAvatar(profileUser.googleAvatar);
            }
            if (profile.full_name) {
              setUserFullName(profile.full_name);
            } else if (profileUser?.googleName) {
              setUserFullName(profileUser.googleName);
            }
          }
        }
      } catch (err) {
        console.warn("[INIT_PROFILE_FETCH_WARN]", err);
      } finally {
        setIsProfileLoaded(true);
      }

      // Carregar histórico de conversas do usuário autenticado via API interna segura
      let loadedConvs: Conversation[] = [];
      try {
        const convRes = await fetch("/api/chat/conversations", { cache: "no-store" });
        if (convRes.ok) {
          const { conversations: convs } = await convRes.json();
          if (convs && Array.isArray(convs)) {
            loadedConvs = convs;
          }
        }
      } catch (err) {
        console.warn("[INIT_CONVS_FETCH_WARN]", err);
      }

      // Fallback para o client
      if (loadedConvs.length === 0) {
        const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false });
        if (convs) loadedConvs = convs;
      }

      setConversations(loadedConvs);
      loadNotebooksState(user.id);

      if (loadedConvs.length > 0) {
        loadConversation(loadedConvs[0].id);
      }
      setIsDataLoading(false);
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  // Load Notebooks and Map from LocalStorage
  const loadNotebooksState = (userId: string) => {
    const key = `user_notebooks_${userId}`;
    const mapKey = `conv_notebook_map_${userId}`;
    
    try {
      const savedMap = localStorage.getItem(mapKey);
      if (savedMap) setConvNotebookMap(JSON.parse(savedMap));
    } catch {}

    try {
      const savedNbs = localStorage.getItem(key);
      if (savedNbs) {
        setNotebooks(JSON.parse(savedNbs));
      } else {
        const defaults: Notebook[] = [
          { id: "nb-fisica", name: "Física & Mecânica", color: "indigo", created_at: new Date().toISOString() },
          { id: "nb-calculo", name: "Cálculo & Matemática", color: "emerald", created_at: new Date().toISOString() },
          { id: "nb-quimica", name: "Química Orgânica", color: "amber", created_at: new Date().toISOString() },
          { id: "nb-bio", name: "Biologia & Saúde", color: "rose", created_at: new Date().toISOString() },
        ];
        setNotebooks(defaults);
        localStorage.setItem(key, JSON.stringify(defaults));
      }
    } catch {}
  };

  const saveNotebooks = (updated: Notebook[]) => {
    setNotebooks(updated);
    try {
      localStorage.setItem(`user_notebooks_${user?.id || "guest"}`, JSON.stringify(updated));
    } catch {}
  };

  const createNotebook = () => {
    if (!newNotebookName.trim()) return;
    const newNb: Notebook = {
      id: "nb-" + Date.now().toString(),
      name: newNotebookName.trim(),
      color: newNotebookColor || "indigo",
      created_at: new Date().toISOString()
    };
    const updated = [newNb, ...notebooks];
    saveNotebooks(updated);
    setIsNewNotebookModalOpen(false);
    setNewNotebookName("");
  };

  const deleteNotebook = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notebooks.filter(nb => nb.id !== id);
    saveNotebooks(updated);
    if (activeNotebookId === id) setActiveNotebookId(null);
  };

  const moveConversationToNotebook = (convId: string, nbId: string | null) => {
    const mapKey = `conv_notebook_map_${user?.id || "guest"}`;
    const newMap = { ...convNotebookMap };
    if (nbId) {
      newMap[convId] = nbId;
    } else {
      delete newMap[convId];
    }
    setConvNotebookMap(newMap);
    try {
      localStorage.setItem(mapKey, JSON.stringify(newMap));
    } catch {}
    setMovingConvId(null);
  };

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setIsAttachMenuOpen(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setIsModelDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, activeView]);

  // Fetch Gallery Images
  const fetchGalleryImages = async () => {
    const imagesList: GalleryImage[] = [];

    // 1. LocalStorage cached uploads
    try {
      const cached = localStorage.getItem(`user_images_${user?.id || "guest"}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          imagesList.push(...parsed);
        }
      }
    } catch {}

    // 2. Query messages with image_url
    if (user && conversations.length > 0) {
      const convIds = conversations.map(c => c.id);
      try {
        const { data: msgData } = await supabase
          .from("messages")
          .select("id, image_url, created_at, conversation_id")
          .in("conversation_id", convIds)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false });

        if (msgData) {
          for (const item of msgData) {
            if (item.image_url && !imagesList.some(img => img.url === item.image_url)) {
              imagesList.push({
                id: item.id,
                url: item.image_url,
                created_at: item.created_at,
                conversation_id: item.conversation_id
              });
            }
          }
        }
      } catch {}

      // 3. Query exams table
      try {
        const { data: examData } = await supabase
          .from("exams")
          .select("id, image_url, created_at")
          .eq("user_id", user.id)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false });

        if (examData) {
          for (const item of examData) {
            if (item.image_url && !imagesList.some(img => img.url === item.image_url)) {
              imagesList.push({
                id: item.id,
                url: item.image_url,
                created_at: item.created_at,
                conversation_id: conversations[0]?.id || ""
              });
            }
          }
        }
      } catch {}
    }

    setGalleryImages(imagesList);
  };

  useEffect(() => {
    if (activeView === 'images') {
      fetchGalleryImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, conversations, user]);

  // Core Actions
  const loadConversation = async (id: string) => {
    setCurrentConvId(id);
    setActiveView('chat');
    try {
      const res = await fetch(`/api/chat/messages?conversation_id=${id}`, { cache: "no-store" });
      if (res.ok) {
        const { messages: msgs } = await res.json();
        if (msgs && Array.isArray(msgs)) {
          setMessages(msgs);
          return;
        }
      }
    } catch {}

    // Fallback direto via Supabase client
    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
    if (msgs) setMessages(msgs);
  };

  const createNewChat = async (targetNotebookId?: string | null) => {
    setActiveView('chat');
    if (!user) {
      setCurrentConvId(null);
      setMessages([]);
      return;
    }

    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Novo Atendimento" })
      });
      if (res.ok) {
        const { conversation: data } = await res.json();
        if (data) {
          setConversations(prev => [data, ...prev]);
          setCurrentConvId(data.id);
          setMessages([]);

          const assignNb = targetNotebookId !== undefined ? targetNotebookId : activeNotebookId;
          if (assignNb) {
            moveConversationToNotebook(data.id, assignNb);
          }
          return;
        }
      }
    } catch {}

    // Fallback
    const { data } = await supabase.from("conversations").insert({
      user_id: user.id,
      title: "Novo Atendimento"
    }).select().single();
    if (data) {
      setConversations(prev => [data, ...prev]);
      setCurrentConvId(data.id);
      setMessages([]);

      // Auto-assign to active or target notebook
      const assignNb = targetNotebookId !== undefined ? targetNotebookId : activeNotebookId;
      if (assignNb) {
        moveConversationToNotebook(data.id, assignNb);
      }
    }
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return setEditingConvId(null);
    const newTitle = editTitle.trim();
    try {
      await fetch("/api/chat/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: newTitle })
      });
    } catch {}
    supabase.from("conversations").update({ title: newTitle }).eq("id", id).then();
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    setEditingConvId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/conversations?id=${id}`, { method: "DELETE" });
    } catch {}
    supabase.from("conversations").delete().eq("id", id).then();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConvId === id) { 
      setCurrentConvId(null); 
      setMessages([]); 
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const refreshCredits = async () => {
    if (!user) return;
    setIsRefreshingCredits(true);
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      if (res.ok) {
        const { profile, user: profileUser } = await res.json();
        if (profile) {
          if (profile.credits_balance !== undefined && profile.credits_balance !== null) setCredits(profile.credits_balance);
          if (profile.plan_type) setUserPlan(profile.plan_type as 'free' | 'pro' | 'ultra' | 'premium');
          if (profile.is_admin) setIsAdmin(true);
          if (profile.avatar_url) setUserAvatar(profile.avatar_url);
          else if (profileUser?.googleAvatar) setUserAvatar(profileUser.googleAvatar);
          if (profile.full_name) setUserFullName(profile.full_name);
          else if (profileUser?.googleName) setUserFullName(profileUser.googleName);
          setSettingsMessage("Saldo de créditos e plano sincronizados com sucesso!");
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsRefreshingCredits(false);
  };

  const handleSaveAvatar = async (urlToSave?: string) => {
    const avatarUrl = urlToSave || newAvatarInput;
    if (!avatarUrl.trim()) return;
    setIsSavingAvatar(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: avatarUrl.trim() }),
      });
      if (res.ok) {
        setUserAvatar(avatarUrl.trim());
        setIsAvatarModalOpen(false);
        setNewAvatarInput("");
      }
    } catch (err) {
      console.error("Erro ao salvar avatar:", err);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleSaveAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) {
      setSettingsMessage(`Erro: ${error.message}`);
    } else {
      setSettingsMessage("E-mail de recuperação de senha enviado com sucesso!");
    }
  };

  // Google Drive Integration
  const handleDrivePicker = () => {
    setIsAttachMenuOpen(false);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
    
    if (!clientId || !apiKey) {
      // Abre o modal universal do Google Drive para inserção rápida
      setIsDriveModalOpen(true);
      return;
    }
    
    openDrivePicker({
      clientId: clientId,
      developerKey: apiKey,
      viewId: "DOCS_IMAGES",
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: false,
      callbackFunction: async (data) => {
        if (data.action === 'picked' && data.docs && data.docs.length > 0) {
          const doc = data.docs[0];
          const thumbUrl = `https://lh3.googleusercontent.com/d/${doc.id}`;
          setImageBase64(thumbUrl);
          setInputText(prev => prev ? `${prev} [Arquivo Drive: ${doc.name}]` : `Resolva a questão deste arquivo do Google Drive: ${doc.name}`);
        }
      },
    });
  };

  const handleDriveUrlSubmit = () => {
    if (!driveUrlInput.trim()) return;
    const match = driveUrlInput.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrlInput.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      const directThumb = `https://lh3.googleusercontent.com/d/${fileId}`;
      setImageBase64(directThumb);
      setInputText(prev => prev ? `${prev} [Arquivo Google Drive]` : "Resolva a questão anexada do Google Drive.");
      setIsDriveModalOpen(false);
      setDriveUrlInput("");
    } else {
      setError("Link inválido. Insira um link de compartilhamento válido do Google Drive.");
    }
  };

  // Microphone (Speech Recognition)
  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + (prev ? " " : "") + transcript);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
      setError("Permissão de microfone negada ou indisponível.");
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // Camera / Webcam
  const startCamera = async () => {
    setIsAttachMenuOpen(false);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setIsCameraOpen(false);
      setError("Permissão de câmera negada ou dispositivo indisponível.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImageBase64(reader.result as string);
            reader.readAsDataURL(file);
          }
        }, "image/jpeg");
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
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
    if (!inputText.trim() && !imageFile && !imageBase64) return;
    if (credits < 1) {
      if (!user) {
        setError("Créditos de teste esgotados. Crie uma conta grátis para continuar!");
        setTimeout(() => router.push("/login"), 3000);
        return;
      }
      setIsPricingOpen(true);
      return setError("Créditos insuficientes. Escolha um plano para recarregar seus créditos instantaneamente.");
    }

    setIsStreaming(true);
    setError(null);
    let activeConvId = currentConvId;
    
    if (!user) {
      activeConvId = "guest"; 
    } else if (!activeConvId) {
      const convTitle = inputText.trim() ? inputText.slice(0, 30) + "..." : "Resolução de Imagem";
      try {
        const convRes = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: convTitle }),
        });
        if (convRes.ok) {
          const { conversation: created } = await convRes.json();
          if (created) {
            activeConvId = created.id;
            setConversations(prev => [created, ...prev]);
            setCurrentConvId(activeConvId);
            if (activeNotebookId) {
              moveConversationToNotebook(created.id, activeNotebookId);
            }
          }
        }
      } catch (err) {
        console.warn("[CONV_API_CREATE_WARN]", err);
      }

      if (!activeConvId) {
        const { data } = await supabase.from("conversations").insert({
          user_id: user.id,
          title: convTitle
        }).select().single();
        if (data) {
          activeConvId = data.id;
          setConversations(prev => [data, ...prev]);
          setCurrentConvId(activeConvId);

          if (activeNotebookId) {
            moveConversationToNotebook(data.id, activeNotebookId);
          }
        }
      }
    }

    const currentBase64 = imageBase64;
    const newUserMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: inputText, 
      image_url: currentBase64 || undefined 
    };
    const tempAiMsgId = "temp-" + Date.now().toString();
    const tempAiMsg: Message = { id: tempAiMsgId, role: 'ai', content: "" };
    
    setMessages(prev => [...prev, newUserMsg, tempAiMsg]);

    // Save image to local gallery cache immediately
    if (currentBase64) {
      try {
        const key = `exam_solver_gallery_${user?.id || 'guest'}`;
        const saved = localStorage.getItem(key);
        const list: GalleryImage[] = saved ? JSON.parse(saved) : [];
        const newImg: GalleryImage = {
          id: "img-" + Date.now(),
          url: currentBase64,
          created_at: new Date().toISOString(),
          conversation_id: activeConvId || ""
        };
        list.unshift(newImg);
        localStorage.setItem(key, JSON.stringify(list.slice(0, 60)));
      } catch {}
    }

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
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 403 || errorText.includes("UPGRADE_REQUIRED") || errorText.toLowerCase().includes("plano ultra")) {
          setIsPricingOpen(true);
          throw new Error("Este recurso exige o Plano Ultra ou Premium. Faça o upgrade para desbloquear!");
        }
        throw new Error(errorText || "Erro no servidor.");
      }

      const returnedConvId = res.headers.get("X-Conversation-Id");
      if (returnedConvId && returnedConvId !== "guest" && returnedConvId !== activeConvId) {
        activeConvId = returnedConvId;
        setCurrentConvId(returnedConvId);
      }
      
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
      
      if (userPlan !== 'premium') {
        setCredits(prev => {
          const newVal = Math.max(0, prev - 1);
          if (!user) localStorage.setItem("guestCredits", newVal.toString());
          return newVal;
        });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setMessages(prev => prev.filter(msg => msg.id !== tempAiMsgId));
    } finally {
      setIsStreaming(false);
      if (activeConvId && activeConvId !== "guest") {
        loadConversation(activeConvId);
        fetch("/api/chat/conversations")
          .then(r => r.json())
          .then(d => {
            if (d?.conversations && Array.isArray(d.conversations)) {
              setConversations(d.conversations);
            }
          })
          .catch(() => {});
      }
    }
  };

  // Filter Conversations by Active Notebook and Title Search
  const filteredConversations = conversations.filter(conv => {
    const matchesNotebook = activeNotebookId ? convNotebookMap[conv.id] === activeNotebookId : true;
    const matchesSearch = notebookFilter ? conv.title.toLowerCase().includes(notebookFilter.toLowerCase()) : true;
    return matchesNotebook && matchesSearch;
  });

  const activeNotebookObj = notebooks.find(nb => nb.id === activeNotebookId);

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 text-[#1f1f1f] dark:text-[#e3e3e3] font-sans overflow-hidden transition-colors duration-500">
      
      {/* ---------------- SIDEBAR (ADAPTIVE DRAWER) ---------------- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            {isMobile && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => toggleSidebar(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              />
            )}

            {/* Sidebar Drawer */}
            <motion.aside 
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className={`h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col z-50 shadow-2xl lg:shadow-none w-[280px] ${
                isMobile ? "fixed inset-y-0 left-0" : "relative flex-shrink-0"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 mb-1">
                <div className="flex items-center gap-2 px-2 cursor-pointer" onClick={() => { setActiveView('chat'); if(isMobile) toggleSidebar(false); }}>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                    <BrainCircuit className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-[15px] tracking-tight">ExamSolver</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleSidebar(false)} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition" title="Fechar Menu">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Main Nav Actions */}
            <div className="px-3 space-y-1">
              <button onClick={() => { createNewChat(); if (isMobile) toggleSidebar(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-xl transition ${activeView === 'chat' && currentConvId === null ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                <PenSquare className="w-4 h-4 text-indigo-500" />
                Iniciar novo
              </button>
              <button onClick={() => { setActiveView('notebooks'); setNotebookFilter(null); if (isMobile) toggleSidebar(false); }} className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-xl transition ${activeView === 'notebooks' ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                <Book className="w-4 h-4 text-emerald-500" /> Cadernos de estudo
              </button>
              <button onClick={() => { setActiveView('images'); fetchGalleryImages(); if (isMobile) toggleSidebar(false); }} className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-xl transition ${activeView === 'images' ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                <ImageIcon className="w-4 h-4 text-blue-500" /> Minhas Imagens
              </button>
            </div>

            {/* Notebook Quick Filter Chips */}
            <div className="px-3 mt-4">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Cadernos</span>
                <button onClick={() => setIsNewNotebookModalOpen(true)} className="p-1 text-zinc-400 hover:text-indigo-500 rounded transition" title="Criar novo caderno">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                  onClick={() => setActiveNotebookId(null)}
                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium whitespace-nowrap transition ${activeNotebookId === null ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}`}
                >
                  Todos
                </button>
                {notebooks.map(nb => (
                  <button 
                    key={nb.id}
                    onClick={() => setActiveNotebookId(activeNotebookId === nb.id ? null : nb.id)}
                    className={`px-2 py-0.5 text-[11px] rounded-md font-medium whitespace-nowrap transition flex items-center gap-1 ${activeNotebookId === nb.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${nb.color === 'emerald' ? 'bg-emerald-500' : nb.color === 'amber' ? 'bg-amber-500' : nb.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    {nb.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto px-3 mt-3 scrollbar-hide">
              <div className="flex items-center justify-between mb-2 px-3">
                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  {activeNotebookObj ? `Caderno: ${activeNotebookObj.name}` : "Meus Chats"}
                </p>
                {activeNotebookId && (
                  <span className="text-[10px] text-indigo-500 hover:underline cursor-pointer" onClick={() => setActiveNotebookId(null)}>
                    Ver todos
                  </span>
                )}
              </div>
              
              <div className="space-y-0.5">
                {isDataLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-9 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg animate-pulse mb-1"></div>
                  ))
                ) : filteredConversations.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Nenhuma conversa neste caderno.
                  </div>
                ) : filteredConversations.map(conv => {
                  const assignedNbId = convNotebookMap[conv.id];
                  const assignedNb = notebooks.find(n => n.id === assignedNbId);

                  return (
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
                          onClick={() => { loadConversation(conv.id); if (isMobile) toggleSidebar(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition flex items-center justify-between ${activeView === 'chat' && currentConvId === conv.id ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40'}`}
                        >
                          <div className="flex items-center gap-2 truncate pr-4">
                            {assignedNb && (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${assignedNb.color === 'emerald' ? 'bg-emerald-500' : assignedNb.color === 'amber' ? 'bg-amber-500' : assignedNb.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'}`} title={`Caderno: ${assignedNb.name}`} />
                            )}
                            <span className="truncate">{conv.title}</span>
                          </div>
                          {hoveredConvId === conv.id && (
                            <div className="flex items-center gap-1.5 absolute right-2 bg-zinc-200/90 dark:bg-zinc-800/90 px-1.5 py-1 rounded shadow-sm">
                              <button onClick={(e) => { e.stopPropagation(); setMovingConvId(conv.id); }} title="Mover para outro caderno" className="text-zinc-500 hover:text-indigo-500">
                                <Folder className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingConvId(conv.id); setEditTitle(conv.title); }} title="Renomear" className="text-zinc-500 hover:text-indigo-500">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => handleDelete(conv.id, e)} title="Excluir" className="text-zinc-500 hover:text-rose-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Profile / Settings Trigger */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/60 space-y-2">
              {!isProfileLoaded ? (
                <div className="rounded-2xl p-3.5 bg-zinc-200/40 dark:bg-zinc-800/40 border border-zinc-300/30 dark:border-zinc-700/30 animate-pulse space-y-2">
                  <div className="h-3.5 w-24 bg-zinc-300/60 dark:bg-zinc-700/60 rounded" />
                  <div className="h-3 w-32 bg-zinc-300/40 dark:bg-zinc-700/40 rounded" />
                </div>
              ) : (
                <div 
                  onClick={() => setIsPricingOpen(true)} 
                  className={`rounded-2xl p-3.5 text-white shadow-lg relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] ${
                    userPlan === 'premium' 
                      ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 border border-amber-400/30' 
                      : userPlan === 'pro'
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 border border-indigo-400/30'
                      : 'bg-zinc-800/80 border border-zinc-700/60'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold flex items-center gap-1 truncate">
                        {userPlan === 'premium' ? (
                          <><Crown className="w-3.5 h-3.5 text-amber-200 shrink-0"/> VIP Ilimitado</>
                        ) : userPlan === 'pro' ? (
                          <><Sparkles className="w-3.5 h-3.5 text-blue-200 shrink-0"/> Plano Pro</>
                        ) : (
                          <><Zap className="w-3.5 h-3.5 text-zinc-300 shrink-0"/> Plano Free</>
                        )}
                      </p>
                      <p className="text-[11px] text-white/80 mt-0.5 truncate">
                        {userPlan === 'premium' 
                          ? 'Créditos Ilimitados' 
                          : `${credits.toLocaleString("pt-AO")} Créditos ${user ? 'ativos' : 'de teste'}`}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setIsPricingOpen(true); }} 
                      className="bg-white text-zinc-900 hover:bg-zinc-100 h-7 text-xs rounded-lg px-2.5 font-bold shadow-sm shrink-0"
                    >
                      {userPlan === 'premium' ? 'Planos' : 'Upgrade'}
                    </Button>
                  </div>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold shadow-sm hover:brightness-110 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Painel de Administração
                </button>
              )}

              <div onClick={() => user ? setIsSettingsOpen(true) : router.push("/login")} className="flex items-center justify-between px-2 py-2 mt-2 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-xl transition">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    onClick={(e) => {
                      if (user) {
                        e.stopPropagation();
                        setIsAvatarModalOpen(true);
                      }
                    }}
                    className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-indigo-500/40 hover:ring-2 ring-indigo-500 transition cursor-pointer"
                    title="Clique para trocar sua foto"
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {userFullName ? userFullName.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    {user ? (
                      <>
                        <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-200 truncate">{userFullName || user?.email?.split('@')[0] || "Estudante"}</p>
                        <p className="text-[11px] text-zinc-500 truncate" title={user?.email}>{user?.email}</p>
                      </>
                    ) : (
                      <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-200 truncate">Iniciar sessão</p>
                    )}
                  </div>
                </div>
                {user ? (
                  <button onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }} className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded-lg transition shrink-0" title="Configurações de Conta">
                    <Settings className="w-4 h-4" />
                  </button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => router.push("/login")}>Entrar</Button>
                )}
              </div>

              {isAdmin && (
                <Link
                  href="/system-check"
                  className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition"
                >
                  <Activity className="w-3 h-3 text-indigo-400" />
                  Diagnóstico do Sistema
                </Link>
              )}
            </div>
          </motion.aside>
        </>
      )}
      </AnimatePresence>

      {/* ---------------- MAIN AREA ---------------- */}
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40 dark:opacity-20">
          <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 dark:bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '15s' }} />
          <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-violet-400/20 dark:bg-violet-600/30 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        </div>

        {/* Top Navbar */}
        <header className="h-14 flex items-center px-4 relative z-20 shrink-0 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
          {(!isSidebarOpen || isMobile) && (
            <button 
              onClick={() => toggleSidebar(true)} 
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition mr-2 flex items-center gap-1.5"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Active Notebook Indicator in Chat */}
          {activeNotebookObj && activeView === 'chat' && (
            <div className="flex items-center gap-2 ml-3 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <span className={`w-2 h-2 rounded-full ${activeNotebookObj.color === 'emerald' ? 'bg-emerald-500' : activeNotebookObj.color === 'amber' ? 'bg-amber-500' : activeNotebookObj.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
              <span>Caderno: <strong>{activeNotebookObj.name}</strong></span>
              <button onClick={() => setActiveNotebookId(null)} className="hover:text-rose-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {!isProfileLoaded ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-36 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse border border-zinc-300/30 dark:border-zinc-700/30" />
                <div className="hidden sm:inline-block h-8 w-20 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
              </div>
            ) : (
              <>
                <button onClick={() => setIsPricingOpen(true)} className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {userPlan === 'premium' ? '✨ Créditos Ilimitados (PREMIUM)' : `${credits.toLocaleString("pt-AO")} Créditos (${(userPlan || 'free').toUpperCase()})`}
                  </span>
                </button>
                {userPlan !== 'premium' ? (
                  <button onClick={() => setIsPricingOpen(true)} className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm transition items-center gap-1.5 cursor-pointer">
                    <Sparkles className="w-3 h-3" />
                    Upgrade
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> VIP Ilimitado
                  </span>
                )}
              </>
            )}
            <span className="text-[13px] font-medium text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Conexão Blindada
            </span>
          </div>
        </header>

        {/* ---------------- VIEWS ---------------- */}

        {/* 1. VIEW: MINHAS IMAGENS */}
        {activeView === 'images' && (
          <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10 scrollbar-hide">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Minhas Imagens</h1>
                <Button onClick={fetchGalleryImages} variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar Galeria
                </Button>
              </div>
              <p className="text-zinc-500 mb-8">Todas as imagens de provas, exames e capturas de tela enviadas para a IA. Clique em qualquer imagem para reutilizar ou examinar.</p>
              
              {galleryImages.length === 0 ? (
                <div className="p-16 text-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200">Sua galeria está vazia</h3>
                  <p className="text-zinc-500 mt-2 text-sm max-w-md mx-auto">
                    Assim que você enviar fotos de provas pelo chat, tirar fotos na câmera ou importar do Drive, elas ficarão salvas e acessíveis aqui.
                  </p>
                  <Button onClick={() => setActiveView('chat')} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                    Enviar primeira imagem
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galleryImages.map(img => (
                    <div 
                      key={img.id} 
                      onClick={() => setSelectedGalleryImage(img)} 
                      className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group cursor-pointer shadow-sm hover:shadow-xl transition-all"
                    >
                      <Image src={img.url} alt="Galeria" fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <span className="text-white text-xs font-semibold truncate">Imagem de Estudo</span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-white/80 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            Ver Opções
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. VIEW: CADERNOS DE ESTUDO */}
        {activeView === 'notebooks' && (
          <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10 scrollbar-hide">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Cadernos de Estudo</h1>
                <Button onClick={() => setIsNewNotebookModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 text-sm shadow-md">
                  <FolderPlus className="w-4 h-4" /> Criar Novo Caderno
                </Button>
              </div>
              <p className="text-zinc-500 mb-8">Organize suas matérias, provas e resoluções em pastas temáticas inteligentes com isolamento de contexto.</p>
              
              <div className="relative mb-8">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  onChange={(e) => setNotebookFilter(e.target.value)}
                  placeholder="Pesquisar nos seus cadernos de estudo..." 
                  className="w-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-[15px] shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {notebooks.map(nb => {
                  const count = conversations.filter(c => convNotebookMap[c.id] === nb.id).length;
                  const colorBg = nb.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : nb.color === 'amber' ? 'bg-amber-500/10 text-amber-500' : nb.color === 'rose' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500';

                  return (
                    <div 
                      key={nb.id}
                      className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between hover:shadow-lg transition group relative"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl ${colorBg} flex items-center justify-center shrink-0 shadow-sm`}>
                            <Folder className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg group-hover:text-indigo-500 transition">{nb.name}</h3>
                            <p className="text-xs text-zinc-500 mt-1">{count} {count === 1 ? 'conversa associada' : 'conversas associadas'}</p>
                          </div>
                        </div>
                        <button onClick={(e) => deleteNotebook(nb.id, e)} className="p-2 text-zinc-400 hover:text-rose-500 transition rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Excluir caderno">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <Button 
                          onClick={() => { setActiveNotebookId(nb.id); setActiveView('chat'); }} 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl text-xs"
                        >
                          Ver Conversas
                        </Button>
                        <Button 
                          onClick={() => createNewChat(nb.id)} 
                          size="sm" 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Chat Aqui
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. VIEW: CHAT & RESOLUTION */}
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

              {isDataLoading ? (
                <div className="max-w-4xl mx-auto w-full space-y-8 pb-40 pt-10">
                  <div className="flex gap-4 justify-end">
                    <div className="w-48 h-12 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl rounded-tr-sm animate-pulse"></div>
                  </div>
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse shrink-0 mt-1"></div>
                    <div className="w-full max-w-lg h-32 bg-zinc-200/40 dark:bg-zinc-800/40 rounded-2xl rounded-tl-sm animate-pulse"></div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full pb-20">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                      <BrainCircuit className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                      Como posso te ajudar hoje?
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base max-w-md mx-auto">
                      Envie uma imagem de prova, questão de concurso ou digite seu exercício para resolução acadêmica com precisão zero-alucinação.
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full space-y-8 pb-44 pt-6">
                  {messages.map((msg, idx) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md mt-1">
                          <BrainCircuit className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm' : 'text-zinc-800 dark:text-zinc-200 px-2 py-1'}`}>
                        {msg.image_url && (
                          <div className="mb-3 cursor-pointer group" onClick={() => setSelectedGalleryImage({ id: msg.id, url: msg.image_url!, created_at: '', conversation_id: currentConvId || '' })}>
                            <Image src={msg.image_url!} alt="Uploaded" width={400} height={400} unoptimized className="max-w-sm w-full h-auto rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 group-hover:opacity-95 transition" />
                          </div>
                        )}
                        {msg.content === "" && isStreaming && idx === messages.length - 1 ? (
                          <div className="flex items-center gap-2 text-indigo-500 text-sm py-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                          </div>
                        ) : (
                          <div className={`prose dark:prose-invert prose-sm max-w-none font-serif ${msg.role === 'ai' ? 'leading-relaxed' : ''}`}>
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
            <div className={`left-0 right-0 w-full px-4 md:px-12 transition-all duration-700 z-30 flex flex-col items-center justify-end pointer-events-none ${messages.length === 0 ? 'relative pb-[15vh]' : 'absolute bottom-0 pb-8 bg-gradient-to-t from-zinc-50 via-zinc-50/80 dark:from-zinc-950 dark:via-zinc-950/80 to-transparent'}`}>
              <div className="max-w-3xl w-full pointer-events-auto">
                
                {/* Input Container */}
                <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] transition-all focus-within:shadow-[0_8px_40px_-12px_rgba(79,70,229,0.15)] flex flex-col">
                  
                  {/* Image Preview Area */}
                  <AnimatePresence>
                    {imageBase64 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-6 pt-4 pb-1">
                        <div className="relative inline-block group">
                          <Image src={imageBase64!} alt="Preview" width={64} height={64} unoptimized className="h-16 w-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm" />
                          <button onClick={() => { setImageFile(null); setImageBase64(null); }} className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main Input Row */}
                  <div className="flex items-end gap-2 px-3 py-3 relative">
                    
                    {/* Attachment Dropdown */}
                    <div className="relative" ref={attachRef}>
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
                            <button onClick={handleDrivePicker} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left">
                              <Cloud className="w-4 h-4 text-blue-500" /> Adicionar do Google Drive
                            </button>
                            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                            <button onClick={startCamera} className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left">
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
                      placeholder="Pergunte qualquer coisa ou cole sua prova..."
                      className="min-h-[24px] max-h-40 bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-1 text-[15px] dark:text-zinc-100 text-zinc-900 placeholder:text-zinc-400 scrollbar-hide flex-1"
                      rows={1}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    />

                    <div className="flex items-center gap-1 pb-1 pr-1 shrink-0">
                      
                      {/* Model Selector Pill */}
                      <div className="relative" ref={modelRef}>
                        <button onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                          {modelMode === "gemini-1.5-flash" ? "Instant" : "Pro"}
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {isModelDropdownOpen && (
                          <div className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-[#252528] border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1 z-50">
                            <button 
                              onClick={() => { setModelMode("gemini-1.5-flash"); setIsModelDropdownOpen(false); }} 
                              className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium text-xs">Instant (Flash)</p>
                                <p className="text-[10px] text-zinc-400">Rápido & Direto</p>
                              </div>
                              {modelMode === "gemini-1.5-flash" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                            <button 
                              onClick={() => { 
                                if (userPlan !== 'ultra' && userPlan !== 'premium') {
                                  setIsPricingOpen(true);
                                  setError("O modelo Pro (Raciocínio Profundo) exige o Plano Ultra ou Premium.");
                                } else {
                                  setModelMode("gemini-1.5-pro"); 
                                }
                                setIsModelDropdownOpen(false); 
                              }} 
                              className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800"
                            >
                              <div>
                                <p className="font-medium text-xs flex items-center gap-1.5">
                                  Pro (Raciocínio)
                                  {userPlan !== 'ultra' && userPlan !== 'premium' && (
                                    <span className="text-[9px] bg-violet-500/20 text-violet-400 font-bold px-1.5 py-0.5 rounded border border-violet-500/30 uppercase">Ultra</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-zinc-400">Passo a passo avançado</p>
                              </div>
                              {modelMode === "gemini-1.5-pro" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Microphone */}
                      <div className="relative flex items-center justify-center">
                        {isRecording && <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap z-50 shadow-md">Ouvindo...</span>}
                        <button onClick={startRecording} className={`relative p-2.5 rounded-full transition ${isRecording ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                          {isRecording && <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/40" />}
                          <Mic className="w-5 h-5 relative z-10" />
                        </button>
                      </div>

                      <button 
                        onClick={handleSubmit}
                        disabled={isStreaming || (!inputText.trim() && !imageFile && !imageBase64)}
                        className={`p-2.5 rounded-full transition shadow-sm ${inputText.trim() || imageFile || imageBase64 ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'}`}
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>

                    </div>
                  </div>
                </div>

                <p className="text-center text-[11px] text-zinc-400 mt-2">
                  A IA pode cometer erros. Ao usar o ExamSolver, você concorda com nossos Termos e Política de privacidade.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ---------------- MODAL: CONFIGURAÇÕES DE CONTA ---------------- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button onClick={() => { setIsSettingsOpen(false); setSettingsMessage(null); }} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-500" /> Definições de Conta
              </h2>
              <p className="text-sm text-zinc-500 mb-6">Gerencie seu perfil, saldo de créditos e preferências do sistema.</p>

              {settingsMessage && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-xs font-medium">
                  {settingsMessage}
                </div>
              )}

              <div className="space-y-4">
                {/* Profile Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => user && setIsAvatarModalOpen(true)}
                      className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-indigo-500/40 shadow-sm cursor-pointer hover:ring-2 ring-indigo-500 transition group"
                      title="Alterar Avatar"
                    >
                      {userAvatar ? (
                        <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                          {userFullName ? userFullName.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{userFullName || user?.email?.split('@')[0] || "Convidado"}</p>
                      <p className="text-xs text-zinc-500">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="rounded-xl text-xs h-8 px-2.5 flex items-center gap-1 border-zinc-300 dark:border-zinc-700"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-500" />
                        Foto
                      </Button>
                    )}
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 uppercase tracking-wider">
                      {(userPlan || 'free').toUpperCase()}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => setIsPricingOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl h-8 px-3"
                    >
                      Planos
                    </Button>
                  </div>
                </div>

                {/* Credits Balance Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Saldo de Créditos</span>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {userPlan === 'premium' ? 'Ilimitado' : `${credits.toLocaleString("pt-AO")} Créditos`}
                    </p>
                    {userPlan === 'premium' && (
                      <p className="text-[11px] text-amber-500 font-medium">Acesso VIP irrestrito ativo</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {userPlan !== 'premium' ? (
                      <Button 
                        onClick={() => setIsPricingOpen(true)}
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs h-8 px-3"
                      >
                        Recarregar
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setIsPricingOpen(true)}
                        variant="outline"
                        size="sm"
                        className="border-amber-500/30 text-amber-400 bg-amber-500/10 rounded-xl text-xs h-8 px-3"
                      >
                        Planos VIP
                      </Button>
                    )}
                    <Button 
                      onClick={refreshCredits} 
                      variant="outline" 
                      size="sm" 
                      disabled={isRefreshingCredits || !user}
                      className="rounded-xl flex items-center gap-1.5 text-xs h-8"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCredits ? 'animate-spin' : ''}`} /> Sincronizar
                    </Button>
                  </div>
                </div>

                {/* Preferences */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Aparência do Sistema</p>
                      <p className="text-xs text-zinc-500">Alternar entre tema escuro e claro</p>
                    </div>
                    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="outline" size="sm" className="rounded-xl text-xs">
                      {theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                    </Button>
                  </div>

                  {user && (
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Segurança da Conta</p>
                        <p className="text-xs text-zinc-500">Redefinir senha de acesso</p>
                      </div>
                      <Button onClick={handleResetPassword} variant="outline" size="sm" className="rounded-xl text-xs flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> Redefinir Senha
                      </Button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  {user ? (
                    <Button onClick={handleSignOut} variant="destructive" size="sm" className="rounded-xl text-xs flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5" /> Terminar Sessão
                    </Button>
                  ) : (
                    <Button onClick={() => router.push("/login")} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs">
                      Iniciar Sessão
                    </Button>
                  )}
                  <Button onClick={() => setIsSettingsOpen(false)} variant="ghost" size="sm" className="rounded-xl text-xs">
                    Fechar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: PERSONALIZAR AVATAR ---------------- */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsAvatarModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Personalizar Avatar</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Escolha um avatar pronto, envie do seu dispositivo ou use um link</p>
                </div>
              </div>

              {/* Current Avatar Preview */}
              <div className="flex flex-col items-center justify-center p-5 mb-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50">
                <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 overflow-hidden shadow-xl relative flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 mb-2">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userAvatar} alt="Avatar Atual" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-zinc-400" />
                  )}
                  {isSavingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {userFullName || user?.email || "Seu Perfil"}
                </p>
              </div>

              {/* Upload Local File */}
              <div className="mb-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
                  Upload do Computador ou Telemóvel
                </label>
                <label className="flex items-center justify-center gap-3 w-full p-3.5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer transition text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs font-medium">Selecionar foto ou imagem</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarFileUpload} 
                    className="hidden" 
                    disabled={isSavingAvatar}
                  />
                </label>
              </div>

              {/* Presets Grid */}
              <div className="mb-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
                  Avatares Estilizados Sugeridos
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {[
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo",
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Spooky",
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Snuggles",
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria",
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
                    "https://api.dicebear.com/7.x/lorelei/svg?seed=Felix",
                    "https://api.dicebear.com/7.x/lorelei/svg?seed=Milo",
                    "https://api.dicebear.com/7.x/lorelei/svg?seed=Cleo",
                    "https://api.dicebear.com/7.x/micah/svg?seed=Leo"
                  ].map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSavingAvatar}
                      onClick={() => handleSaveAvatar(presetUrl)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition hover:scale-105 p-1 bg-zinc-100 dark:bg-zinc-800 ${
                        userAvatar === presetUrl 
                          ? 'border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/20' 
                          : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={presetUrl} alt="Preset Avatar" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Image URL */}
              <div className="mb-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
                  Ou Insira URL Direto da Imagem
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    value={newAvatarInput}
                    onChange={(e) => setNewAvatarInput(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSavingAvatar || !newAvatarInput.trim()}
                    onClick={() => handleSaveAvatar()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs px-4"
                  >
                    {isSavingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button 
                  onClick={() => setIsAvatarModalOpen(false)} 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-xl text-xs"
                >
                  Fechar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: NOVO CADERNO ---------------- */}
      <AnimatePresence>
        {isNewNotebookModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setIsNewNotebookModalOpen(false)} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-500" /> Criar Novo Caderno
              </h2>
              <p className="text-xs text-zinc-500 mb-5">Escolha um nome e uma cor temática para sua matéria.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Nome da Matéria / Caderno</label>
                  <input 
                    type="text"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    placeholder="Ex: Física Quântica, Álgebra Linear..."
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-zinc-900 dark:text-zinc-100"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Cor do Caderno</label>
                  <div className="flex items-center gap-3">
                    {[
                      { id: 'indigo', bg: 'bg-indigo-500' },
                      { id: 'emerald', bg: 'bg-emerald-500' },
                      { id: 'amber', bg: 'bg-amber-500' },
                      { id: 'rose', bg: 'bg-rose-500' },
                    ].map(c => (
                      <button 
                        key={c.id} 
                        type="button"
                        onClick={() => setNewNotebookColor(c.id)}
                        className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all ${newNotebookColor === c.id ? 'ring-4 ring-indigo-500/30 scale-110' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {newNotebookColor === c.id && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button onClick={() => setIsNewNotebookModalOpen(false)} variant="ghost" size="sm" className="rounded-xl text-xs">
                    Cancelar
                  </Button>
                  <Button onClick={createNotebook} disabled={!newNotebookName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs">
                    Criar Caderno
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: MOVER CHAT PARA CADERNO ---------------- */}
      <AnimatePresence>
        {movingConvId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button onClick={() => setMovingConvId(null)} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-500" /> Mover Conversa
              </h2>
              <p className="text-xs text-zinc-500 mb-4">Selecione o caderno onde deseja guardar este chat:</p>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                <button 
                  onClick={() => moveConversationToNotebook(movingConvId, null)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
                >
                  Nenhum Caderno (Geral)
                </button>
                {notebooks.map(nb => (
                  <button 
                    key={nb.id}
                    onClick={() => moveConversationToNotebook(movingConvId, nb.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition flex items-center gap-2"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${nb.color === 'emerald' ? 'bg-emerald-500' : nb.color === 'amber' ? 'bg-amber-500' : nb.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    {nb.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: GOOGLE DRIVE LINK / IMPORT ---------------- */}
      <AnimatePresence>
        {isDriveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setIsDriveModalOpen(false)} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" /> Adicionar do Google Drive
              </h2>
              <p className="text-xs text-zinc-500 mb-5">Cole o link de compartilhamento de qualquer foto ou documento do Google Drive:</p>

              <div className="space-y-4">
                <div>
                  <input 
                    type="url"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-zinc-900 dark:text-zinc-100"
                    autoFocus
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5">Dica: No Drive, clique em &quot;Compartilhar&quot; e copie o link do arquivo.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button onClick={() => setIsDriveModalOpen(false)} variant="ghost" size="sm" className="rounded-xl text-xs">
                    Cancelar
                  </Button>
                  <Button onClick={handleDriveUrlSubmit} disabled={!driveUrlInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs">
                    Importar Arquivo
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: VISUALIZAÇÃO DE IMAGEM DA GALERIA ---------------- */}
      <AnimatePresence>
        {selectedGalleryImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative flex flex-col"
            >
              <button onClick={() => setSelectedGalleryImage(null)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" /> Detalhes da Imagem
              </h3>

              <div className="relative aspect-video max-h-[60vh] w-full rounded-2xl overflow-hidden bg-black/40 border border-zinc-800 mb-4 flex items-center justify-center">
                <Image src={selectedGalleryImage.url} alt="Expanded" fill unoptimized className="object-contain" />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button 
                  onClick={() => {
                    setImageBase64(selectedGalleryImage.url);
                    setSelectedGalleryImage(null);
                    setActiveView('chat');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs flex items-center gap-2 flex-1"
                >
                  <BrainCircuit className="w-4 h-4" /> Resolver com a IA
                </Button>
                {selectedGalleryImage.conversation_id && (
                  <Button 
                    onClick={() => {
                      loadConversation(selectedGalleryImage.conversation_id);
                      setSelectedGalleryImage(null);
                    }}
                    variant="outline" 
                    className="rounded-xl text-xs flex-1 text-zinc-300 border-zinc-700"
                  >
                    Ir para o Chat Original
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: WEBCAM / CÂMERA ---------------- */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
              <button onClick={stopCamera} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" /> Capturar Foto da Prova
              </h3>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-4">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={stopCamera} variant="outline" className="rounded-xl text-xs text-zinc-300 border-zinc-700">Cancelar</Button>
                <Button onClick={takePhoto} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Tirar Foto
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MODAL: PRICING & UPGRADE MONETIZATION ---------------- */}
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
        currentPlan={userPlan || 'free'} 
        userEmail={user?.email} 
        onPlanUpdated={refreshCredits} 
      />

    </div>
  );
}
