import "./instrumentation";
import app, { configure, sessionMiddleware } from "./app";
import http from "http";
import Logger from "@/utils/logger";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./routes/socketEventTypes";
import passport from "passport";
import EventRouter from "./routes/socketEvents";
import type { NextFunction, Request, Response } from "express";
import { HTTP403Error } from "./utils/errors/Errors";
import { CORS_ORIGIN } from "./utils/originConfig";
import * as Sentry from "@sentry/node";

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  pingInterval: 15_000,
  pingTimeout: 20_000,
  transports: ["websocket", "webtransport" /* , 'polling' */],
});

// convert a connect middleware to a Socket.IO middleware
// io.use((socket, next) => {
//   sessionMiddleware(
//     socket.request as Request,
//     {} as Response,
//     next as NextFunction
//   );
// });
// io.use((socket, next) => {
//   passport.initialize()(
//     socket.request as Request,
//     {} as Response,
//     next as NextFunction
//   );
// });
// io.use((socket, next) => {
//   passport.session()(
//     socket.request as Request,
//     {} as Response,
//     next as NextFunction
//   );
// });

EventRouter(io);

// only allow authenticated users in socketio
io.use((socket, next) => {
  if ((socket.request as any).user) {
    next();
  } else {
    next(new HTTP403Error("unauthorized"));
  }
});

// Make io accessible to our router
app.use((req: Request, res, next) => {
  req.io = io;
  next();
});

configure(app);

if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

server.listen(PORT || 3002, () => {
  Logger.info(`application is running at: http://localhost:${PORT}`);
  Logger.info("Press Ctrl+C to quit.");
});
