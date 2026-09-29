
const fs = require("fs");
let code = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

code = code.replace(
  /<WelcomeScreen[\s\S]*?onSuggestionClick[\s\S]*?\/>/,
  `<WelcomeScreen
                  notebookName={activeNotebookObj?.name ?? null}
                  onSuggestionClick={(text) => setInputText(text)}
                >
                  {messages.length === 0 && composerNode}
                </WelcomeScreen>`
);

fs.writeFileSync("src/app/dashboard/page.tsx", code);

