import { preview as vitePreview } from "vite";

export default async function preview(option: Record<string, any>) {
  const app = await vitePreview({
    root: option.outDir || "./build/",
    preview: {
      host: option.host,
      port: option.port || 8080,
      strictPort: option.strictPort,
      https: option.https,
      open: option.open,
    },
    build: {
      outDir: ""
    }
  });
  app.printUrls()
}