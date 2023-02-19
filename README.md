<div align="center">
  <div>
    <h1 align="center">vite-docusaurus</h1>
  </div>
	<p>A docusaurus packager based on vite.</p>
	
</div>


[![NPM package][npm-version-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![MIT License][license-image]][license-url]


---

## Installation and Usage

example: https://github.com/546669204/nav-website.git

```
yarn add vite-docusaurus
```


edit package.json 
```diff
  "scripts": {
    "docusaurus": "docusaurus",
    "swizzle": "docusaurus swizzle",
    "deploy": "docusaurus deploy",
    "clear": "docusaurus clear",
    "serve": "docusaurus serve",
    "write-translations": "docusaurus write-translations",
    "write-heading-ids": "docusaurus write-heading-ids",
    "typecheck": "tsc",
+    "build": "NODE_OPTIONS=--max_old_space_size=5000 vite-docusaurus build",
+    "dev": "vite-docusaurus dev",
+    "preview": "vite-docusaurus preview"
  },
```





## How it works
```
yarn build 


yarn dev


yarn preview

```

## Future 

- [*]  vite  
- [*] esbuild  
- [*] fast  



[npm-version-image]: https://img.shields.io/npm/v/vite-docusaurus.svg
[npm-downloads-image]: https://img.shields.io/npm/dm/vite-docusaurus.svg?style=flat
[npm-url]: https://www.npmjs.com/package/vite-docusaurus
[workflow-image]: https://img.shields.io/github/workflow/status/546669204/vite-docusaurus/main
[workflow-url]: https://github.com/546669204/vite-docusaurus/actions?query=workflow%3Amain
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE
[jsdelivr-image]: https://img.shields.io/jsdelivr/npm/hm/vite-docusaurus
[jsdelivr-url]: https://www.jsdelivr.com/package/npm/vite-docusaurus?path=lib
[cdnjs-image]: https://img.shields.io/cdnjs/v/vite-docusaurus?style=flat
[cdnjs-url]: https://cdnjs.com/libraries/vite-docusaurus
[unpkg-image]: https://img.shields.io/npm/v/vite-docusaurus?label=unpkg&style=flat
[unpkg-url]: https://unpkg.com/browse/vite-docusaurus/lib/
