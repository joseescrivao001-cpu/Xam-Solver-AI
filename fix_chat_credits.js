
const fs = require("fs");
let content = fs.readFileSync("src/app/api/chat/route.ts", "utf-8");
content = content.replace(/if \(\!isGuest && conversationId && conversationId !== "guest" && profile\) \{/g, "if (!isGuest && conversationId && conversationId !== \"guest\" && profile && fullTextAccumulated.trim().length > 10) {");
fs.writeFileSync("src/app/api/chat/route.ts", content);

