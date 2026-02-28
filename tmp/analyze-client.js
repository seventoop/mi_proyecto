const fs = require('fs');
const path = require('path');

const DIRS = ['app', 'components'];
const EXTENSIONS = ['.tsx', '.ts'];

const HOOKS_AND_EVENTS = [
    'motion.', 'm.', 'AnimatePresence', '@radix-ui', 'framer-motion',
    'createContext', 'useContext', 'useState', 'useEffect', 'useReducer',
    'useRef', 'onClick', 'onChange', 'onSubmit', 'useRouter', 'useSearchParams',
    'SessionProvider', 'ThemeProvider', 'TooltipProvider',
    'useCallback', 'useMemo', 'usePathname', 'useForm', 'useAppStore', 'useMasterplanStore',
    'useTheme', 'useSession', 'useTransition', 'useFilteredUnits', 'useCopyToClipboard',
    'useSwipeable', 'useInView', 'useScroll', 'useTransform'
];

let totalFiles = 0;
let clientFiles = 0;
let candidatesForRemoval = [];

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'api') continue; // Skip API routes
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (EXTENSIONS.some(ext => file.endsWith(ext))) {
            totalFiles++;
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('"use client"') || content.includes("'use client'")) {
                clientFiles++;
                let hasHookOrEvent = false;
                for (const keyword of HOOKS_AND_EVENTS) {
                    if (content.includes(keyword)) {
                        hasHookOrEvent = true;
                        break;
                    }
                }
                if (!hasHookOrEvent) {
                    candidatesForRemoval.push(fullPath);
                }
            }
        }
    }
}

DIRS.forEach(dir => walkDir(path.join(__dirname, '..', dir)));

const ratio = ((clientFiles / totalFiles) * 100).toFixed(1);

console.log(`Total Files: ${totalFiles}`);
console.log(`Client Files: ${clientFiles}`);
console.log(`Current Client Ratio: ${ratio}%`);
console.log(`Candidates for removal: ${candidatesForRemoval.length}`);
fs.writeFileSync(path.join(__dirname, 'candidates.json'), JSON.stringify(candidatesForRemoval, null, 2));
