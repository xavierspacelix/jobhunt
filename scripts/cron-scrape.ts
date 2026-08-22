import { runAllScrapes } from "@/lib/cron/scrape"
import { prisma } from "@/lib/db"

async function main() {
  console.log("[cron] memulai scrape otomatis (Docker cron)")
  const results = await runAllScrapes()
  console.log("[cron] selesai:", JSON.stringify(results, null, 2))
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("[cron] error:", e)
  await prisma.$disconnect()
  process.exit(1)
})
