// Ordered registry of every test (one per Bruno request file).
// "Run all" executes them top to bottom so chained variables populate
// (Plan Net discovery → OAuth → $inquire).
import { oauthTest } from "./oauth.js";
import { planNetTests } from "./planNet.js";
import { inquireTests } from "./inquire.js";

export const TESTS = [
  ...planNetTests, // 0–5 discovery (no auth)
  oauthTest,       // mint token
  ...inquireTests, // $inquire variants
];
