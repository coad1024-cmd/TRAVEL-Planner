import { SynthesizerResult } from '@travel/shared';
import * as fs from 'fs';
import * as path from 'path';

const STORE_FILE = path.join(process.cwd(), '.trips.json');

function ensureStore() {
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({}));
  }
}

export async function saveTrip(id: string, data: any) {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  store[id] = data;
  fs.writeFileSync(STORE_FILE, JSON.stringify(store));
}

export async function getTrip(id: string): Promise<any | null> {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  return store[id] || null;
}

export async function getTrips(): Promise<any[]> {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  return Object.values(store).reverse();
}

