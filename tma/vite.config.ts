// import { defineConfig } from 'vite';
// import tsconfigPaths from 'vite-tsconfig-paths';
// import react from '@vitejs/plugin-react-swc';
// import mkcert from 'vite-plugin-mkcert';
// import { nodePolyfills } from 'vite-plugin-node-polyfills'

// export default defineConfig({
//   base: '/tma',
//   plugins: [
//     react(),
//     tsconfigPaths(),
//     process.env.HTTPS && mkcert(),
//     nodePolyfills(),
//   ],
//   publicDir: './public',
//   server: {
//     host: true,
//     allowedHosts: true,
//   },
// });

// import { defineConfig } from 'vite';
// import tsconfigPaths from 'vite-tsconfig-paths';
// import react from '@vitejs/plugin-react-swc';
// import mkcert from 'vite-plugin-mkcert';
// import { nodePolyfills } from 'vite-plugin-node-polyfills';
// import path from 'path';

// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
// import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

// export default defineConfig({
//   base: '/tma',
//   plugins: [
//     react(),
//     tsconfigPaths(),
//     process.env.HTTPS && mkcert(),
//     // nodePolyfills нужен для сборки (rollup)
//     nodePolyfills(),
//   ].filter(Boolean),
//   resolve: {
//     alias: {
//     'unenv/mock/empty': path.resolve(__dirname, 'src/shims/unenv-empty.js'),
//     // перенаправляем глубокий импорт unenv/node/buffer -> пакет buffer
//     'unenv/node/buffer': path.resolve(__dirname, 'node_modules/buffer/index.js'),
//     // перенаправляем возможные импорты unenv/node/process -> браузерная версия process
//     'unenv/node/process': path.resolve(__dirname, 'node_modules/process/browser.js'),
//     // при необходимости добавляй другие маппинги, например:
//     // 'unenv/node/crypto': path.resolve(__dirname, 'src/shims/unenv-crypto.js'),
//     }
//   },
//   define: {
//     // обеспечить глоб переменную, если библиотеки её ожидают
//     global: 'globalThis',
//   },
//   optimizeDeps: {
//     esbuildOptions: {
//       // позволяет esbuild обрабатывать polyfills
//       define: { global: 'globalThis' },
//       plugins: [
//         NodeGlobalsPolyfillPlugin({
//           process: true,
//           buffer: true,
//         }),
//         NodeModulesPolyfillPlugin()
//       ]
//     },
//     // явно проинициализировать некоторые пакеты, если нужно
//     include: ['buffer', 'process'],
//   },
//   build: {
//     rollupOptions: {
//       plugins: [
//         // rollup plugin для полифилов при build
//         nodePolyfills()
//       ]
//     },
//     commonjsOptions: {
//       transformMixedEsModules: true
//     }
//   },
//   publicDir: './public',
//   server: {
//     host: true,
//     allowedHosts: true,
//   },
// });

// import { defineConfig } from 'vite';
// import tsconfigPaths from 'vite-tsconfig-paths';
// import react from '@vitejs/plugin-react-swc';
// import mkcert from 'vite-plugin-mkcert';
// import { nodePolyfills } from 'vite-plugin-node-polyfills';
// import path from 'path';

// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
// import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

// const abs = (p) => path.resolve(__dirname, p);

// export default defineConfig({
//   base: '/tma',
//   plugins: [
//     react(),
//     tsconfigPaths(),
//     process.env.HTTPS && mkcert(),
//     nodePolyfills(),
//   ].filter(Boolean),
//   resolve: {
//     alias: {
//       // абсолютные маппинги — чтобы не было "rewrote ... but was not an absolute path"
//       'unenv/mock/empty': abs('src/shims/unenv-empty.js'),
//       'unenv/node/buffer': abs('node_modules/buffer/index.js'),
//       'unenv/node/process': abs('node_modules/process/browser.js'),
//       // также мапим базовые node модули прямо на их браузерные реализации
//       'buffer': abs('node_modules/buffer/index.js'),
//       'process': abs('node_modules/process/browser.js'),
//       // если потребуется:
//       // 'unenv/node/crypto': abs('src/shims/unenv-crypto.js'),
//     },
//   },
//   define: {
//     global: 'globalThis',
//   },
//   optimizeDeps: {
//     // НЕ оптимизировать unenv — это предотвращает попытки esbuild резолвить его exports/специфические deep imports
//     exclude: ['unenv'],
//     esbuildOptions: {
//       define: { global: 'globalThis' },
//       plugins: [
//         NodeGlobalsPolyfillPlugin({ process: true, buffer: true }),
//         NodeModulesPolyfillPlugin()
//       ],
//     },
//     // include стандартных полифилов явно, если нужно
//     include: ['buffer', 'process'],
//   },
//   build: {
//     rollupOptions: {
//       plugins: [nodePolyfills()]
//     },
//     commonjsOptions: { transformMixedEsModules: true }
//   },
//   publicDir: './public',
//   server: { host: true, allowedHosts: true },
// });


//рабочая н опочему то изза шимов отвалилась
// import { defineConfig } from 'vite';
// import tsconfigPaths from 'vite-tsconfig-paths';
// import react from '@vitejs/plugin-react-swc';
// import mkcert from 'vite-plugin-mkcert';
// import { nodePolyfills } from 'vite-plugin-node-polyfills';
// import path from 'path';

// const abs = (p: string) => path.resolve(__dirname, p);

// export default defineConfig({
//   base: '/tma',
//   plugins: [
//     react(),
//     tsconfigPaths(),
//     process.env.HTTPS && mkcert(),
//     nodePolyfills({
//       include: ['buffer', 'process'],
//       exclude: ['http', 'https', 'fs', 'path', 'os', 'net', 'tls', 'dns']
//     }),
//   ].filter(Boolean),
//   resolve: {
//     alias: {
//       // Базовые маппинги
//       'buffer': abs('node_modules/buffer/index.js'),
//       'process': abs('node_modules/process/browser.js'),
//     },
//   },
//   define: {
//     global: 'globalThis',
//     'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
//   },
//   optimizeDeps: {
//     // Исключаем ВСЕ проблемные зависимости
//     exclude: [
//       // TON зависимости
//       'ton',
//       '@ton/core', 
//       '@ton/ton',
//       '@ton/crypto',
//       '@tonconnect/ui-react',
//       '@tonconnect/sdk',
//       'ton-core',
//       'ton-crypto',
      
//       // Криптографические зависимости
//       'tweetnacl',
//       'tweetnacl-util',
//       'ua-parser-js',
      
//       // Node.js модули
//       'crypto',
//       'stream',
//       'util',
//       'url',
//       'querystring',
//       'buffer',
//       'process',
      
//       // Другие проблемные
//       'crypto-browserify',
//       'stream-browserify',
//       'util',
//       'url',
//       'querystring-es3',
//       'unenv'
//     ],
//     // Включаем только безопасные React зависимости
//     include: [
//       'react',
//       'react-dom',
//       'react-router-dom',
//       '@reduxjs/toolkit',
//       'react-redux',
//       '@telegram-apps/sdk-react',
//       '@telegram-apps/telegram-ui'
//     ],
//     // Отключаем force для избежания проблем
//     force: undefined
//   },
//   build: {
//     rollupOptions: {
//       plugins: [
//         nodePolyfills({
//           include: ['buffer', 'process']
//         })
//       ],
//       external: [
//         'ton',
//         '@ton/core',
//         '@ton/ton', 
//         'ton-core',
//         'ton-crypto',
//         'tweetnacl',
//         'tweetnacl-util',
//         'ua-parser-js'
//       ]
//     },
//     commonjsOptions: { 
//       transformMixedEsModules: true,
//     }
//   },
//   publicDir: './public',
//   server: { 
//     host: true, 
//     allowedHosts: true,
//     // Отключаем HMR для стабильности
//     hmr: {
//       overlay: false
//     },
//     // Увеличиваем таймауты
//     watch: {
//       usePolling: false
//     }
//   },
// });

// import { defineConfig } from 'vite';
// import tsconfigPaths from 'vite-tsconfig-paths';
// import react from '@vitejs/plugin-react-swc';
// import mkcert from 'vite-plugin-mkcert';
// import { nodePolyfills } from 'vite-plugin-node-polyfills';
// import path from 'path';

// const abs = (p: string) => path.resolve(__dirname, p);

// export default defineConfig({
//   base: '/tma',
//   plugins: [
//     react(),
//     tsconfigPaths(),
//     process.env.HTTPS && mkcert(),
//     nodePolyfills({
//       include: ['buffer', 'process'],
//       exclude: ['http', 'https', 'fs', 'path', 'os', 'net', 'tls', 'dns']
//     }),
//   ].filter(Boolean),
//   resolve: {
//     alias: {
//       // Базовые маппинги
//       'buffer': abs('node_modules/buffer/index.js'),
//       'process': abs('node_modules/process/browser.js'),
//       // ЯВНОЕ исправление для tweetnacl-util
//       'tweetnacl-util': abs('src/shim/tweetnacl-util-shim.js'),
//       // Альтернативное исправление для tonconnect
//       '@tonconnect/sdk': abs('node_modules/@tonconnect/sdk/lib/esm/index.mjs'),
//       '@tonconnect/ui-react': abs('node_modules/@tonconnect/ui-react/lib/esm/index.mjs'),
//     },
//   },
//   define: {
//     global: 'globalThis',
//     'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
//   },
//   optimizeDeps: {
//     // Включаем проблемные зависимости для предварительной обработки
//     include: [
//       'tweetnacl',
//       'tweetnacl-util',
//       '@tonconnect/ui-react',
//       '@tonconnect/sdk',
//       'buffer',
//       'process'
//     ],
//     // Настройки esbuild для обработки CommonJS модулей
//     esbuildOptions: {
//       // Явно указываем как обрабатывать проблемные модули
//       mainFields: ['module', 'main', 'browser'],
//       // Решаем проблему с default экспортами
//       banner: `
//         import { createRequire } from 'module';
//         const require = createRequire(import.meta.url);
//       `,
//     },
//   },
//   build: {
//     rollupOptions: {
//       plugins: [
//         nodePolyfills({
//           include: ['buffer', 'process']
//         })
//       ],
//       // Внешние зависимости
//       external: [],
//       output: {
//         // Глобальные переменные для внешних зависимостей
//         globals: {
//           'tweetnacl': 'tweetnacl',
//           'tweetnacl-util': 'tweetnaclUtil',
//           'buffer': 'Buffer',
//           'process': 'process'
//         }
//       }
//     },
//     commonjsOptions: { 
//       transformMixedEsModules: true,
//       // Явно преобразуем проблемные модули
//       requireReturnsDefault: 'auto',
//       // Игнорируем динамические импорты
//       dynamicRequireTargets: [],
//     }
//   },
//   publicDir: './public',
//   server: { 
//     host: true, 
//     allowedHosts: true,
//     hmr: {
//       overlay: false
//     },
//     watch: {
//       usePolling: false
//     },
//     // Увеличиваем таймауты
//     fs: {
//       strict: false
//     }
//   },
// });

import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react-swc';
import mkcert from 'vite-plugin-mkcert';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

const abs = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tsconfigPaths(),
    process.env.HTTPS && mkcert(),
    nodePolyfills({
      include: ['buffer', 'process'],
      exclude: ['http', 'https', 'fs', 'path', 'os', 'net', 'tls', 'dns']
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      // Базовые маппинги
      'buffer': abs('node_modules/buffer/index.js'),
      'process': abs('node_modules/process/browser.js'),
      // ЯВНОЕ исправление для tweetnacl-util
      'tweetnacl-util': abs('src/shim/tweetnacl-util-shim.js'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    // Убираем исключения и включаем проблемные модули
    include: [
      'tweetnacl',
      'tweetnacl-util',
      '@tonconnect/ui-react',
      '@tonconnect/sdk',
      'buffer',
      'process'
    ],
  },
  build: {
    commonjsOptions: { 
      transformMixedEsModules: true,
    }
  },
  publicDir: './public',
  server: { 
    host: true, 
    allowedHosts: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    }
  },
});

