import { getCredentialStatus, saveCredentials, CREDENTIAL_SCHEMA } from '../../lib/credentials.js';
import { withAdminAuth } from '../../lib/auth.js';

const ALLOWED_KEYS = new Set(Object.keys(CREDENTIAL_SCHEMA));

function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(getCredentialStatus());
  }

  if (req.method === 'PUT') {
    const updates = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      if (ALLOWED_KEYS.has(key)) updates[key] = value;
    }
    saveCredentials(updates);
    return res.status(200).json(getCredentialStatus());
  }

  res.status(405).end();
}

// GET is public (status only, no secret values exposed).
// PUT writes credentials — admin only.
export default function credentialsHandler(req, res) {
  if (req.method === 'PUT') return withAdminAuth(handler)(req, res);
  return handler(req, res);
}
