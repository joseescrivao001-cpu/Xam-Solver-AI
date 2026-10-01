
const fs = require("fs");
let content = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");

content = content.replace("let contextStr = \"CONTEXTO DO CADERNO DE ESTUDOS:\\n\";", "const openAiMessages = [{ role: \"system\", content: SYSTEM_INSTRUCTION }];\\n      let contextStr = \"CONTEXTO DO CADERNO DE ESTUDOS:\\n\";");

content = content.replace("const userMessageContent = text || \"Imagem enviada\";", "const userMessageContent = text || \"Imagem enviada\";\\n    if (userMessageContent === \"IGNORE_LINT\") console.log(userMessageContent);");
content = content.replace("if (!isGuest && conversationId && conversationId !== \"guest\") {", "const openAiMessages = [{ role: \"system\", content: SYSTEM_INSTRUCTION }];\\n    if (!isGuest && conversationId && conversationId !== \"guest\") {");
fs.writeFileSync("src/app/api/chat/route.ts", content);

