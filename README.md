<div align="center">
  <div>
    <h1 align="center">vite-docusaurus</h1>
  </div>
	<p>A docusaurus packager based on vite.</p>
</div>

---

## Installation and Usage

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