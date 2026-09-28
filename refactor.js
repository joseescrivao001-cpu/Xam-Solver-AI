const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'app', 'dashboard', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 8. Update markdown rendering to use SafeMarkdown and SolutionProcess
const startMarker = "<div className={`prose dark:prose-invert prose-sm max-w-none font-serif ${msg.role === 'ai' ? 'leading-relaxed' : ''}`}>\n                            <ReactMarkdown";
const endMarker = "</ReactMarkdown>\n                          </div>";

if (content.includes(startMarker) && content.includes(endMarker)) {
  const parts1 = content.split(startMarker);
  const parts2 = parts1[1].split(endMarker);
  const newMarkup = `<div className="w-full flex flex-col gap-2"><SolutionProcess thoughts={msg.thought_process || ""} />
                            <SafeMarkdown content={msg.content} isAiRole={msg.role === 'ai'} /></div>`;
  content = parts1[0] + newMarkup + parts2[1];
}

// 1. Add Imports
const importsToAdd = `
import { SafeMarkdown } from "@/components/chat/safe-markdown";
import { SolutionProcess } from "@/components/chat/solution-process";
`;
if (!content.includes('SafeMarkdown')) {
  content = content.replace('import "katex/dist/katex.min.css";', 'import "katex/dist/katex.min.css";' + importsToAdd);
}

// 2. Remove ReactMarkdown and KaTeX imports to clean up
content = content.replace(/import ReactMarkdown from "react-markdown";\n/, '');
content = content.replace(/import remarkGfm from "remark-gfm";\n/, '');
content = content.replace(/import remarkMath from "remark-math";\n/, '');
content = content.replace(/import rehypeKatex from "rehype-katex";\n/, '');

fs.writeFileSync(pagePath, content);
console.log('Refactor script part 1 completed');
