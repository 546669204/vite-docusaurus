import { preview as vitePreview } from "vite";

export default async function preview() {
  const app = await vitePreview({
    root: "./build/",
    preview: {
      port: 18018,
      // open: true,
    },
    build:{
      outDir:""
    }
  });
  app.printUrls()
}