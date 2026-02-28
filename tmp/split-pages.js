const fs = require('fs');
const path = require('path');

const pages = [
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\testimonios\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\proyectos\\[id]\\tour360\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\proyectos\\[id]\\inventario\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\kyc\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\mi-perfil\\kyc\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\developer\\proyectos\\new\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\developer\\proyectos\\[id]\\tour360\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\developer\\proyectos\\[id]\\inventario\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\inversor\\wallet\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\developer\\mi-perfil\\kyc\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\inversor\\mi-perfil\\kyc\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\developer\\banners\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\inversor\\configuracion\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\banners\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\pagos\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\testimonios\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\proyectos\\new\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\notifications\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\kyc\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\proyectos\\[id]\\inventario\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\proyectos\\[id]\\tour360\\page.tsx",
    "C:\\dev\\antigravity\\app\\(dashboard)\\dashboard\\admin\\banners\\page.tsx"
];

for (const p of pages) {
    if (!fs.existsSync(p)) continue;

    const content = fs.readFileSync(p, 'utf8');
    if (!content.includes('"use client"') && !content.includes("'use client'")) continue;

    const dir = path.dirname(p);
    const clientPath = path.join(dir, 'page-client.tsx');

    // Check if default export is something specific, or just assume it's exported as default
    // We will just rename the file and create a new server wrapper

    fs.renameSync(p, clientPath);

    const serverContent = `import ClientPage from "./page-client";

export default function Page(props: any) {
    return <ClientPage {...props} />;
}
`;

    fs.writeFileSync(p, serverContent);
    console.log(`Converted ${dir} to Client Island pattern`);
}
