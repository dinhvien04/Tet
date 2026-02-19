import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

/**
 * Health Check Endpoint
 * 
 * Returns the health status of the application and its dependencies.
 * Used for monitoring and uptime checks.
 */
export async function GET() {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: 'unknown',
      api: 'healthy',
    },
    responseTime: 0,
  };

  try {
    // Check MongoDB connection
    const dbStartTime = Date.now();
    await connectDB();
    const dbResponseTime = Date.now() - dbStartTime;
    
    health.checks.database = dbResponseTime < 1000 ? 'healthy' : 'slow';
    
    // Calculate total response time
    health.responseTime = Date.now() - startTime;
    
    // Determine overall status
    if (health.checks.database === 'healthy') {
      health.status = 'healthy';
      return NextResponse.json(health, { status: 200 });
    } else {
      health.status = 'degraded';
      return NextResponse.json(health, { status: 200 });
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = 'unhealthy';
    health.responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        ...health,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
