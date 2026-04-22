import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oldFirebaseConfig = {
  apiKey: 'AIzaSyA9E6Hrkbfnex1YvxJVplbf49RdEa8dcMc',
  authDomain: 'deadbb-2d5a8.firebaseapp.com',
  projectId: 'deadbb-2d5a8',
};

const newFirebaseConfig = {
  apiKey: 'AIzaSyBsH0thsRXAti-gbnsJLpIAMroe7PTyL2I',
  authDomain: 'deadclanbb-1f05e.firebaseapp.com',
  databaseURL: 'https://deadclanbb-1f05e-default-rtdb.firebaseio.com',
  projectId: 'deadclanbb-1f05e',
  storageBucket: 'deadclanbb-1f05e.firebasestorage.app',
  messagingSenderId: '208227509819',
  appId: '1:208227509819:web:ca440d6a17cebd901a5e1e',
};

function normalizeValue(value) {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date ? date.getTime() : Date.now();
    }

    if (typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeValue(v);
    }
    return out;
  }

  return value;
}

async function getCollectionAsMap(db, name) {
  const snap = await getDocs(collection(db, name));
  const out = {};
  snap.forEach((d) => {
    out[d.id] = normalizeValue(d.data());
  });
  return out;
}

async function getConfigDoc(db, id) {
  const snap = await getDoc(doc(db, 'config', id));
  return snap.exists() ? normalizeValue(snap.data()) : null;
}

async function main() {
  console.log('Lendo dados antigos do Firestore...');
  const oldApp = initializeApp(oldFirebaseConfig, 'old-firestore-migration');
  const oldDb = getFirestore(oldApp);

  const [usuarios, roletas, powerRoletas, casinoConfig, powerCasinoConfig] = await Promise.all([
    getCollectionAsMap(oldDb, 'usuarios'),
    getCollectionAsMap(oldDb, 'roletas'),
    getCollectionAsMap(oldDb, 'power_roletas'),
    getConfigDoc(oldDb, 'casino'),
    getConfigDoc(oldDb, 'power_casino'),
  ]);

  const payload = {
    usuarios,
    roletas,
    power_roletas: powerRoletas,
    config: {
      casino: casinoConfig,
      power_casino: powerCasinoConfig,
    },
  };

  const exportPath = path.join(__dirname, 'migration_export.json');
  await fs.writeFile(exportPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Export salvo em: ${exportPath}`);
  console.log(`Usuarios: ${Object.keys(usuarios).length}`);
  console.log(`Roletas: ${Object.keys(roletas).length}`);
  console.log(`Power roletas: ${Object.keys(powerRoletas).length}`);

  const adminEmail = process.env.MIGRATION_EMAIL;
  const adminPassword = process.env.MIGRATION_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('Sem MIGRATION_EMAIL/MIGRATION_PASSWORD. Encerrando em modo export-only.');
    return;
  }

  console.log('Autenticando no projeto novo para gravar no RTDB...');
  const newApp = initializeApp(newFirebaseConfig, 'new-rtdb-migration');
  const auth = getAuth(newApp);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  const rtdb = getDatabase(newApp);

  console.log('Gravando dados no Realtime Database novo...');
  await Promise.all([
    set(ref(rtdb, 'usuarios'), usuarios),
    set(ref(rtdb, 'roletas'), roletas),
    set(ref(rtdb, 'power_roletas'), powerRoletas),
    casinoConfig ? set(ref(rtdb, 'config/casino'), casinoConfig) : Promise.resolve(),
    powerCasinoConfig ? set(ref(rtdb, 'config/power_casino'), powerCasinoConfig) : Promise.resolve(),
  ]);

  console.log('Migracao concluida com sucesso.');
}

main().catch((err) => {
  console.error('Falha na migracao:', err?.code || err?.message || err);
  process.exit(1);
});
