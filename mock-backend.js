const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Mock Auth/login endpoint
app.post('/api/Auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('📤 [Mock Backend] Login attempt:', { username, passwordLength: password?.length });
  
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
    
    console.log('✅ [Mock Backend] Login successful for role:', role);
    
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
    console.log('❌ [Mock Backend] Login failed: Invalid credentials');
    res.status(401).json({
      success: false,
      succeeded: false,
      message: 'Invalid username or password',
      errors: ['Invalid username or password']
    });
  }
});

// Mock Dashboard/statistics endpoint
app.get('/api/Dashboard/statistics', (req, res) => {
  const dashboardStatisticsResponse = {
    success: true,
    message: 'Dashboard statistics loaded successfully.',
    statusCode: 200,
    data: {
      platform: {
        badge: 'Operations Platform 2026',
        title: "AFRICOM'S TECHNOLOGIES",
        since: 'SINCE 2004',
        subtitle: 'Coordinate assets, inventory, and requisitions from one command layer with policy-driven workflows and real-time visibility for every department.',
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
  
  res.status(200).json(dashboardStatisticsResponse);
});

app.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 API Endpoints available:`);
  console.log(`   POST http://localhost:${PORT}/api/Auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/Dashboard/statistics`);
});
