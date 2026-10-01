
const fs = require("fs");
let code = fs.readFileSync("src/app/pricing/page.tsx", "utf8");

if (!code.includes("isLoading")) {
  code = code.replace(/const \[currentPlan, setCurrentPlan\] = useState\<string\>\(.free.\);/, "const [currentPlan, setCurrentPlan] = useState<string>(\"free\");\n  const [isLoading, setIsLoading] = useState(true);");
  code = code.replace(/fetchUserAndSettings\(\);/, "fetchUserAndSettings().finally(() => setIsLoading(false));");
  code = code.replace(/<div className=\"min-h-screen/, "{isLoading && (<div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm\"><div className=\"w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin\"></div></div>)}\n    <div className=\"min-h-screen");
  fs.writeFileSync("src/app/pricing/page.tsx", code);
}

