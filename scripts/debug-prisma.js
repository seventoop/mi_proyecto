
const { exec } = require('child_process');
const fs = require('fs');

console.log("Running prisma validate...");
exec('npx prisma validate', { encoding: 'utf8' }, (error, stdout, stderr) => {
    const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
    fs.writeFileSync('validate_out.txt', output);
    console.log("Done. Check validate_out.txt");
    if (error) {
        console.log(`Error code: ${error.code}`);
    }
});
