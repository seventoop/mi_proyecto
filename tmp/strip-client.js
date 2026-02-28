const fs = require('fs');

const candidates = [
    "C:\\dev\\antigravity\\components\\crm\\lead-card.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\activity-center.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\admin\\admin-management-panel.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\developer-financial-panel.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\investor-financial-summary.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\investor-movements-table.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\leads\\leads-table.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\reservas\\reservas-view.tsx",
    "C:\\dev\\antigravity\\components\\dashboard\\risk-badge.tsx",
    "C:\\dev\\antigravity\\components\\providers.tsx",
    "C:\\dev\\antigravity\\components\\public\\blog-preview-section.tsx",
    "C:\\dev\\antigravity\\components\\public\\developer-infrastructure.tsx",
    "C:\\dev\\antigravity\\components\\public\\hero.tsx",
    "C:\\dev\\antigravity\\components\\public\\launch-system.tsx",
    "C:\\dev\\antigravity\\components\\public\\project-card.tsx",
    "C:\\dev\\antigravity\\components\\public\\scroll-animation-wrapper.tsx",
    "C:\\dev\\antigravity\\components\\public\\service-plans.tsx",
    "C:\\dev\\antigravity\\components\\public\\testimonios-carousel-wrapper.tsx",
    "C:\\dev\\antigravity\\components\\reservas\\reserva-historial.tsx",
    "C:\\dev\\antigravity\\components\\ui\\alert-dialog.tsx",
    "C:\\dev\\antigravity\\components\\ui\\avatar.tsx",
    "C:\\dev\\antigravity\\components\\ui\\calendar.tsx",
    "C:\\dev\\antigravity\\components\\ui\\command.tsx",
    "C:\\dev\\antigravity\\components\\ui\\popover.tsx",
    "C:\\dev\\antigravity\\components\\ui\\scroll-area.tsx",
    "C:\\dev\\antigravity\\components\\ui\\select.tsx",
    "C:\\dev\\antigravity\\components\\ui\\switch.tsx",
    "C:\\dev\\antigravity\\components\\ui\\tabs.tsx"
];

const UNSAFE = [
    'motion.', 'm.', 'AnimatePresence', '@radix-ui', 'framer-motion',
    'createContext', 'useContext', 'useState', 'useEffect', 'useReducer',
    'useRef', 'onClick', 'onChange', 'onSubmit', 'useRouter', 'useSearchParams',
    'SessionProvider', 'ThemeProvider', 'TooltipProvider'
    // providers.tsx usually exports context providers, need to be careful
];

let removed = [];
for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let isSafe = true;
    for (const term of UNSAFE) {
        if (content.includes(term)) {
            isSafe = false;
            break;
        }
    }

    // Check first 100 chars for use client
    const prefix = content.substring(0, 100);
    if (isSafe && (prefix.includes('"use client"') || prefix.includes("'use client'"))) {
        content = content.replace(/^"use client";?\r?\n?/g, '');
        content = content.replace(/^'use client';?\r?\n?/g, '');
        fs.writeFileSync(file, content.trimStart());
        removed.push(file.split('\\').pop());
    }
}

console.log(`Success! Removed from ${removed.length} files:`);
console.log(removed.join('\n'));
