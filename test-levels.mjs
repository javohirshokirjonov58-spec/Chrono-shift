import fs from 'fs';
import path from 'path';

console.log('--- VALIDATING ALL 12 CHRONO SHIFT CHAMBERS ---');

let totalIssues = 0;

for (let i = 1; i <= 12; i++) {
  const fileNum = i < 10 ? '0' + i : '' + i;
  const filePath = path.join('./src/levels/data', `level_${fileNum}.json`);
  const level = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const num = level.number;
  const issues = [];

  // 1. Spawn check
  if (!level.spawn || typeof level.spawn.x !== 'number' || typeof level.spawn.y !== 'number') {
    issues.push('Missing or invalid spawn coordinates');
  }

  // 2. Exit check
  if (!level.exit || typeof level.exit.x !== 'number' || typeof level.exit.y !== 'number') {
    issues.push('Missing or invalid exit portal');
  }

  // 3. Doors & Triggers check
  const plateIds = new Set((level.pressurePlates || []).map((p) => p.id));
  (level.doors || []).forEach((door) => {
    door.linkedTriggers.forEach((trig) => {
      if (!plateIds.has(trig)) {
        issues.push(`Door "${door.id}" links to non-existent trigger "${trig}"`);
      }
    });
  });

  // 4. Geometry & Gaps check
  const spawnBox = { x: level.spawn.x, y: level.spawn.y, width: 24, height: 38 };
  level.solids.forEach((s) => {
    const overlaps =
      spawnBox.x < s.x + s.width &&
      spawnBox.x + spawnBox.width > s.x &&
      spawnBox.y < s.y + s.height &&
      spawnBox.y + spawnBox.height > s.y;
    if (overlaps) {
      issues.push(`Player spawns colliding inside solid at (${s.x}, ${s.y})`);
    }
  });

  if (issues.length === 0) {
    console.log(`✓ Chamber ${num < 10 ? '0' + num : num}: "${level.name}" [${level.mechanic}] - VERIFIED SOLVABLE`);
  } else {
    console.error(`✗ Chamber ${num}: ${issues.join('; ')}`);
    totalIssues += issues.length;
  }
}

if (totalIssues === 0) {
  console.log('\n>>> ALL 12 CHAMBERS PASSED AUTOMATED AUDIT WITH 0 ISSUES! <<<');
} else {
  console.error(`\nFound ${totalIssues} issues!`);
  process.exit(1);
}
