const fs = require('fs');
let code = fs.readFileSync('src/hooks/useCasinoConfig.ts', 'utf8');

const defaultObjStart = code.indexOf('export const defaultCasinoConfig: CasinoConfig = {');
const lootRulesIdx = code.indexOf('lootRules: [');

const newDefaults = `export const defaultCasinoConfig: CasinoConfig = {
  prizes: [
    { id: 1, name: 'Normal', chance: 49, value: '100k', color: 'text-amber-500', icon: '💰' },
    { id: 2, name: 'Rare', chance: 25, value: '250k', color: 'text-emerald-500', icon: '💵' },
    { id: 3, name: 'Epic', chance: 15, value: '500k', color: 'text-blue-500', icon: '💎' },
    { id: 4, name: 'Legendary', chance: 10, value: '1M', color: 'text-purple-500', icon: '👑' },
    { id: 5, name: 'Mythic', chance: 1, value: '2.5M', color: 'text-red-500', icon: '🔥' },
  ],
  `;

code = code.substring(0, defaultObjStart) + newDefaults + code.substring(lootRulesIdx);

// also replace the fallback check inside loadedPrizes
code = code.replace(/if \(loadedPrizes.length > 0 && loadedPrizes\[0\].chance === 50 && loadedPrizes\[0\].name.includes\('100k'\)\) {/, `if (loadedPrizes.length > 0 && loadedPrizes[0].chance >= 49 && loadedPrizes[0].name.includes('100k')) {`);

// Update logic so if they haven't upgraded yet, we forcefully strip the values out of the text in db as well
const effectStr = `
        let loadedPrizes = data.prizes || defaultCasinoConfig.prizes;

        // Force transition to English / Value-less names for existing clients
        loadedPrizes = loadedPrizes.map(p => {
          let updatedName = p.name;
          if (updatedName.includes('Normal')) updatedName = 'Normal';
          if (updatedName.includes('Rara') || updatedName.includes('Rare')) updatedName = 'Rare';
          if (updatedName.includes('Épica') || updatedName.includes('Epic')) updatedName = 'Epic';
          if (updatedName.includes('Lendária') || updatedName.includes('Legendary')) updatedName = 'Legendary';
          if (updatedName.includes('Mítica') || updatedName.includes('Mythic')) updatedName = 'Mythic';
          return { ...p, name: updatedName };
        });
`;

code = code.replace(/let loadedPrizes = data\.prizes \|\| defaultCasinoConfig\.prizes;/, effectStr);

fs.writeFileSync('src/hooks/useCasinoConfig.ts', code);
console.log('done config update');
