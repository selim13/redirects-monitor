import { CookieParam } from 'puppeteer-core';
import { ResultsCallback } from './results';

export type Headers = { [key: string]: string };
export type Cookie = CookieParam;

export type Site = {
  name: string;
  url: string;
  timeout: number;
  headers: Headers;
  cookies: Cookie[];
  onSuccess?: ResultsCallback[];
  onFailure?: ResultsCallback[];
};

export type Options = {
  schedule?: string;
  userAgent?: string;
  timeout: number;
  sites: Site[];
};
