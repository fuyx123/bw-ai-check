import { createApp } from './core/app';

const { config, server } = createApp();

server.listen(config.port, config.host, () => {
  console.log(`[api] listening on http://${config.host}:${config.port}`);
});
