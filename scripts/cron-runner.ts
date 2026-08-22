import { runAllScrapes } from "@/lib/cron/scrape"
import { prisma } from "@/lib/db"

const INTERVAL_MS = 6 * 60 * 60 * 1000

async function tick() {
  console.log(`[cron] mulai scrape (${new Date().toISOString()})`)
  try {
    const results = await runAllScrapes()
    console.log("[cron] selesai:", JSON.stringify(results))
  } catch (e) {
    console.error("[cron] error:", e)
  } finally {
    await prisma.$disconnect()
  }
}

tick()
setInterval(tick, INTERVAL_MS)
