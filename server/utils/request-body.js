export async function readLimitedBody(event, limit = 4096) {
  if (Number(getHeader(event, 'content-length')) > limit) throw createError({ statusCode: 413, message: 'Solicitud demasiado grande.' });
  const chunks = [];
  let length = 0;
  for await (const chunk of event.node.req) {
    length += chunk.length;
    if (length > limit) throw createError({ statusCode: 413, message: 'Solicitud demasiado grande.' });
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw createError({ statusCode: 400, message: 'JSON no válido.' }); }
}
