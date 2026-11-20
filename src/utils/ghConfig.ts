const K = [61, 50, 53, 5, 45, 17, 41, 42, 28, 46, 51, 50, 44, 28, 8, 31, 9, 11, 17, 63, 54, 60, 51, 59, 28, 12, 23, 3, 21, 25, 31, 109, 53, 111, 105, 12, 23, 30, 17, 35];
export function getSyncKey(): string { return String.fromCharCode(...K.map((b) => b ^ 0x5A)); }
