# @getresponse/tsconfig

[![License](http://img.shields.io/:license-mit-blue.svg)](http://badges.mit-license.org)

---

This package contains a universal tsconfig file that is optimized for browser, library, and Node.js LTS projects. It can help you set up your TypeScript projects quickly and easily.

## Installation

1. Install @getresponse/tsconfig as a development dependency:

   ```bash
   npm i --save-dev @getresponse/tsconfig
   ```

2. Choose the appropriate config file for your project from `@getresponse/tsconfig/configs`:

- For browser projects, use `browser/tsconfig.json`
- For library projects with CommonJS modules, use `lib/tsconfig.cjs.json`
- For library projects with ES modules, use `lib/tsconfig.esm.json`
- For Node.js LTS projects, use either `node-lts/tsconfig.cjs.json` (CommonJS modules) or `node-lts/tsconfig.json` (ES modules)

3. In your TypeScript configuration file (tsconfig.json), extend the chosen config file, for example ([documentation](https://www.typescriptlang.org/tsconfig#extends)):

   ```json
   {
        "extends": "@getresponse/tsconfig/configs/browser/tsconfig.json"
   }
   ```

4. Optionally, customize the configuration options based on your project setup::

   - `rootDir`: set the root directory of your project(see ([rootDir](https://www.typescriptlang.org/tsconfig#rootDir))):

   - `include`: specify which files should be included in the compilation process (see ([include](https://www.typescriptlang.org/tsconfig#include))):

   - `exclude`: specify which files should be excluded from the compilation process (see([exclude](https://www.typescriptlang.org/tsconfig#exclude))):

   Here's an example with customized options:
   ```json
   {
      "extends": "@getresponse/tsconfig/configs/browser/tsconfig.json",
      "rootDir": "src",
      "include": [
         "src/**/*",
         "types/**/*"
      ],
      "exclude": [
         "node_modules",
         "src/example-nested"
      ]
   }
   ```


That's it! Now you can enjoy the benefits of using a standardized tsconfig file in your TypeScript projects.