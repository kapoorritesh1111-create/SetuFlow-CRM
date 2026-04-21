import { existsSync, rmSync } from 'node:fs';
for (const target of ['.next','tsconfig.tsbuildinfo']) { if (existsSync(target)) { rmSync(target,{recursive:true,force:true}); console.log(`Removed ${target}`); } }
console.log('Verification artifacts are clean.');
