import { randomBytes } from "node:crypto";

export function newToken() {
  return randomBytes(9).toString("base64url");
}

export function newProtocolo() {
  return `JBL-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}
