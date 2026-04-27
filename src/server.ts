import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const workspaceAssetsFolder = join(process.cwd(), 'src', 'assets');
const publicAssetsFolder = join(process.cwd(), 'public');

const app = express();
const angularApp = new AngularNodeAppEngine();

const dashboardStatisticsResponse = {
  success: true,
  message: 'Dashboard statistics loaded successfully.',
  statusCode: 200,
  data: {
    platform: {
      badge: 'Operations Platform 2026',
      title: "AFRICOM'S TECHNOLOGIES",
      since: 'SINCE 2004',
      subtitle:
        'Coordinate assets, inventory, and requisitions from one command layer with policy-driven workflows and real-time visibility for every department.',
    },
    liveAttendees: {
      total: 14666,
      trendPercent: 12.5,
      trendDirection: 'up',
      comparisonLabel: 'vs last month',
      countdown: {
        days: 20,
        hours: 14,
        minutes: 6,
        seconds: 37,
        untilLabel: 'Until May 14th, 2026',
      },
    },
    highlights: [
      {
        value: '500+',
        label: 'Active Sites',
        note: 'Across all regions',
      },
      {
        value: '99.9%',
        label: 'Data Accuracy',
        note: 'Trusted and verified',
      },
      {
        value: '24/7',
        label: 'Operations Visibility',
        note: 'Real-time monitoring',
      },
    ],
  },
};

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */
app.get('/api/Dashboard/statistics', (_req, res) => {
  res.status(200).json(dashboardStatisticsResponse);
});

/**
 * Serve static files from /browser
 */
app.use(
  '/assets',
  express.static(workspaceAssetsFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use(
  '/assets',
  express.static(publicAssetsFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
