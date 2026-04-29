import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

async function handler(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: { status: 'ok' }
  }
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler
})
