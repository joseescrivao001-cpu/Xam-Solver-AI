
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

// Fix 1 & 2
if (!content.includes("convertPdfToVerticalImage")) {
  content = content.replace("import { WelcomeScreen } from \"@/components/chat/welcome-screen\";", "import { WelcomeScreen } from \"@/components/chat/welcome-screen\";\nimport { convertPdfToVerticalImage } from \"@/lib/pdf-renderer\";");
}

const newReturn = `  if (!isProfileLoaded || isDataLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-zinc-50 dark:bg-[#0A0A0A]">
         <div className="text-center flex flex-col items-center">
           <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
           <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium animate-pulse">Carregando sessão do ExamSolver...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-[#0A0A0A] text-[#1f1f1f] dark:text-[#e3e3e3] font-sans overflow-hidden transition-colors duration-500">`;
content = content.replace(/  return \([\s\n]*<div className="flex h-\[100dvh\] w-full bg-white dark:bg-\[#0A0A0A\] text-\[#1f1f1f\] dark:text-\[#e3e3e3\] font-sans[\s\n]*overflow-hidden transition-colors duration-500">/m, newReturn);

// Fix 3
const oldChange = `    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImageBase64(reader.result as string);
        reader.readAsDataURL(file);
        setIsAttachMenuOpen(false);
      }
    };`;
const newChange = `    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
          setError("O arquivo é muito grande. O limite máximo é 10MB.");
          setIsAttachMenuOpen(false);
          return;
        }
        if (file.type === "application/pdf") {
          try {
            setError(null);
            const base64Img = await convertPdfToVerticalImage(file, 4);
            setImageBase64(base64Img);
            const res = await fetch(base64Img);
            const blob = await res.blob();
            const newImageFile = new File([blob], file.name.replace(".pdf", ".jpg"), { type: "image/jpeg" });
            setImageFile(newImageFile);
          } catch (err) {
            setError("Falha ao renderizar PDF.");
          }
        } else {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => setImageBase64(reader.result as string);
          reader.readAsDataURL(file);
        }
        setIsAttachMenuOpen(false);
      }
    };`;
content = content.replace(oldChange, newChange);

// Fix 4: Regex replace for handleUploadMaterial
const uploadRegex = /const handleUploadMaterial = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\n    \};/;
const newUpload = `const handleUploadMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0] || !activeNotebookId) return;
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError("O arquivo é muito grande. O limite é 10MB.");
        return;
      }
      setIsUploadingMaterial(true);
      setError(null);
      if (file.type === "application/pdf") {
        try {
          const base64Url = await convertPdfToVerticalImage(file, 4);
          const res = await fetch("/api/notebooks/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notebook_id: activeNotebookId, title: file.name, file_url: base64Url, file_type: "image/jpeg", file_size: file.size })
          });
          if (res.ok) {
            const { material } = await res.json();
            if (material) setMaterials(prev => [material, ...prev]);
          } else {
            const errData = await res.json();
            setError(errData.error || "Falha ao salvar material.");
          }
        } catch (err) {
          setError("Falha ao renderizar PDF para extração.");
        }
        setIsUploadingMaterial(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch("/api/notebooks/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notebook_id: activeNotebookId, title: file.name, file_url: reader.result, file_type: file.type || "application/octet-stream", file_size: file.size })
          });
          if (res.ok) {
            const { material } = await res.json();
            if (material) setMaterials(prev => [material, ...prev]);
          } else {
            const errData = await res.json();
            setError(errData.error || "Falha ao salvar material.");
          }
        } catch (e) {
          setError("Erro de rede ao enviar material.");
        } finally {
          setIsUploadingMaterial(false);
        }
      };
      reader.readAsDataURL(file);
    };`;
content = content.replace(uploadRegex, newUpload);

fs.writeFileSync("src/app/dashboard/page.tsx", content);

