import { describe, expect, it } from "vitest";

import { isPublicAddress } from "../extensions/lib/publicAddress.ts";

describe("isPublicAddress", () => {
  it.each(["8.8.8.8", "140.82.112.3", "2606:4700::6810:85e5"])("%s は公開アドレス", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.17.0.1",
    "192.168.1.10",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "localhost",
  ])("%s は手元・社内向けなので断る", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
});
