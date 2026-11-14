import fs from 'fs';
import path from 'path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env';

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8')
);

const app = initializeApp({ credential: cert(serviceAccount) });

export const firestore = getFirestore(app);
