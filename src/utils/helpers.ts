import { COLORS } from '@utils/const';

export function colorForUid(uid: string, palette: readonly string[] = COLORS) {
  const MOD = 2147483647; // 2^31 - 1 (prime)
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = (Math.imul(h, 31) + uid.charCodeAt(i)) % MOD;
  }
  const idx = Math.abs(h) % palette.length;
  return palette[idx];
}
