import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

// The dashboard name is jeju-oreum-passport-blob. SDK authentication selects
// the actual store through BLOB_STORE_ID + OIDC or BLOB_READ_WRITE_TOKEN.
export function createBlobRepository({ path = 'oreum/v1/notebooks.json', sdk = { get, put } } = {}) {
  const options = { access: 'private' };
  async function read() {
    const result = await sdk.get(path, { ...options, useCache: false });
    if (!result) return { data: { version: 1, notebooks: [] }, etag: null };
    if (result.statusCode !== 200 || !result.stream || !result.blob.etag) throw new Error('Blob read failed');
    const data = await new Response(result.stream).json();
    if (data.version !== 1 || !Array.isArray(data.notebooks)) throw new Error('Invalid notebook store');
    return { data, etag: result.blob.etag };
  }
  return {
    read,
    async write(data, etag) {
      try {
        await sdk.put(path, JSON.stringify(data), { ...options, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}) });
        return true;
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) return false;
        // Two cold instances may both see a missing store. Never overwrite
        // the winner's first notebook; read its version and retry instead.
        if (!etag && (await read()).etag) return false;
        throw error;
      }
    }
  };
}
