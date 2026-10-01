
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

const startFile = content.indexOf("const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {");
if (startFile !== -1) {
  const endFile = content.indexOf("setIsAttachMenuOpen(false);\n      }\n    };", startFile) + 42;
  const newHandleFileChange = `const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  content = content.substring(0, startFile) + newHandleFileChange + content.substring(endFile);
  fs.writeFileSync("src/app/dashboard/page.tsx", content);
  console.log("FIXED handleFileChange");
}

