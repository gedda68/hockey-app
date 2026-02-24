// app/api/uploadthing/route.ts
// PRODUCTION VERSION - Using Uploadthing
// Uncomment this and use instead of /api/upload/route.ts for production

/*
SETUP INSTRUCTIONS:
1. Install: npm install uploadthing @uploadthing/react
2. Sign up at https://uploadthing.com
3. Get your API keys
4. Add to .env.local:
   UPLOADTHING_SECRET=sk_live_...
   UPLOADTHING_APP_ID=your_app_id

5. Create lib/uploadthing.ts:

import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/route";

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

6. Update DocumentsSection.tsx to use Uploadthing instead of fetch
*/

import { createRouteHandler } from "uploadthing/next";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// Define your file upload routes
export const ourFileRouter = {
  // Player documents uploader
  playerDocuments: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // Add authentication here if needed
      // const user = await auth(req);
      // if (!user) throw new Error("Unauthorized");

      return { uploadedBy: "admin" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for:", metadata.uploadedBy);
      console.log("File URL:", file.url);

      // Store file info in database here if needed
      return { url: file.url };
    }),

  // Player photos specifically
  playerPhotos: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      return { uploadedBy: "admin" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Photo uploaded:", file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

// Export route handlers
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
