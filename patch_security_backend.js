const fs = require('fs');
let serverContent = fs.readFileSync('backend/server.js', 'utf8');

// 1. Patch Helmet and CORS
const targetHelmetCors = `app.use(helmet({
  crossOriginResourcePolicy: false, // Allow images/files to be loaded from other origins
  frameguard: false,                // Allow iframes (needed for HTML live preview)
  contentSecurityPolicy: false,     // Disable default CSP which includes frame-ancestors 'self'
}));

let dynamicOrigins = []; // Loaded later from db.json

// Allow ALL origins — no domain restriction
app.use(cors({
  origin: true,
  credentials: true
}));`;

const newHelmetCors = `app.use(helmet({
  crossOriginResourcePolicy: false,
  frameguard: { action: "sameorigin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "*"],
      frameSrc: ["'self'", "data:", "blob:"],
    }
  }
}));

let dynamicOrigins = []; // Loaded later from db.json

// Check dynamic origins list
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = ["http://localhost:3000", "http://localhost:3001", ...dynamicOrigins];
    if (allowed.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.lootops.me')) {
      callback(null, true);
    } else {
      console.warn("Blocked by CORS: " + origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));`;

serverContent = serverContent.replace(targetHelmetCors, newHelmetCors);

// There is a second CORS initialization later in the file. Let's fix that one too.
const secondCors = `app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  allowedHeaders: ["Content-Type", "x-api-key", "Authorization", "x-mfa-token"]
}));`;

const newSecondCors = `app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = ["http://localhost:3000", "http://localhost:3001", ...dynamicOrigins];
    if (allowed.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.lootops.me')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  allowedHeaders: ["Content-Type", "x-api-key", "Authorization", "x-mfa-token"]
}));`;

serverContent = serverContent.replace(secondCors, newSecondCors);

// 2. Add Vault Limiter
const targetLimiter = `const apiLimiter = rateLimit({`;
const vaultLimiter = `const vaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  validate: { xForwardedForHeader: false },
  message: { error: "Too many authentication attempts, please try again later." }
});
app.use("/api/vault", vaultLimiter);
app.use("/api/auth", vaultLimiter);

const apiLimiter = rateLimit({`;

if (!serverContent.includes('vaultLimiter')) {
  serverContent = serverContent.replace(targetLimiter, vaultLimiter);
}

fs.writeFileSync('backend/server.js', serverContent);
console.log("Patched server.js security");
