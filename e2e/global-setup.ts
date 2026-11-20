import { request } from '@playwright/test';

/**
 * e2e runs against the real API, not a mock. Fail before the browser starts
 * with an actionable sentence instead of a page of 401s.
 */
export default async function globalSetup(): Promise<void> {
  const api = await request.newContext();

  try {
    const response = await api.get('http://localhost:5072/health/live', { timeout: 5_000 });

    if (!response.ok()) {
      throw new Error(`health/live answered ${response.status()}`);
    }
  } catch (error) {
    throw new Error(
      'The backend is not running. Start it first: ' +
        '`dotnet run --project ../backend/src/Digibit.Api --urls http://localhost:5072`. ' +
        `(${String(error)})`,
    );
  } finally {
    await api.dispose();
  }
}
