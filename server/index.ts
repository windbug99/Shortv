import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize temporary file cleanup service
  const { initializeTempFileCleanup } = await import('./tempFileCleanup.js');
  initializeTempFileCleanup();
  
  // Database integrity check and cleanup on startup
  const { validateDatabaseIntegrity, cleanupOrphanedRecords } = await import('./dbCleanup.js');
  const cron = await import('node-cron');
  
  const integrityCheck = await validateDatabaseIntegrity();
  if (integrityCheck.orphanedVideos > 0 || integrityCheck.orphanedUpvotes > 0 || integrityCheck.orphanedSubscriptions > 0) {
    console.log('데이터베이스 무결성 문제 발견, 자동 정리 시작...');
    await cleanupOrphanedRecords();
  }
  
  // Schedule daily integrity check at 3 AM
  cron.default.schedule('0 3 * * *', async () => {
    console.log('일일 데이터베이스 무결성 검사 시작...');
    const dailyCheck = await validateDatabaseIntegrity();
    if (dailyCheck.orphanedVideos > 0 || dailyCheck.orphanedUpvotes > 0 || dailyCheck.orphanedSubscriptions > 0) {
      console.log(`고아 레코드 발견: 영상 ${dailyCheck.orphanedVideos}개, 업보트 ${dailyCheck.orphanedUpvotes}개, 구독 ${dailyCheck.orphanedSubscriptions}개`);
      await cleanupOrphanedRecords();
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable or default to 5000
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Trying next available port...`);
      server.listen(0, "0.0.0.0", () => {
        const actualPort = (server.address() as any)?.port;
        log(`serving on port ${actualPort}`);
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
