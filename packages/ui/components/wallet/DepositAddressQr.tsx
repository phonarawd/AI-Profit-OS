"use client";

type DepositAddressQrProps = {
  address: string;
  label: string;
};

/** Wallet V2 QR — 실제 주소만 그림. Canvas/WebGL 0. */
export function DepositAddressQr({ address, label }: DepositAddressQrProps) {
  const modules = encodeQr(address);
  const size = modules.length;
  const cells = modules
    .flatMap((row, y) =>
      row.flatMap((on, x) =>
        on ? `<rect x="${x}" y="${y}" width="1" height="1" />` : [],
      ),
    )
    .join("");

  return (
    <figure data-testid="deposit-address-qr">
      <div
        dangerouslySetInnerHTML={{
          __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="180" height="180" role="img" aria-label="${escapeAttr(label)}"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#08111f">${cells}</g></svg>`,
        }}
      />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

const GF = 256;
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x *= 2;
    if (x >= GF) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsPoly(ec: number): number[] {
  let poly = [1];
  for (let i = 0; i < ec; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ec: number): number[] {
  const gen = rsPoly(ec);
  const res = data.slice();
  for (let i = 0; i < ec; i += 1) res.push(0);
  for (let i = 0; i < data.length; i += 1) {
    const coef = res[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j += 1) {
      res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
}

function encodeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = bytes.length <= 14 ? 1 : bytes.length <= 26 ? 2 : 3;
  const size = 21 + (version - 1) * 4;
  const ec = version === 1 ? 7 : version === 2 ? 10 : 15;
  const dataCodewords = version === 1 ? 19 : version === 2 ? 34 : 55;
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, dataCodewords * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | (bits[i + j] ?? 0);
    data.push(v);
  }
  const pad = [0xec, 0x11];
  let p = 0;
  while (data.length < dataCodewords) {
    data.push(pad[p % 2]);
    p += 1;
  }
  const ecc = rsEncode(data, ec);
  const code = data.concat(ecc);
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const set = (x: number, y: number, on: boolean, lock = false) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = on;
    if (lock) reserved[y][x] = true;
  };
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const on = x >= 0 && x <= 6 && y >= 0 && y <= 6
          && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        set(ox + x, oy + y, on, true);
      }
    }
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);
  for (let i = 8; i < size - 8; i += 1) {
    set(i, 6, i % 2 === 0, true);
    set(6, i, i % 2 === 0, true);
  }
  set(8, size - 8, true, true);
  let bit = 0;
  const totalBits = code.length * 8;
  const getBit = (i: number) => ((code[Math.floor(i / 8)] ?? 0) >> (7 - (i % 8))) & 1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let n = 0; n < size; n += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        const x = col - dx;
        const upward = ((size - 1 - col) / 2) % 2 === 0;
        const y = upward ? size - 1 - n : n;
        if (reserved[y][x] || bit >= totalBits) continue;
        const mask = (y + x) % 2 === 0;
        set(x, y, Boolean(getBit(bit)) !== mask);
        bit += 1;
      }
    }
  }
  return modules;
}
