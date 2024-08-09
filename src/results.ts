import { Headers } from './types';
import { log } from './logger';

export type ResultsCallback = {
  url: string;
  method: string;
  headers: Headers;
};

export async function sendResults(
  request: ResultsCallback,
): Promise<Response | null> {
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      log.error(
        `Failed to send results for ${request.url}: ${response.status} ${response.statusText}`,
      );

      return null;
    }

    return response;
  } catch (error: any) {
    log.error(
      `Failed to send results for ${request.url}: ${error.name} ${error.message}`,
    );
  }

  return null;
}
