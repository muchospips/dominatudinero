exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { nombre, instagram, email } = JSON.parse(event.body);

    if (!email || !nombre) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan campos requeridos' }) };
    }

    const API_KEY = process.env.SYSTEME_API_KEY;

    // 1. Crear contacto — usar lastName para guardar Instagram
    const contactRes = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        email: email,
        firstName: nombre,
        lastName: instagram || ''
      })
    });

    const contactText = await contactRes.text();
    let contactData;
    try { contactData = JSON.parse(contactText); } catch(e) { contactData = {}; }

    const contactId = contactData.id;

    if (!contactId) {
      return { statusCode: 200, body: JSON.stringify({ success: true, warning: 'Contact created but no ID returned' }) };
    }

    // 2. Buscar etiqueta "Masterclass DTD"
    const tagsRes = await fetch('https://api.systeme.io/api/tags?limit=50', {
      headers: { 'X-API-Key': API_KEY }
    });
    const tagsData = await tagsRes.json();
    const tag = tagsData.items?.find(t => t.name === 'Masterclass DTD');

    // 3. Asignar etiqueta
    if (tag && contactId) {
      await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ tagId: tag.id })
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, error: err.message })
    };
  }
};
