/**
 * Backfill Lenco metadata on existing Transaction records.
 *
 * For every completed Lenco-gateway Transaction that is missing the new
 * metadata.mobileMoneyReference / metadata.lenco fields, call Lenco's
 * verify API and merge the returned payload into Transaction.metadata.
 *
 * Read-only by default. Pass --apply to commit writes.
 *
 * Usage:
 *   cd server
 *   node src/scripts/backfillLencoMetadata.js              # dry run
 *   node src/scripts/backfillLencoMetadata.js --apply      # write
 *   node src/scripts/backfillLencoMetadata.js --apply --limit 50
 *
 * Notes:
 *   - Lenco's verify API is rate-limited; we wait 250ms between calls.
 *   - References that Lenco returns 404 / non-successful for are reported
 *     and skipped (Transaction is left unchanged). Common causes: legacy
 *     manual entries, sandbox/production env mismatch, or Lenco-side
 *     archival.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import Transaction from '../models/Transaction.js';

const APPLY = process.argv.includes('--apply');
const limitFlag = process.argv.indexOf('--limit');
const LIMIT = limitFlag !== -1 ? parseInt(process.argv[limitFlag + 1], 10) || 0 : 0;
const SLEEP_MS = 250;

const LENCO_BASE_URL = process.env.LENCO_BASE_URL || 'https://sandbox.lenco.co/access/v2/';
const LENCO_API_KEY = process.env.LENCO_API_KEY;

if (!LENCO_API_KEY) {
  console.error('LENCO_API_KEY not set — cannot call verify API');
  process.exit(1);
}

// Same extraction logic as lencoPaymentController.buildLencoMetadata.
// Kept duplicated so this script has no internal-controller import.
const buildLencoMetadata = (lencoData) => {
  if (!lencoData || typeof lencoData !== 'object') return {};
  const mm = lencoData.mobileMoney || lencoData.mobile_money || {};
  const bank = lencoData.bankPayment || lencoData.bank_payment || {};
  const card = lencoData.card || {};
  const operatorReference =
    lencoData.operatorReference ||
    lencoData.operator_reference ||
    lencoData.mobileMoneyReference ||
    lencoData.mobile_money_reference ||
    lencoData.senderReference ||
    lencoData.sender_reference ||
    mm.reference ||
    mm.operatorReference ||
    mm.providerReference ||
    bank.reference ||
    null;
  const channel =
    lencoData.paymentChannel ||
    lencoData.channel ||
    lencoData.method ||
    (mm && Object.keys(mm).length ? 'mobile-money' : null) ||
    (bank && Object.keys(bank).length ? 'bank' : null) ||
    (card && Object.keys(card).length ? 'card' : null) ||
    null;
  const payerMobile =
    mm.phone || mm.mobileNumber || mm.msisdn ||
    lencoData.customerPhone || lencoData.customer_phone ||
    lencoData.payer?.phone || null;
  const payerProvider = mm.operator || mm.provider || mm.network || null;
  return {
    lenco: lencoData,
    mobileMoneyReference: operatorReference,
    paymentChannel: channel,
    payerMobileNumber: payerMobile,
    payerMobileMoneyOperator: payerProvider,
  };
};

const channelToPaymentMethod = (channel) => {
  if (!channel) return null;
  const c = String(channel).toLowerCase();
  if (c.includes('mobile')) return 'mobile_money';
  if (c.includes('bank')) return 'bank_transfer';
  if (c.includes('card')) return 'card';
  return null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const verifyLenco = async (reference) => {
  const url = `${LENCO_BASE_URL}collections/status/${reference}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${LENCO_API_KEY}`, 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
  return res;
};

const run = async () => {
  await connectDatabase();
  console.log(`Connected — mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  console.log(`Lenco endpoint: ${LENCO_BASE_URL}\n`);

  // Candidates: Lenco-gateway, completed, and missing the new metadata.
  const filter = {
    paymentGateway: 'lenco',
    status: 'completed',
    $or: [
      { 'metadata.mobileMoneyReference': { $exists: false } },
      { 'metadata.mobileMoneyReference': null },
      { 'metadata.lenco': { $exists: false } },
    ],
  };

  let q = Transaction.find(filter).sort({ createdAt: 1 });
  if (LIMIT > 0) q = q.limit(LIMIT);
  const candidates = await q.lean();
  console.log(`Found ${candidates.length} candidate transaction(s).\n`);

  if (candidates.length === 0) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  let unchanged = 0;
  let notFound = 0;
  let errored = 0;
  const errors = [];

  for (let i = 0; i < candidates.length; i++) {
    const t = candidates[i];
    const tag = `[${i + 1}/${candidates.length}]`;
    try {
      const res = await verifyLenco(t.reference);
      // Lenco's "not found" response is HTTP 400 with errorCode 10 and a
      // body of { status: false, message: "Collection details was not
      // found" }. Treat that — and HTTP 404 — as a soft miss, not an error.
      const isNotFound =
        res.status === 404 ||
        (res.status === 400 && res.data?.errorCode === '10') ||
        res.data?.status === 'not-found' ||
        /not found/i.test(res.data?.message || '');
      if (isNotFound) {
        console.log(`${tag} ⚠ ${t.reference}: not found in Lenco (HTTP ${res.status}${res.data?.message ? `, "${res.data.message}"` : ''})`);
        notFound++;
        await sleep(SLEEP_MS);
        continue;
      }
      if (res.status !== 200 || res.data?.status === false) {
        console.log(`${tag} ✗ ${t.reference}: HTTP ${res.status}`);
        errored++;
        errors.push({ reference: t.reference, http: res.status, body: res.data });
        await sleep(SLEEP_MS);
        continue;
      }

      // Lenco wraps the payload as either { data: {...} } or top-level.
      const lencoData = res.data?.data || res.data;
      const lencoMeta = buildLencoMetadata(lencoData);

      // Skip if there's nothing new to merge in
      if (!lencoMeta.lenco) {
        console.log(`${tag} ⚠ ${t.reference}: no usable payload returned`);
        unchanged++;
        await sleep(SLEEP_MS);
        continue;
      }

      const mergedMetadata = { ...(t.metadata || {}), ...lencoMeta };
      const inferredMethod = channelToPaymentMethod(lencoMeta.paymentChannel);

      const update = { metadata: mergedMetadata };
      // Only set paymentMethod if we still have the default 'card' AND we
      // have a more specific inference. Don't override admin-set values.
      if (
        inferredMethod &&
        inferredMethod !== t.paymentMethod &&
        (t.paymentMethod === 'card' || !t.paymentMethod)
      ) {
        update.paymentMethod = inferredMethod;
      }

      console.log(
        `${tag} ✓ ${t.reference} → mobileMoneyRef=${lencoMeta.mobileMoneyReference || '(none)'} ` +
          `channel=${lencoMeta.paymentChannel || '(unknown)'}` +
          (update.paymentMethod ? ` paymentMethod=${update.paymentMethod}` : '')
      );

      if (APPLY) {
        await Transaction.findByIdAndUpdate(t._id, { $set: update });
      }
      updated++;
    } catch (err) {
      console.error(`${tag} ✗ ${t.reference}: ${err.message}`);
      errored++;
      errors.push({ reference: t.reference, error: err.message });
    }

    await sleep(SLEEP_MS);
  }

  console.log('\n--- Summary ---');
  console.log(`Updated      : ${updated}${APPLY ? '' : ' (dry run — not written)'}`);
  console.log(`Unchanged    : ${unchanged}`);
  console.log(`Not in Lenco : ${notFound}`);
  console.log(`Errored      : ${errored}`);

  if (errors.length) {
    console.log('\nErrors:');
    for (const e of errors) {
      console.log(JSON.stringify(e));
    }
  }

  if (!APPLY) {
    console.log('\nDRY RUN — re-run with --apply to commit writes.');
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Script failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
