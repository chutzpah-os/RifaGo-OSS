/**
 * Static PIX BR Code (EMV QR Code) payload generator, per Banco Central spec.
 * No payment gateway involved — this only builds the "copia e cola" string;
 * settlement is confirmed manually by the admin.
 */

interface GeneratePixPayloadInput {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid: string;
}

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

function sanitize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, maxLength)
    .trim();
}

export function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generatePixPayload({
  key,
  merchantName,
  merchantCity,
  amountCents,
  txid,
}: GeneratePixPayloadInput): string {
  const merchantAccountInfo = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  const additionalData = tlv("05", txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***");

  const fields = [
    tlv("00", "01"), // Payload Format Indicator
    tlv("26", merchantAccountInfo),
    tlv("52", "0000"), // Merchant Category Code
    tlv("53", "986"), // Currency: BRL
    tlv("54", (amountCents / 100).toFixed(2)),
    tlv("58", "BR"),
    tlv("59", sanitize(merchantName, 25) || "RECEBEDOR"),
    tlv("60", sanitize(merchantCity, 15) || "BRASIL"),
    tlv("62", additionalData),
  ].join("");

  const withCrcPlaceholder = `${fields}6304`;
  const crc = crc16ccitt(withCrcPlaceholder);
  return `${withCrcPlaceholder}${crc}`;
}
