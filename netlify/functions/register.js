const https = require('https');

function httpsPost(url, data, headers) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { nombre, instagram, email } = JSON.parse(event.body);

    if (!email || !nombre) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Faltan campos requeridos' }) };
    }

    const API_KEY = process.env.SYSTEME_API_KEY;

    // 1. Crear contacto
    const contactPayload = {
      email: String(email).trim(),
      firstName: String(nombre).trim(),
      lastName: String(instagram || '').trim()
    };

    console.log('Sending to Systeme:', JSON.stringify(contactPayload));

    const contactRes = await httpsPost(
      'https://api.systeme.io/api/contacts',
      contactPayload,
      { 'X-API-Key': API_KEY }
    );

    console.log('Contact response:', contactRes.status, contactRes.body);

    let contactData = {};
    try { contactData = JSON.parse(contactRes.body); } catch(e) {}
    const contactId = contactData.id;

    if (contactId) {
      // 2. Buscar etiqueta
      const tagsRes = await httpsGet(
        'https://api.systeme.io/api/tags?limit=50',
        { 'X-API-Key': API_KEY }
      );
      let tagsData = {};
      try { tagsData = JSON.parse(tagsRes.body); } catch(e) {}
      const tag = tagsData.items?.find(t => t.name === 'Masterclass DTD');

      // 3. Asignar etiqueta
      if (tag) {
        await httpsPost(
          `https://api.systeme.io/api/contacts/${contactId}/tags`,
          { tagId: tag.id },
          { 'X-API-Key': API_KEY }
        );
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.log('Error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  }
};
