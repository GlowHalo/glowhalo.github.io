import { save, persist } from "./save";
import { firebaseConfig, isFirebaseConfigured } from "../config/firebase";

// 폰 교체·재설치 시 이어하기용 클라우드 백업. 계정/로그인이 없는 싱글플레이 게임이라
// "복구 코드"가 곧 접근 키다 — 코드를 아는 사람만 그 세이브를 덮어쓰거나 불러올 수 있다.

let dbPromise: Promise<import("firebase/firestore").Firestore> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp } = await import("firebase/app");
      const { getFirestore } = await import("firebase/firestore");
      const app = initializeApp(firebaseConfig);
      return getFirestore(app);
    })();
  }
  return dbPromise;
}

const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 0/O, 1/I/L 등 헷갈리는 문자 제외

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function getBackupCode(): string {
  return save.backupCode;
}

export { isFirebaseConfigured };

export async function backupNow(): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!isFirebaseConfigured()) return { ok: false, error: "클라우드 백업이 아직 설정되지 않았습니다." };
  try {
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const db = await getDb();
    if (!save.backupCode) {
      save.backupCode = generateCode();
      persist();
    }
    await setDoc(doc(db, "saves", save.backupCode), {
      data: JSON.stringify(save),
      updatedAt: serverTimestamp(),
    });
    return { ok: true, code: save.backupCode };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function restoreFromCode(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isFirebaseConfigured()) return { ok: false, error: "클라우드 백업이 아직 설정되지 않았습니다." };
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: "코드를 입력해주세요." };
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getDb();
    const snap = await getDoc(doc(db, "saves", trimmed));
    if (!snap.exists()) return { ok: false, error: "해당 코드의 백업을 찾을 수 없습니다." };
    const raw = snap.data().data as string;
    localStorage.setItem("circle-heroes-save-v1", raw);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
