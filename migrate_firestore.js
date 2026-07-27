const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// Replacements

// 1. Initial schema
code = code.replace(
  'files: {}, logs: [], shares: {}, users: {}, invites: {}, folders: {}, trash: {}, vaults: {}, webhookUrl: "", mfaCodes: {}, analytics: { totalUploads: 0, totalDownloads: 0, dailyStats: {} }, settings: { allowedOrigins: [], allowedEmails: ["setupg98@gmail.com", "support@subhan.tech"], notificationEmails: ["support@subhan.tech"], notificationsEnabled: true, customBaseUrl: "" }',
  'files: {}, logs: [], shares: {}, users: {}, security: {}, invites: {}, folders: {}, trash: {}, vaults: {}, webhookUrl: "", mfaCodes: {}, analytics: { totalUploads: 0, totalDownloads: 0, dailyStats: {} }, settings: { allowedOrigins: [], allowedEmails: ["setupg98@gmail.com", "support@subhan.tech"], notificationEmails: ["support@subhan.tech"], notificationsEnabled: true, customBaseUrl: "" }'
);

// 2. Auth middleware
code = code.replace(
  /const db = admin\.firestore\(\);\s+const securityDoc = await db\.collection\("security"\)\.doc\(decoded\.uid\)\.get\(\);\s+if \(securityDoc\.exists && securityDoc\.data\(\)\.mfaEnabled\) \{/,
  `const dbData2 = readDb();
    if (!dbData2.security) dbData2.security = {};
    const userSec = dbData2.security[decoded.uid];
    if (userSec && userSec.mfaEnabled) {`
);

// 3. /api/auth/2fa/verify
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("security"\)\.doc\(req\.user\.uid\)\.set\(\{\s+mfaEnabled: true,\s+mfaMethod: method,\s+mfaSecret: method === "app" \? secret : null,\s+updatedAt: new Date\(\)\.toISOString\(\)\s+\}\);/,
  `const dbData = readDb();
      if (!dbData.security) dbData.security = {};
      dbData.security[req.user.uid] = {
        mfaEnabled: true,
        mfaMethod: method,
        mfaSecret: method === "app" ? secret : null,
        updatedAt: new Date().toISOString()
      };
      writeDb(dbData);`
);

// 4. /api/auth/2fa/disable part 1
code = code.replace(
  /const db = admin\.firestore\(\);\s+const doc = await db\.collection\("security"\)\.doc\(req\.user\.uid\)\.get\(\);\s+if \(!doc\.exists \|\| !doc\.data\(\)\.mfaEnabled\) \{/,
  `const dbData = readDb();
      if (!dbData.security) dbData.security = {};
      const userSec = dbData.security[req.user.uid];
      if (!userSec || !userSec.mfaEnabled) {`
);

// 4b. /api/auth/2fa/disable part 2
code = code.replace(
  /await db\.collection\("security"\)\.doc\(req\.user\.uid\)\.update\(\{\s+mfaEnabled: false,\s+mfaSecret: null,\s+updatedAt: new Date\(\)\.toISOString\(\)\s+\}\);/,
  `dbData.security[req.user.uid] = { mfaEnabled: false, mfaSecret: null, updatedAt: new Date().toISOString() };
      writeDb(dbData);`
);

// 5. /api/auth/2fa/status
code = code.replace(
  /const db = admin\.firestore\(\);\s+const doc = await db\.collection\("security"\)\.doc\(decoded\.uid\)\.get\(\);\s+if \(!doc\.exists \|\| !doc\.data\(\)\.mfaEnabled\) \{/,
  `const dbData = readDb();
      if (!dbData.security) dbData.security = {};
      const userSec = dbData.security[decoded.uid];
      if (!userSec || !userSec.mfaEnabled) {`
);

// 6. /api/auth/2fa/check
code = code.replace(
  /const db = admin\.firestore\(\);\s+const doc = await db\.collection\("security"\)\.doc\(decoded\.uid\)\.get\(\);\s+res\.json\(\{\s+mfaEnabled: doc\.exists && doc\.data\(\)\.mfaEnabled,\s+mfaMethod: doc\.exists \? \(doc\.data\(\)\.mfaMethod \|\| "app"\) : null\s+\}\);/,
  `const dbData = readDb();
      if (!dbData.security) dbData.security = {};
      const userSec = dbData.security[decoded.uid];
      res.json({ 
        mfaEnabled: userSec ? userSec.mfaEnabled : false,
        mfaMethod: userSec ? (userSec.mfaMethod || "app") : null
      });`
);

// 7. /auth/login - create user
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(userRecord\.uid\)\.set\(\{\s+uid: userRecord\.uid,\s+email: userRecord\.email,\s+name: name \|\| "",\s+avatar: "",\s+role: "admin", \/\/ Defaults to admin for initial setup \(or could be managed\)\s+createdAt: new Date\(\)\.toISOString\(\),\s+lastLogin: new Date\(\)\.toISOString\(\)\s+\}\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      dbData.users[userRecord.uid] = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: name || "",
        avatar: "",
        role: "admin",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      writeDb(dbData);`
);

// 8. Update last login
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(uid\)\.update\(\{ lastLogin: new Date\(\)\.toISOString\(\) \}\);/,
  `const dbData = readDb();
        if (!dbData.users) dbData.users = {};
        if (dbData.users[uid]) {
          dbData.users[uid].lastLogin = new Date().toISOString();
          writeDb(dbData);
        }`
);

// 9. Fetch profile on login
code = code.replace(
  /const db = admin\.firestore\(\);\s+const doc = await db\.collection\("users"\)\.doc\(uid\)\.get\(\);\s+if \(doc\.exists\) profile = doc\.data\(\);/,
  `const dbData = readDb();
        if (!dbData.users) dbData.users = {};
        if (dbData.users[uid]) profile = dbData.users[uid];`
);

// 10. /auth/me GET
code = code.replace(
  /const db = admin\.firestore\(\);\s+const doc = await db\.collection\("users"\)\.doc\(req\.user\.uid\)\.get\(\);\s+let profileData = doc\.exists \? doc\.data\(\) : \{ email: req\.user\.email, name: req\.user\.name \|\| "" \};/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      let profileData = dbData.users[req.user.uid] || { email: req.user.email, name: req.user.name || "" };`
);

// 11. Delete user via admin API
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(userRecord\.uid\)\.delete\(\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      delete dbData.users[userRecord.uid];
      writeDb(dbData);`
);

// 12. Update user /auth/me PUT
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(req\.user\.uid\)\.update\(updates\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      if (!dbData.users[req.user.uid]) dbData.users[req.user.uid] = {};
      Object.assign(dbData.users[req.user.uid], updates);
      writeDb(dbData);`
);

// 13. /auth/me DELETE
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(req\.user\.uid\)\.delete\(\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      delete dbData.users[req.user.uid];
      if (!dbData.security) dbData.security = {};
      delete dbData.security[req.user.uid];
      writeDb(dbData);`
);

// 14. /admin/users GET
code = code.replace(
  /const db = admin\.firestore\(\);\s+const snapshot = await db\.collection\("users"\)\.orderBy\("createdAt", "desc"\)\.limit\(limit\)\.get\(\);\s+const users = snapshot\.docs\.map\(doc => doc\.data\(\)\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      const users = Object.values(dbData.users)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, limit);`
);

// 15. /admin/users/:uid GET
code = code.replace(
  /const db = admin\.firestore\(\);\s+const doc = await db\.collection\("users"\)\.doc\(req\.params\.uid\)\.get\(\);\s+if \(!doc\.exists\) return res\.status\(404\)\.json\(\{ error: "User not found\." \}\);\s+res\.json\(\{ success: true, profile: doc\.data\(\) \}\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      const user = dbData.users[req.params.uid];
      if (!user) return res.status(404).json({ error: "User not found." });
      res.json({ success: true, profile: user });`
);

// 16. /admin/users/:uid PUT
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(req\.params\.uid\)\.update\(updates\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      if (!dbData.users[req.params.uid]) dbData.users[req.params.uid] = {};
      Object.assign(dbData.users[req.params.uid], updates);
      writeDb(dbData);`
);

// 17. /admin/users/:uid DELETE
code = code.replace(
  /const db = admin\.firestore\(\);\s+await db\.collection\("users"\)\.doc\(req\.params\.uid\)\.delete\(\);/,
  `const dbData = readDb();
      if (!dbData.users) dbData.users = {};
      delete dbData.users[req.params.uid];
      if (!dbData.security) dbData.security = {};
      delete dbData.security[req.params.uid];
      writeDb(dbData);`
);

fs.writeFileSync('backend/server.js', code);
console.log('Firestore replacements completed.');
