/**
 * SevenToop Security Guardrail Check
 * Analyzes the codebase for security policy violations.
 */

const fs = require('fs');
const path = require('path');

const SEVERITY = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM'
};

const VIOLATIONS = [];
const DEBUG_LOG = [];

function log(msg) {
    DEBUG_LOG.push(`[${new Date().toISOString()}] ${msg}`);
}

function checkFile(filePath, content) {
    const lines = content.split('\n');
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    
    const isApiRoute = relPath.includes('app/api/');
    const isServerAction = relPath.includes('lib/actions/');
    
    // 1. Direct getServerSession Usage
    if (isApiRoute || isServerAction) {
        if (content.includes('getServerSession(') && !relPath.endsWith('guards.ts') && !relPath.includes('auth')) {
            const lineNum = lines.findIndex(l => l.includes('getServerSession(')) + 1;
            VIOLATIONS.push({
                file: relPath,
                line: lineNum,
                severity: SEVERITY.CRITICAL,
                rule: 'FORBIDDEN_DIRECT_SESSION',
                message: 'Direct getServerSession() usage detected. Use requireAuth() helper instead.'
            });
        }
    }

    // 2. Missing orgId in Lead creation
    if (content.includes('lead.create({') || content.includes('lead.createMany({')) {
        const leadCreateIdx = content.indexOf('lead.create(');
        const searchRange = content.substring(leadCreateIdx, leadCreateIdx + 1000); 
        if (!searchRange.includes('orgId')) {
            const lineNum = content.substring(0, leadCreateIdx).split('\n').length;
            VIOLATIONS.push({
                file: relPath,
                line: lineNum,
                severity: SEVERITY.HIGH,
                rule: 'INSECURE_LEAD_CREATION',
                message: 'Lead creation without explicit orgId detected. All leads must have a tenant.'
            });
        }
    }

    // 3. API Handlers without requireAuth or public waiver
    if (isApiRoute && relPath.endsWith('route.ts')) {
        const handlers = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        handlers.forEach(handler => {
            const searchStr = `export async function ${handler}`;
            if (content.includes(searchStr)) {
                // Heuristic: check function body for guard call
                const handlerIdx = content.indexOf(searchStr);
                const bodySearchRange = content.substring(handlerIdx, handlerIdx + 500);
                if (!bodySearchRange.includes('requireAuth(') && 
                    !bodySearchRange.includes('requireRole(') && 
                    !bodySearchRange.includes('requireAnyRole(') &&
                    !bodySearchRange.includes('requireCronSecret(') &&
                    !bodySearchRange.includes('requireAuth()') &&
                    !bodySearchRange.includes('requireKYC(') &&
                    !bodySearchRange.includes('requireSellerKYC(') &&
                    !bodySearchRange.includes('requireProjectOwnership(') &&
                    !bodySearchRange.includes('withAdminGuard') &&
                    !bodySearchRange.includes('// @security-waive: PUBLIC')
                ) {
                    const lineNum = content.substring(0, handlerIdx).split('\n').length;
                    VIOLATIONS.push({
                        file: relPath,
                        line: lineNum,
                        severity: SEVERITY.HIGH,
                        rule: 'MISSING_AUTH_GUARD',
                        message: `API handler ${handler} seems to lack a session guard. Use requireAuth() or mark as // @security-waive: PUBLIC.`
                    });
                }
            }
        });
    }

    // 4. Missing orgFilter in queries (Heuristic for sensitive domains)
    const sensitiveDomains = ['unidades', 'proyectos', 'reservas', 'crm', 'leads'];
    const lowerPath = relPath.toLowerCase();
    if (sensitiveDomains.some(d => lowerPath.includes(d)) && (isApiRoute || isServerAction)) {
        if (content.includes('.findMany(')) {
            const findManyIdx = content.indexOf('.findMany(');
            const searchRange = content.substring(findManyIdx, findManyIdx + 500);
            if (!searchRange.includes('orgFilter(') && !content.includes('// @security-waive: NO_ORG_FILTER')) {
                const lineNum = content.substring(0, findManyIdx).split('\n').length;
                VIOLATIONS.push({
                    file: relPath,
                    line: lineNum,
                    severity: SEVERITY.MEDIUM,
                    rule: 'MISSING_ORG_FILTER',
                    message: 'Potential missing orgId filter in findMany query. Verify usage or waive with // @security-waive: NO_ORG_FILTER.'
                });
            }
        }
    }

    // 5. Missing Input Validation in Mutations
    const mutationHandlers = ['POST', 'PUT', 'PATCH'];
    if (isApiRoute && sensitiveDomains.some(d => lowerPath.includes(d))) {
        mutationHandlers.forEach(handler => {
            const searchStr = `export async function ${handler}`;
            if (content.includes(searchStr)) {
                if (!content.includes('from "@/lib/validations"') && !content.includes('// @security-waive: NO_VALIDATION')) {
                    const lineNum = lines.findIndex(l => l.includes(searchStr)) + 1;
                    VIOLATIONS.push({
                        file: relPath,
                        line: lineNum,
                        severity: SEVERITY.HIGH,
                        rule: 'MISSING_INPUT_VALIDATION',
                        message: `Mutation handler ${handler} lacks strict input validation import from @/lib/validations.`
                    });
                }
            }
        });
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== '.agents') {
                walkDir(fullPath);
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                checkFile(fullPath, content);
            }
        }
    });
}

log('Starting Security Scan');
try {
    walkDir(process.cwd());
    log('Scan Finished');
} catch (e) {
    log('ERROR: ' + e.message);
    fs.writeFileSync('security-debug.log', DEBUG_LOG.join('\n'));
    process.exit(1);
}

const criticals = VIOLATIONS.filter(v => v.severity === SEVERITY.CRITICAL).length;
const highs = VIOLATIONS.filter(v => v.severity === SEVERITY.HIGH).length;

fs.writeFileSync('security-violations.json', JSON.stringify(VIOLATIONS, null, 2));
fs.writeFileSync('security-debug.log', DEBUG_LOG.join('\n'));

console.log(`🔍 Security Scan: ${VIOLATIONS.length} issues found (${criticals} CRITICAL, ${highs} HIGH).`);

if (criticals > 0 || highs > 0) {
    process.exit(1);
}
process.exit(0);
