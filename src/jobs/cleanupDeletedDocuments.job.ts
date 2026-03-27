import cron from "node-cron";
import prisma from "../utils/prisma.js";
import logger from "../utils/logger.js";
import { getStorageService } from "../utils/storage/index.js";

export async function cleanupDeletedDocuments(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const documentsToDelete = await prisma.document.findMany({
        where: {
            deletedAt: {
                lt: thirtyDaysAgo
            }
        },
        include: {
            versions: {
                where: {
                    storageKey: {
                        not: null as unknown as undefined
                    }
                }
            }
        }
    });

    let purged = 0;
    let errors = 0;

    const storageService = getStorageService();

    for (const doc of documentsToDelete) {
        if (!doc.versions) continue;
        for (const version of doc.versions) {
            try {
                if (version.storageKey) {
                    await storageService.delete(version.storageKey);
                }

                await prisma.documentVersion.update({
                    where: { id: version.id },
                    data: { storageKey: "" }
                });

                purged++;
            } catch (error) {
                errors++;
                logger.error(
                    { err: error },
                    `Failed to purge version ${version.id}`
                );
            }
        }
    }

    await prisma.document.deleteMany({
        where: {
            deletedAt: {
                lt: thirtyDaysAgo
            }
        }
    });

    logger.info(
        `Document cleanup complete: ${purged} versions purged, ${errors} errors`
    );
}

export function startCleanupCron(): void {
    const schedule = process.env.CLEANUP_CRON_SCHEDULE || "0 2 * * *";
    cron.schedule(schedule, cleanupDeletedDocuments);
    logger.info(`Cleanup cron scheduled: ${schedule}`);
}
