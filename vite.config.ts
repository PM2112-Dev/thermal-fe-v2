import { UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()

function pathResolve(dir: string) {
  return resolve(root, '.', dir)
}

export default (): UserConfig => {
  return {
    // Cổng 5173 thường bị container docker của forest-fe chiếm nên Vite tự nhảy sang cổng khác
    // (và bị CORS chặn). Cố định 5273 — đã có trong AppSettings:Cors của backend Thermal.
    server: { port: 5273, strictPort: true },
    plugins: [
      vue(),
      vueJsx(),
      tailwindcss(),

      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: 'src/auto-imports.d.ts',
      }),

      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts',
      }),

      VueI18nPlugin({
        runtimeOnly: true,
        compositionOnly: true,
        // Chỉ file message trong locales/<lang>/, bỏ qua loader và schema ở thư mục gốc
        include: [resolve(__dirname, 'src/locales/*/*.ts')],
      }),

      createSvgIconsPlugin({
        iconDirs: [pathResolve('src/assets/svgs')],
        symbolId: 'icon-[dir]-[name]',
        svgoOptions: true,
      }),

      viteStaticCopy({
        targets: [
          {
            src: '.htaccess',
            dest: '.',
          },
        ],
      }),
    ],

    css: {
      preprocessorOptions: {
        scss: { api: 'modern-compiler' },
      },
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },

    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
      },
    },

    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'vue-types',
        'element-plus/es/locale/lang/vi',
        'element-plus/es/locale/lang/en',
        'axios',
      ],
    },
  }
}