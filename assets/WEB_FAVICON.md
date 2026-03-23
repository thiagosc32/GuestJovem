# Ícone da marca (web / PWA)

- **`web-favicon-source.png`** — imagem quadrada de referência (logo chama + gradiente).
- **`favicon-web.png`** — 48×48 px, usado pelo Expo em **`web.favicon`** (aba do navegador).

Para **regenerar** os arquivos em `public/` (`favicon.png`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) e o `favicon-web.png`:

```bash
npm run generate:web-icons
```

Requer `sharp` (devDependency). iOS/Android continuam usando `app-icon.png` no `app.config.js`, salvo se você alterar manualmente.
