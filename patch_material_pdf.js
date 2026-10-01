
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

const startIndex = content.indexOf("const handleUploadMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {");
if (startIndex !== -1) {
  const endMarker = "setMaterials(prev => [material, ...prev]);\n            }\n          } else {\n            const errData = await res.json();\n            setError(errData.error || \"Falha ao salvar material.\");\n          }\n        } catch (e) {\n          console.error(e);\n          setError(\"Erro de rede ao enviar material.\");\n        } finally {\n          setIsUploadingMaterial(false);\n        }\n      };\n      reader.readAsDataURL(file);\n    };";
  const endIndex = content.indexOf("reader.readAsDataURL(file);\n    };", startIndex) + "reader.readAsDataURL(file);\n    };".length;
  
  const newHandleUploadMaterial = `const handleUploadMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            body: JSON.stringify({
              notebook_id: activeNotebookId,
              title: file.name,
              file_url: base64Url,
              file_type: "image/jpeg",
              file_size: file.size
            })
          });
          if (res.ok) {
            const { material } = await res.json();
            if (material) setMaterials(prev => [material, ...prev]);
          } else {
            const errData = await res.json();
            setError(errData.error || "Falha ao salvar material.");
          }
        } catch (err) {
          setError("Falha ao renderizar PDF para extração de material.");
        }
        setIsUploadingMaterial(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result as string;
          const res = await fetch("/api/notebooks/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notebook_id: activeNotebookId,
              title: file.name,
              file_url: base64Url,
              file_type: file.type || "application/octet-stream",
              file_size: file.size
            })
          });
  
          if (res.ok) {
            const { material } = await res.json();
            if (material) {
              setMaterials(prev => [material, ...prev]);
            }
          } else {
            const errData = await res.json();
            setError(errData.error || "Falha ao salvar material.");
          }
        } catch (e) {
          console.error(e);
          setError("Erro de rede ao enviar material.");
        } finally {
          setIsUploadingMaterial(false);
        }
      };
      reader.readAsDataURL(file);
    };`;
    
  content = content.substring(0, startIndex) + newHandleUploadMaterial + content.substring(endIndex);
  fs.writeFileSync("src/app/dashboard/page.tsx", content);
  console.log("REPLACED!");
} else {
  console.log("NOT FOUND");
}

