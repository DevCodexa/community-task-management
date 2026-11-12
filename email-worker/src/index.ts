import 'dotenv/config';
import cron from 'node-cron';
import { processEmailQueue } from './worker';
import { processGeneralEmailQueue } from './generalQueueWorker';

function logRaw(message: string): void {
  console.log('[EmailWorker] ' + message);
}

process.on('unhandledRejection', () => {
  logRaw('Unhandled rejection; inspect worker state.');
});

process.on('uncaughtException', () => {
  logRaw('Uncaught exception; inspect worker state.');
});

let processing = false;

async function processAllQueues(): Promise<void> {
  if (processing) {
    logRaw('Previous queue cycle is still running; overlapping cycle skipped.');
    return;
  }
  processing = true;
  try {
    // Keep speaker queue failures isolated from general transactional mail.
    try {
      await processEmailQueue();
    } catch {
      logRaw('Speaker queue cycle failed.');
    }

    try {
      await processGeneralEmailQueue();
    } catch {
      logRaw('General queue cycle failed.');
    }
  } finally {
    processing = false;
  }
}

async function start(): Promise<void> {
  console.log('[EmailWorker] Servis başlatıldı. Cron: her 5 dakikada bir.');
  await processAllQueues();

  cron.schedule('*/5 * * * *', async () => {
    await processAllQueues();
  });
}

void start();
