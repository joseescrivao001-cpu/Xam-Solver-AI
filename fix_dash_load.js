const fs = require("fs");
let content = fs.readFileSync("src/app/dashboard/page.tsx", "utf-8");

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

content = content.replace(/  return \(\n\s*<div className="flex h-\[100dvh\] w-full bg-white dark:bg-\[#0A0A0A\] text-\[#1f1f1f\] dark:text-\[#e3e3e3\] font-sans \noverflow-hidden transition-colors duration-500">/, newReturn);

// Also let's try the generic replace in case of newline mismatch
content = content.replace(/  return \([\s\n]*<div className="flex h-\[100dvh\] w-full bg-white dark:bg-\[#0A0A0A\] text-\[#1f1f1f\] dark:text-\[#e3e3e3\] font-sans[\s\n]*overflow-hidden transition-colors duration-500">/m, newReturn);

fs.writeFileSync("src/app/dashboard/page.tsx", content);
