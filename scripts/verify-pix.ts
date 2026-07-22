/**
 * Sanity check for lib/pix.ts against the worked example from the Banco
 * Central "Manual de Padrões para Iniciação do Pix" (BR Code / EMV spec).
 * Run with: npx tsx scripts/verify-pix.ts
 */
import { generatePixPayload, crc16ccitt } from "../lib/pix";

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    console.error(`FAIL ${label}\n  expected: ${expected}\n  actual:   ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label}`);
  }
}

// Payload shape from the BCB "Manual de Padrões para Iniciação do Pix" worked
// example (field structure/order, not the CRC value — see note below).
const knownPayloadWithoutCrc =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
  "520400005303986540510.005802BR5913FULANO DE TAL6008BRASILIA62070503***6304";

// CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) for the payload above,
// cross-checked with an independent Python implementation (not from memory).
assertEqual(crc16ccitt(knownPayloadWithoutCrc), "C5A0", "CRC16 cross-checked against independent Python impl");

const payload = generatePixPayload({
  key: "123e4567-e12b-12d1-a456-426655440000",
  merchantName: "Fulano de Tal",
  merchantCity: "Brasilia",
  amountCents: 1000,
  txid: "***",
});
assertEqual(payload, `${knownPayloadWithoutCrc}C5A0`, "generatePixPayload end-to-end");

// Real-world usage shape: accented name/city get stripped to plain ASCII,
// amount in cents formats to two decimals, txid alnum-only.
const realistic = generatePixPayload({
  key: "11987654321",
  merchantName: "Fulano de Tal",
  merchantCity: "São Paulo",
  amountCents: 4000,
  txid: "abcXYZ123",
});
assertEqual(String(realistic.includes("SAO PAULO")), "true", "city accent stripped");
assertEqual(String(realistic.includes("540540.00")), "true", "amount field is 40.00 for 4000 cents");
console.log(realistic);
