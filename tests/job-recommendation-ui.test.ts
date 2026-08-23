import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("components/job-fetcher.tsx", "utf8");

test("CV recommendation action generates roles and starts strict AI search", () => {
  assert.match(source, /Cari Rekomendasi Terbaik dari CV/);
  assert.match(source, /\/api\/jobs\/recommend-keywords/);
  assert.match(
    source,
    /await runSearch\(recommendedKeywords, recommendedLocation\)/,
  );
  assert.match(source, /AI only · skor minimal 70\/100 · maksimal 30 lowongan/);
});

test("recommendation results remain explicit-save previews", () => {
  assert.match(source, /\/api\/jobs\/recommendations/);
  assert.match(source, /tidak\s+tersimpan otomatis/);
  assert.match(source, /Belum ada lowongan dengan skor minimal 70/);
  assert.match(source, /AI gagal menilai semua lowongan/);
  assert.match(source, /Portal lowongan tidak dapat dijangkau/);
  assert.match(source, /Detail lowongan tidak dapat diambil/);
  assert.match(source, /Hasil rekomendasi tidak valid/);
  assert.match(source, /Pencarian terputus sebelum selesai/);
  assert.match(source, /Tidak ada skor heuristik yang digunakan/);
  assert.match(source, /Rekomendasi Terbaik/);
});
