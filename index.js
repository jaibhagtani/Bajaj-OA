require('dotenv').config();
const fs = require('fs');
const path = require('path');
const webhookService = require('./webhookService');
const storage = require('./storage');

const NAME = process.env.NAME || 'John Doe';
const REGNO = process.env.REGNO || 'REG12347';
const EMAIL = process.env.EMAIL || 'john@example.com';
const GENERATE_URL = process.env.GENERATE_URL || 'https://bfhldevapigw.healthrx.co.in/hiring/generateWebhook/JAVA';
const WEBHOOK_OVERRIDE = process.env.WEBHOOK_OVERRIDE || '';
const STORAGE_FILE = process.env.STORAGE_FILE || './data/solutions.json';

(async function main() {
  try {
    console.log('Starting startup flow...');

    const dataDir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('Calling generateWebhook endpoint:', GENERATE_URL);
    const genResp = await webhookService.generateWebhook(GENERATE_URL, {
      name: NAME,
      regNo: REGNO,
      email: EMAIL
    });

    if (!genResp) {
      throw new Error('generateWebhook returned no response');
    }

    const webhookUrl = WEBHOOK_OVERRIDE || genResp.webhook || genResp.webhookUrl || genResp.webhook_url;
    const accessToken = genResp.accessToken || genResp.access_token || genResp.token;

    if (!webhookUrl || !accessToken) {
      console.error('Unexpected generateWebhook response:', genResp);
      throw new Error('generateWebhook response missing webhook or accessToken');
    }

    console.log('Received webhook URL:', webhookUrl);
    console.log('Received accessToken: (hidden) length=' + String(accessToken).length);

    const digitsOnly = (REGNO || '').replace(/\D/g, '');
    let lastTwo = 0;
    if (digitsOnly.length >= 2) {
      lastTwo = parseInt(digitsOnly.slice(-2), 10);
    } else if (digitsOnly.length === 1) {
      lastTwo = parseInt(digitsOnly, 10);
    } else {
      throw new Error('No digits found in REGNO: ' + REGNO);
    }
    const isOdd = lastTwo % 2 === 1;
    const questionNumber = isOdd ? 1 : 2;
    console.log(`REGNO '${REGNO}' => lastTwo=${lastTwo} => questionNumber=${questionNumber}`);

    const finalQueryQuestion1 = `
SELECT p.AMOUNT AS SALARY,
       CONCAT(e.FIRST_NAME, ' ', e.LAST_NAME) AS NAME,
       TIMESTAMPDIFF(YEAR, e.DOB, CURDATE()) AS AGE,
       d.DEPARTMENT_NAME
FROM PAYMENTS p
JOIN EMPLOYEE e ON p.EMP_ID = e.EMP_ID
JOIN DEPARTMENT d ON e.DEPARTMENT = d.DEPARTMENT_ID
WHERE DAY(p.PAYMENT_TIME) <> 1
  AND p.AMOUNT = (SELECT MAX(amount) FROM PAYMENTS WHERE DAY(payment_time) <> 1);
`.trim();

    const finalQuery = finalQueryQuestion1;

    const record = {
      timestamp: new Date().toISOString(),
      name: NAME,
      regNo: REGNO,
      questionNumber,
      finalQuery,
      webhookUrl,
      submitted: false,
      submitResponse: null
    };

    storage.saveRecord(STORAGE_FILE, record);
    console.log('Saved local record to', STORAGE_FILE);

    console.log('Submitting finalQuery to webhook...');
    const submitPayload = { finalQuery };
    const submitResp = await webhookService.submitSolution(webhookUrl, accessToken, submitPayload);

    console.log('Submit response status:', submitResp.status);
    console.log('Submit response data:', submitResp.data);

    record.submitted = true;
    record.submitResponse = {
      status: submitResp.status,
      data: submitResp.data
    };
    storage.saveRecord(STORAGE_FILE, record);
    console.log('Updated local record with submission response.');

    console.log('Startup flow completed successfully.');

  } catch (err) {
    console.error('Error in startup flow:', err.message);
    console.error(err.stack || err);
  }
})();
