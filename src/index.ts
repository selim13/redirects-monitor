import * as fs from 'node:fs';
import 'dotenv/config';
import arg from 'arg';
import YAML from 'yaml';
import cron from 'node-cron';
import puppeteer from 'puppeteer-core';
import { log } from './logger';
import { Options, Site } from './types';
import { str2ms, timeout } from './helpers';
import { sendResults } from './results';

log.info('Starting up...');

for (const env of ['PUPPETEER_EXECUTABLE_PATH']) {
  if (!process.env[env]) {
    log.error(`Missing required env variable ${env}`);
    process.exit(1);
  }
}

const options: Options = {
  timeout: 10000,
  sites: [],
};

const args = arg({
  '--help': Boolean,
  '--config': String,

  // short aliases
  '-h': '--help',
  '-c': '--config',
});

if (args['--config']) {
  const configPath = args['--config'];
  if (!configPath) {
    process.stdout.write(`node index.js [-c config.yml]
Options:
  -c, --config Path to config yml file
`);
    process.exit(1);
  }

  if (!fs.existsSync(configPath)) {
    log.error(`Config file ${configPath} does not exist`);
    process.exit(1);
  }

  const configFile = fs.readFileSync(configPath, 'utf-8');
  const config = YAML.parse(configFile);

  if (config.userAgent) options.userAgent = config.userAgent;
  if (config.schedule) options.schedule = config.schedule;
  if (config.timeout) options.timeout = str2ms(config.timeout);
  if (config.sites) {
    for (const configSite of config.sites) {
      const site: Site = {
        name: configSite.name,
        url: configSite.url,
        timeout: configSite.timeout
          ? str2ms(configSite.timeout)
          : options.timeout,
        headers: configSite.headers || {},
        cookies: configSite.cookies || [],
      };

      if (configSite.onSuccess) {
        site.onSuccess = configSite.onSuccess.map((params: any) => ({
          url: params.url,
          method: params.method || 'POST',
          headers: params.headers || {},
        }));
      }

      if (configSite.onFailure) {
        site.onFailure = configSite.onFailure.map((params: any) => ({
          url: params.url,
          method: params.method || 'POST',
          headers: params.headers || {},
        }));
      }

      options.sites.push(site);
    }
  }
}

if (!options.sites.length) {
  log.error('No sites configured');
  process.exit(1);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  if (options.userAgent) page.setUserAgent(options.userAgent);
  // page.setViewport({ width: 320, height: 480 });
  page.setRequestInterception(true);

  let currentSite: Site | undefined;
  let visitedUrl: string | undefined;

  page.on('request', async (request) => {
    // Block loading of resources that should not affect redirections
    if (
      ['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())
    ) {
      return request.abort();
    }
    // Capture any request that is a navigation requests that attempts to load a new document
    // This will capture HTTP Status 301, 302, 303, 307, 308, HTML, and Javascript redirects
    if (
      request.isNavigationRequest() &&
      request.resourceType() === 'document' &&
      currentSite
    ) {
      const url = request.url();
      visitedUrl = url;
      log.debug(`Visiting ${url}`);
    }
    request.continue();
  });

  const visit = async () => {
    for (const site of options.sites) {
      currentSite = site;
      log.debug(`Navigating to ${site.url}...`);

      try {
        await page.setExtraHTTPHeaders(site.headers);
        await page.setCookie(...site.cookies);
        await page.goto(site.url);
        await timeout(site.timeout);
      } catch (error: any) {
        log.error(`Failed to navigate to ${site.url}: ${error.message}`);
        continue;
      }

      if (visitedUrl !== currentSite.url) {
        log.info(`Redirected from ${currentSite.url} to ${visitedUrl}`);
        if (currentSite.onFailure) {
          for (const callback of currentSite.onFailure) {
            const response = await sendResults(callback);
            if (response) {
              log.debug(
                `Sent fail result for ${callback.url}: ${await response.text()}`,
              );
            }
          }
        }
      } else {
        if (currentSite.onSuccess) {
          for (const callback of currentSite.onSuccess) {
            const response = await sendResults(callback);
            if (response) {
              log.debug(
                `Sent success result for ${callback.url}: ${await response.text()}`,
              );
            }
          }
        }
      }
    }
  };

  if (options.schedule) {
    log.info(`Cron schedule: ${options.schedule}`);

    cron.schedule(options.schedule, () => {
      log.debug(`Running cron task on schedule: ${options.schedule}`);
      visit();
    });
  } else {
    await visit();
    await browser.close();
  }
}

main().then(() => process.exit(0));
