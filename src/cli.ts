import cac from "cac";
import build from "./command/build";
import dev from "./command/dev";
import preview from "./command/preview";
import pkg from "../package.json";

const cli = cac('vite-docusaurus');
const VERSION = pkg.version;

cli
  .command('[root]', 'start dev server') // default command
  .alias('serve') // the command is called 'serve' in Vite's API
  .alias('dev') // alias to align with the script name
  .option('--host [host]', `[string] specify hostname`)
  .option('--port <port>', `[number] specify port`)
  .option('--https', `[boolean] use TLS + HTTP/2`)
  .option('--open [path]', `[boolean | string] open browser on startup`)
  .option('--cors', `[boolean] enable CORS`)
  .option('--strictPort', `[boolean] exit if specified port is already in use`)
  .option('--force', `[boolean] force the optimizer to ignore the cache and re-bundle`)
  .option('--locale [locale]', `[string] use self locale`)
  .action(dev)

cli
  .command('build [root]', 'build for production')
  .option('--target <target>', `[string] transpile target (default: 'modules')`)
  .option('--outDir <dir>', `[string] output directory (default: dist)`)
  .option('--assetsDir <dir>', `[string] directory under outDir to place assets in (default: assets)`)
  .option('--assetsInlineLimit <number>', `[number] static asset base64 inline threshold in bytes (default: 4096)`)
  .option('--ssr [entry]', `[string] build specified entry for server-side rendering`)
  .option('--sourcemap', `[boolean] output source maps for build (default: false)`)
  .option('--minify [minifier]', `[boolean | "terser" | "esbuild"] enable/disable minification, ` +
    `or specify minifier to use (default: esbuild)`)
  .option('--manifest [name]', `[boolean | string] emit build manifest json`)
  .option('--ssrManifest [name]', `[boolean | string] emit ssr manifest json`)
  .option('--force', `[boolean] force the optimizer to ignore the cache and re-bundle (experimental)`)
  .option('--emptyOutDir', `[boolean] force empty outDir when it's outside of root`)
  .option('-w, --watch', `[boolean] rebuilds when modules have changed on disk`)
  .action(build)

cli
  .command('preview [root]', 'locally preview production build')
  .option('--host [host]', `[string] specify hostname`)
  .option('--port <port>', `[number] specify port`)
  .option('--strictPort', `[boolean] exit if specified port is already in use`)
  .option('--https', `[boolean] use TLS + HTTP/2`)
  .option('--open [path]', `[boolean | string] open browser on startup`)
  .option('--outDir <dir>', `[string] output directory (default: dist)`)
  .action(preview);


cli.help();
cli.version(VERSION);
cli.parse();