import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import AppServerModule from './src/main.server';

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

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const workspaceAssetsFolder = resolve(process.cwd(), 'src', 'assets');
  const publicAssetsFolder = resolve(process.cwd(), 'public');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  server.get('/api/Dashboard/statistics', (_req, res) => {
    res.status(200).json(dashboardStatisticsResponse);
  });

  // Mock Auth/login endpoint for development
  server.post('/api/Auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Mock authentication - accept any username with minimum 8 character password
    if (username && password && password.length >= 8) {
      // Determine role based on username
      let role = 'employee';
      if (username.toLowerCase().includes('admin')) {
        role = 'admin';
      } else if (username.toLowerCase().includes('store') || username.toLowerCase().includes('keeper')) {
        role = 'storekeeper';
      } else if (username.toLowerCase().includes('manager')) {
        role = 'manager';
      } else if (username.toLowerCase().includes('compliance') || username.toLowerCase().includes('auditor')) {
        role = 'compliance-officer';
      }

      const mockUser = {
        id: 'user-' + Date.now(),
        username: username,
        fullName: username.charAt(0).toUpperCase() + username.slice(1),
        email: `${username}@afrocom.com`,
        roles: [role],
        permissions: [],
        isActive: true
      };

      const mockToken = 'mock-jwt-token-' + Date.now();
      
      res.status(200).json({
        success: true,
        succeeded: true,
        message: 'Login successful',
        data: {
          token: mockToken,
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          user: mockUser
        }
      });
    } else {
      res.status(401).json({
        success: false,
        succeeded: false,
        message: 'Invalid username or password',
        errors: ['Invalid username or password']
      });
    }
  });

  server.use(
    '/assets',
    express.static(workspaceAssetsFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  server.use(
    '/assets',
    express.static(publicAssetsFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  // Serve static files from /browser
  server.get(
    '*.*',
    express.static(browserDistFolder, {
      maxAge: '1y',
    }),
  );

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html: string) => res.send(html))
      .catch((err: Error) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
