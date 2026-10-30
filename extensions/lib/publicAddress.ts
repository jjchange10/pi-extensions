import { isIP } from "node:net";

/**
 * インターネットに公開されたアドレスかを調べる。
 *
 * pi を動かしている機械には、外から触られたくない受け口がある（hayato なら hayato-send の受け口、
 * クラウドならインスタンスの設定情報など）。Web の道具からそこへ届かないよう、手元・社内向けのアドレスには取りに行かない。
 */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIPv4(address);
  if (version === 6) return isPublicIPv6(address);
  return false;
}

function isPublicIPv4(address: string): boolean {
  const [a = 0, b = 0] = address.split(".").map(Number);
  const isPrivate =
    a === 0 || // この機械そのもの
    a === 10 || // 社内向け
    a === 127 || // 手元（localhost）
    (a === 100 && b >= 64 && b <= 127) || // 通信事業者の内側
    (a === 169 && b === 254) || // リンクローカル（クラウドの設定情報の受け口もここ）
    (a === 172 && b >= 16 && b <= 31) || // 社内向け（Docker の内側もここ）
    (a === 192 && b === 168) || // 家庭・社内向け
    a >= 224; // マルチキャストと予約済み
  return !isPrivate;
}

function isPublicIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  // IPv4 を IPv6 の形で書いたもの（::ffff:127.0.0.1 など）は、IPv4 として調べる
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped?.[1] !== undefined) return isPublicIPv4(mapped[1]);
  const isPrivate =
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") || // 社内向け
    lower.startsWith("fd") ||
    /^fe[89ab]/.test(lower) || // リンクローカル
    lower.startsWith("ff"); // マルチキャスト
  return !isPrivate;
}
