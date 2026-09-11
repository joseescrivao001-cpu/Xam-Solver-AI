const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// 1. Add Image import
if (!content.includes('import Image from "next/image";')) {
  content = content.replace('import { useRouter } from "next/navigation";', 'import { useRouter } from "next/navigation";\nimport Image from "next/image";');
}

// 2. Replace <img> with <Image>
content = content.replace(
  /<img src={img\.url} alt="Galeria" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" \/>/g,
  '<Image src={img.url} alt="Galeria" fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-110" />'
);

content = content.replace(
  /<img src={msg\.image_url} alt="Uploaded" className="max-w-sm w-full rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700" \/>/g,
  '<Image src={msg.image_url!} alt="Uploaded" width={400} height={400} unoptimized className="max-w-sm w-full h-auto rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700" />'
);

content = content.replace(
  /<img src={imageBase64} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm" \/>/g,
  '<Image src={imageBase64!} alt="Preview" width={64} height={64} unoptimized className="h-16 w-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm" />'
);

// 3. Typography: add font-serif to prose
content = content.replace(
  /className={`prose dark:prose-invert prose-sm max-w-none \${msg\.role === 'ai' \? 'leading-relaxed' : ''}/g,
  'className={`prose dark:prose-invert prose-sm max-w-none font-serif ${msg.role === \'ai\' ? \'leading-relaxed\' : \'\''
);

// 4. Aura Background (Indigo/Violet)
content = content.replace(
  /bg-blue-400\/20 dark:bg-blue-600\/20/g,
  'bg-indigo-400/20 dark:bg-indigo-600/20'
);
content = content.replace(
  /bg-purple-400\/20 dark:bg-purple-600\/20/g,
  'bg-violet-400/20 dark:bg-violet-600/30'
);

// 5. Bento Grid / Glassmorphism
content = content.replace(
  /bg-\[#f4f4f4\] dark:bg-\[#2f2f32\] text-zinc-900 dark:text-zinc-100 px-5 py-3\.5 rounded-3xl rounded-tr-sm shadow-\[0_2px_10px_rgba\(0,0,0,0\.02\)\]/g,
  'bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm'
);

content = content.replace(
  /bg-\[#f0f0f0\] dark:bg-\[#1e1e20\]/g,
  'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-200 dark:border-zinc-800/60'
);

content = content.replace(
  /bg-white dark:bg-\[#1e1e20\] border border-zinc-200\/80 dark:border-zinc-700\/80 rounded-\[32px\]/g,
  'bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl'
);

content = content.replace(
  /bg-\[#f9f9fa\] dark:bg-\[#131314\]/g,
  'bg-zinc-50 dark:bg-zinc-950'
);

fs.writeFileSync('src/app/dashboard/page.tsx', content, 'utf8');
console.log('Dashboard UI updated successfully.');
