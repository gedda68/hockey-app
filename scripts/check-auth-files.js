// scripts/check-auth-files.js
// Run this to verify all auth files are in place

const fs = require("fs");
const path = require("path");

console.log("🔍 Checking auth files...\n");

const requiredFiles = [
  { path: "lib/auth.ts", name: "Auth Library" },
  { path: "app/api/auth/login/route.ts", name: "Login Route" },
  { path: "app/api/auth/logout/route.ts", name: "Logout Route" },
  { path: "app/api/auth/session/route.ts", name: "Session Route" },
  { path: "lib/get-session-user.ts", name: "Session Helper" },
  { path: "middleware.ts", name: "Middleware" },
];

let allGood = true;

requiredFiles.forEach((file) => {
  const exists = fs.existsSync(file.path);
  const status = exists ? "✅" : "❌";
  console.log(`${status} ${file.name}: ${file.path}`);

  if (!exists) {
    allGood = false;
  }
});

console.log("\n" + "=".repeat(50));

if (allGood) {
  console.log("✅ All required files are present!");
  console.log("\nNext steps:");
  console.log("1. Make sure packages are installed:");
  console.log("   npm install bcryptjs jose mongodb");
  console.log("2. Restart dev server:");
  console.log("   npm run dev");
  console.log("3. Test login:");
  console.log("   curl -X POST http://localhost:3000/api/auth/login \\");
  console.log('     -H "Content-Type: application/json" \\');
  console.log(
    '     -d \'{"email":"admin@example.com","password":"admin123"}\'',
  );
} else {
  console.log("❌ Some files are missing!");
  console.log("\nFiles needed:");
  console.log("- lib/auth.ts (custom auth library)");
  console.log("- app/api/auth/login/route.ts (login endpoint)");
  console.log("- app/api/auth/logout/route.ts (logout endpoint)");
  console.log("- app/api/auth/session/route.ts (session endpoint)");
  console.log("- lib/get-session-user.ts (session helpers)");
  console.log("- middleware.ts (route protection)");
}

console.log("=".repeat(50) + "\n");
