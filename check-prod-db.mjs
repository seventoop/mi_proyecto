// Verificar si tenemos una BD de producción configurada
const prodDbUrl = process.env.DATABASE_URL_PROD || process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

console.log('=== Estado de la Base de Datos de Producción ===\n');

if (prodDbUrl && prodDbUrl !== process.env.DATABASE_URL) {
  console.log('✓ URL de BD de Producción detectada (diferente a desarrollo)');
} else {
  console.log('⚠ No se detectó una BD de producción separada');
  console.log('ℹ Usando la misma URL de desarrollo');
}

// Verificar todas las variables de entorno relacionadas con BD
const dbVars = Object.keys(process.env).filter(key => 
  key.toLowerCase().includes('database') || 
  key.toLowerCase().includes('db') ||
  key.toLowerCase().includes('postgres') ||
  key.toLowerCase().includes('sql')
);

console.log('\n=== Variables de Entorno de BD ===');
if (dbVars.length === 0) {
  console.log('No se encontraron variables');
} else {
  dbVars.forEach(key => {
    const value = process.env[key];
    const hidden = value ? '***' + value.slice(-10) : 'undefined';
    console.log(`${key}: ${hidden}`);
  });
}
