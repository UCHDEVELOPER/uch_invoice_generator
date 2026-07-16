import process from 'process';

process.on('unhandledRejection', (err) => {
  console.error('[WORKER] Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[WORKER] Uncaught Exception:', err);
  process.exit(1);
});

// -------------------------------
// QUEUE WORKERS
// -------------------------------

import './job-import/jobImport.worker.js';


// -------------------------------
// CRON JOBS
// -------------------------------

import './invoice/weeklyInvoice.cron.js';

// -------------------------------
// SELF INVOICE CRON JOB
// -------------------------------

import './selfInvoice/weeklySelfInvoice.cron.js';

console.log('[WORKERS] All workers and cron jobs are running');
  
