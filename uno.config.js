import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(), // 默认预设，类似 Tailwind
    presetAttributify(), // 支持属性模式
  ],
  shortcuts: {
    // 自定义快捷方式
  },
  rules: [
    // 自定义规则，支持任意数值
  ],
  theme: {
    // 自定义主题
  },
})

