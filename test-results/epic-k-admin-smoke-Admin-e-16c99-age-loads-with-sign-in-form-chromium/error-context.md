# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: epic-k-admin-smoke.spec.ts >> Admin entry smoke >> admin login page loads with sign-in form
- Location: e2e\epic-k-admin-smoke.spec.ts:8:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel(/username or email/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel(/username or email/i)

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e7]:
        - generic [ref=e8]: 🏑
        - generic [ref=e9]:
          - heading "Hockey Admin" [level=1] [ref=e10]
          - paragraph [ref=e11]: Management Portal
      - navigation [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: AU
          - generic [ref=e16]:
            - generic [ref=e17]: Admin User
            - generic [ref=e18]: Admin
        - button "Logout" [ref=e19]:
          - img [ref=e20]
          - text: Logout
    - main [ref=e23]:
      - generic [ref=e26]:
        - generic [ref=e27]:
          - img [ref=e29]
          - heading "Teams Management" [level=1] [ref=e32]
          - paragraph [ref=e33]: Sign in to manage your club's teams
        - generic [ref=e34]:
          - generic [ref=e36]:
            - generic [ref=e37]:
              - generic [ref=e38]: Username or Email
              - generic [ref=e39]:
                - img [ref=e40]
                - textbox "ga or g@gmail.com" [active] [ref=e43]
              - paragraph [ref=e44]: Use your username (e.g. ga) or email address
            - generic [ref=e45]:
              - generic [ref=e46]: Password
              - generic [ref=e47]:
                - img [ref=e48]
                - textbox "••••••••" [ref=e51]
            - button "Sign In" [ref=e52]
          - generic [ref=e54]:
            - img [ref=e55]
            - generic [ref=e57]:
              - paragraph [ref=e58]: "Access Levels:"
              - list [ref=e59]:
                - listitem [ref=e60]:
                  - text: •
                  - strong [ref=e61]: "Super Admin:"
                  - text: Manage all clubs and teams
                - listitem [ref=e62]:
                  - text: •
                  - strong [ref=e63]: "Club Admin:"
                  - text: Manage your club's teams only
        - generic [ref=e64]:
          - paragraph [ref=e65]: "Development Mode:"
          - generic [ref=e66]:
            - paragraph [ref=e67]:
              - text: "Existing user:"
              - strong [ref=e68]: ga
              - text: or
              - strong [ref=e69]: g@gmail.com
            - paragraph [ref=e70]: Check browser console for login details
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e76] [cursor=pointer]:
    - img [ref=e77]
  - alert [ref=e80]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * Epic K4 — lightweight E2E smoke (requires dev server: `pnpm dev`).
  5  |  * Run: `pnpm exec playwright install` once, then `pnpm test:e2e`.
  6  |  */
  7  | test.describe("Admin entry smoke", () => {
  8  |   test("admin login page loads with sign-in form", async ({ page }) => {
  9  |     await page.goto("/admin/login");
  10 |     await expect(
  11 |       page.getByRole("heading", { name: /teams management/i }),
  12 |     ).toBeVisible();
  13 |     await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
> 14 |     await expect(page.getByLabel(/username or email/i)).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  15 |   });
  16 | });
  17 | 
```