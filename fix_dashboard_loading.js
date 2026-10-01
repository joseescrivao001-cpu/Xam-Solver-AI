
const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");
const replacement = `  if (!isProfileLoaded || isDataLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-zinc-50 dark:bg-[#0A0A0A]">
         <div className="text-center flex flex-col items-center">
           <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
           <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium animate-pulse">Carregando sessão do ExamSolver...</p>
         </div>
      </div>
    );
  }

  return (`;
content = content.replace(/\n\s*return \(\n\s*<div className="flex h-\[100dvh\]/, "\n" + replacement + "\n    <div className=\"flex h-[100dvh]");
fs.writeFileSync("src/app/dashboard/page.tsx", content);

