// 암호화 유틸리티 (NFR-01/02)
// - 데이터 at-rest 암호화: AES-256-GCM
// - 키 관리: 봉투 암호화. 랜덤 DEK(Data Encryption Key)를 각 사용자
//   비밀번호에서 PBKDF2로 파생한 KEK로 래핑한다.
//   → DEK/비밀번호는 디스크에 평문 저장되지 않으며, 세션 메모리에만 존재.
//   (계획서 NFR-02의 "OS 키스토어 + 로그인 결합"을 웹 환경에서 구현 가능한
//    형태로 옮긴 것. 데스크톱 패키징 시 OS Keychain/DPAPI로 대체 예정.)

const PBKDF2_ITERATIONS = 310_000 // OWASP 권장(SHA-256)
const SALT_BYTES = 16
const IV_BYTES = 12

export interface Encrypted {
  iv: string // base64
  ct: string // base64 (ciphertext + GCM tag)
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Web Crypto는 BufferSource(ArrayBuffer)를 요구. TS 5.7의 Uint8Array<ArrayBufferLike>
// 제네릭과의 마찰을 피하기 위해 명시적 ArrayBuffer로 변환한다.
function ab(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
}
function encBuf(s: string): ArrayBuffer {
  return ab(enc.encode(s))
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

export function newSalt(): string {
  return toB64(randomBytes(SALT_BYTES))
}

/** 비밀번호 → KEK (Key Encryption Key) 파생 (PBKDF2-SHA256) */
async function deriveKek(password: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encBuf(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: ab(fromB64(saltB64)),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt'],
  )
}

/** 새 DEK(데이터 암호화 키) 생성 (추출 가능 — 래핑을 위해) */
export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

export interface WrappedDek {
  salt: string
  iv: string
  wrapped: string // base64 of wrapped raw key
}

/** DEK를 비밀번호 파생 KEK로 래핑 (사용자 등록/비밀번호 변경 시) */
export async function wrapDek(dek: CryptoKey, password: string): Promise<WrappedDek> {
  const salt = newSalt()
  const kek = await deriveKek(password, salt)
  const iv = randomBytes(IV_BYTES)
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, {
    name: 'AES-GCM',
    iv: ab(iv),
  })
  return { salt, iv: toB64(iv), wrapped: toB64(wrapped) }
}

/** 비밀번호로 DEK 복원 (로그인). 실패 시 throw → 비밀번호 불일치. */
export async function unwrapDek(w: WrappedDek, password: string): Promise<CryptoKey> {
  const kek = await deriveKek(password, w.salt)
  return crypto.subtle.unwrapKey(
    'raw',
    ab(fromB64(w.wrapped)),
    kek,
    { name: 'AES-GCM', iv: ab(fromB64(w.iv)) },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 임의 객체를 DEK로 암호화 (JSON 직렬화 후 AES-256-GCM) */
export async function encryptJson(dek: CryptoKey, value: unknown): Promise<Encrypted> {
  const iv = randomBytes(IV_BYTES)
  const data = encBuf(JSON.stringify(value))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ab(iv) }, dek, data)
  return { iv: toB64(iv), ct: toB64(ct) }
}

/** DEK로 복호화 → 객체 */
export async function decryptJson<T = unknown>(
  dek: CryptoKey,
  e: Encrypted,
): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ab(fromB64(e.iv)) },
    dek,
    ab(fromB64(e.ct)),
  )
  return JSON.parse(dec.decode(pt)) as T
}

/** SHA-256 → hex (문서 해시·감사로그 체인용) */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encBuf(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
