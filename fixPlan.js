const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

code = code.replace(/setUserPlan\("free"\);/g, "setUserPlan(user ? 'free' : null);");
code = code.replace(/{userPlan === 'free' && <Lock className="w-3 h-3 text-zinc-400" \/>}/g, "{(userPlan === 'free' || !userPlan) && <Lock className=\"w-3 h-3 text-zinc-400\" />}");
code = code.replace(/Plano {userPlan === 'premium' \? 'VIP' : userPlan === 'pro' \? 'Pro' : 'Free'}/g, "Plano {userPlan === 'premium' ? 'VIP' : userPlan === 'ultra' ? 'Ultra' : userPlan === 'pro' ? 'Pro' : userPlan === 'free' ? 'Free' : 'Visitante'}");

fs.writeFileSync('src/app/dashboard/page.tsx', code);
