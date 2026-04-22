import { get, ref, set, update } from 'firebase/database';
import { rtdb } from './src/lib/firebase';
const prizes = [
    { id: 1, name: 'Normal (100k)', chance: 49, value: '100k', color: 'text-amber-500', icon: '??' },
    { id: 2, name: 'Rara (250k)', chance: 25, value: '250k', color: 'text-emerald-500', icon: '??' },
    { id: 3, name: 'Epica (500k)', chance: 15, value: '500k', color: 'text-blue-500', icon: '??' },
    { id: 4, name: 'Lendaria (1M)', chance: 10, value: '1M', color: 'text-purple-500', icon: '??' },
    { id: 5, name: 'Mitica (2.5M)', chance: 1, value: '2.5M', color: 'text-red-500', icon: '??' }
];

async function run() {
    const casinoRef = ref(rtdb, 'config/casino');
    const powerRef = ref(rtdb, 'config/power_casino');
    if ((await get(casinoRef)).exists()) await update(casinoRef, { prizes }); else await set(casinoRef, { prizes });
    if ((await get(powerRef)).exists()) await update(powerRef, { prizes }); else await set(powerRef, { prizes });
    console.log('Firebase updated successfully!');
    process.exit(0);
}
run();
