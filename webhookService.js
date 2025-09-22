const axios = require('axios');

async function generateWebhook(url, payload) {
  try {
    const resp = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });
    return resp.data;
  } catch (err) {
    if (err.response) {
      const info = { status: err.response.status, data: err.response.data };
      throw new Error('generateWebhook error: ' + JSON.stringify(info));
    }
    throw err;
  }
}

async function submitSolution(webhookUrl, accessToken, body) {
  try {
    const resp = await axios.post(webhookUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken
      },
      timeout: 20000
    });
    return resp;
  } catch (err) {
    if (err.response) {
      return { status: err.response.status, data: err.response.data };
    }
    throw err;
  }
}

module.exports = {
  generateWebhook,
  submitSolution
};
