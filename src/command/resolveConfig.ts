import { defineConfig, UserConfigFn } from "vite";
import vitePluginDocusaurus from "../vite-plugin/vite-plugin-docusaurus"
import vitePluginMdx from "../vite-plugin/vite-plugin-mdx"
import vitePluginSvg from "../vite-plugin/vite-plugin-svg"
import commonjs from '../vite-plugin/vite-plugin-commonjs'
import { Props, LoadContext } from "@docusaurus/types"
import legacy from '@vitejs/plugin-legacy'

export default ({ context, alias, props }: {
  context: LoadContext,
  props: Props,
  alias: {
    [alias: string]: string;
  },
}) => defineConfig(async ({ mode, ssrBuild }) => {
  return {// 配置选项
    base: props.baseUrl,
    publicDir: "static",
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode)
    },
    build: {
      emptyOutDir: false,
      cssCodeSplit: false,
      manifest: true,
      ssrManifest: true,
      commonjsOptions: {
        // exclude: ["react"],
        transformMixedEsModules: false,
        dynamicRequireTargets: [
          'node_modules/shelljs/src/*.js',
          'node_modules/prismjs/components/*.js',
        ],
        // ignoreDynamicRequires: true
      },
      rollupOptions: {
        input: require.resolve("../../index.html"),
        external: ["chalk"].concat(ssrBuild ? ["react"] : []),
        output: {
          inlineDynamicImports: ssrBuild
        },
      }

    },
    ssr: {
      // optimizeDeps: {
      //   disabled: true
      // },
      external: [
        "chalk",
        "eta",
        "fs"
        // /node_modules/
      ],
      // noExternal: [
      //   '@docusaurus/core',
      //   "*.md",
      //   "*.md.jsx",
      //   "/home/ubuntu/RemoteWork/temp-vite-docs/docs/tutorial-basics/markdown-features.mdx.jsx?",
      //   "@site/docs/tutorial-basics/markdown-features.mdx"
      // ],
      target: "node",
      format: "cjs"
    },
    server: {
      port: 18018,
    },
    optimizeDeps: {
      entries: [
        "index.html",
        "src/optimize.ts"
      ],
      include: [
        "prop-types",
        "hoist-non-react-statics",
        "react-is",
        "react-router",
        "react-router-dom",
        "react",
        "react-dom",
        "invariant",
        "react-fast-compare",
        "react-helmet-async",
        "shallowequal",
        "nprogress",
        "react-loadable",
        "clsx",
        "@mdx-js/react",
        "react-fast-compare",
      ],
      exclude: [
        "@generated/*",
        "@generated/registry",
        "@generated/routes",
        "@generated/client-modules",
        "@generated/routesChunkNames",
        "@generated/docusaurus.config",
        "@generated/globalData",
        "@generated/i18n",
        "@generated/codeTranslations",
        "@generated/site-metadata",
        "@theme/prism-include-languages"
      ],

    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      alias: [
        { find: "@site/", replacement: props.siteDir + "/" },
        {
          find: /@generated\//,
          replacement: context.generatedFilesDir + "/",
        },
        {
          find: /^~docs\//,
          replacement: context.generatedFilesDir + "/docusaurus-plugin-content-docs/",
        },
        {
          find: /^~blog\//,
          replacement: context.generatedFilesDir + "/docusaurus-plugin-content-blog/",
        },
        {
          find: /^~pages\//,
          replacement: context.generatedFilesDir + "/docusaurus-plugin-content-pages/",
        },
        ...Object.keys(alias).map(v => ({
          find: v,
          replacement: alias[v]
        }))
      ]
    },
    plugins: [
      require('vite-plugin-inspect')(),
      require('@vitejs/plugin-react-swc')(),
      commonjs(),
      vitePluginDocusaurus({ context, alias, props, ssrBuild }),
      vitePluginMdx({ props }),
      vitePluginSvg({ props }),
      legacy({
        targets: ['defaults', 'not IE 11'],
      }),
    ]
  }

}) as UserConfigFn;


