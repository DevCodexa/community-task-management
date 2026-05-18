import 'dotenv/config';
import cron from 'node-cron';
import { processEmailQueue } from './worker';

function logRaw(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[EmailWorker] ${message}`);
}

process.on('unhandledRejection', (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  logRaw(`unhandledRejection: ${msg}`);
});

process.on('uncaughtException', (err: Error) => {
  logRaw(`uncaughtException: ${err.message}`);
});

async function start(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[EmailWorker] Servis başlatıldı. Cron: her 5 dakikada bir.');

  // Start immediately
  await processEmailQueue();

  cron.schedule('*/5 * * * *', async () => {
    try {
      await processEmailQueue();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logRaw(`processEmailQueue error: ${msg}`);
    }
  });
}

void start();

