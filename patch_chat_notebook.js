
const fs = require("fs");
let content = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");

const injection = `    // INJECT NOTEBOOK CONTEXT IF AVAILABLE
    if (!isGuest && notebookId) {
      const { data: materials } = await db
        .from("notebook_materials")
        .select("title, file_type, extracted_text")
        .eq("notebook_id", notebookId);
      
      const { data: notes } = await db
        .from("notebook_notes")
        .select("title, content")
        .eq("notebook_id", notebookId);

      let contextStr = "CONTEXTO DO CADERNO DE ESTUDOS:\\n";
      if (materials && materials.length > 0) {
        contextStr += "MATERIAIS ANEXADOS:\\n";
        materials.forEach(m => {
          contextStr += \`[Material: \${m.title}]: \${m.extracted_text || "Documento vazio"}\\n\\n\`;
        });
      }
      if (notes && notes.length > 0) {
        contextStr += "ANOTAÇÕES DO ALUNO:\\n";
        notes.forEach(n => {
          contextStr += \`[Nota: \${n.title}]: \${n.content}\\n\\n\`;
        });
      }
      
      if (materials?.length || notes?.length) {
        openAiMessages.push({
          role: "system",
          content: contextStr
        });
      }
    }

    if (!isGuest && conversationId && conversationId !== "guest") {`;

content = content.replace(/    if \(\!isGuest && conversationId && conversationId \!\=\= "guest"\) \{[\s\S]*?const \{ data: previousMessages \}/, injection.replace(/if \(!isGuest && conversationId && conversationId !== "guest"\) \{/, "if (!isGuest && conversationId && conversationId !== \"guest\") {\n      const { data: previousMessages }"));

fs.writeFileSync("src/app/api/chat/route.ts", content);

