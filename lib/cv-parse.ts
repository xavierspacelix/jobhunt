export async function parsePdf(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = mod.default as unknown as (
    buf: Buffer,
  ) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result?.text ?? "";
}
