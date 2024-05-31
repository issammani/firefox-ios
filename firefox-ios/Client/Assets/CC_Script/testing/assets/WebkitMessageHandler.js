const messageNames = [
  "capture-credit-card-form",
  "fill-credit-card-form",
  "fill-address-form",
  "capture-address-form",
];

window.webkit = {
  messageHandlers: new Proxy(
    {},
    {
      get: (target, prop) => {
        if (!target[prop]) {
          target[prop] = {
            postMessage: (...args) => {
              const data = args?.[0];
              if (messageNames.includes(data?.type)) {
                webkitInterceptor({ name: prop, data });
              }
            },
          };
        }
        return target[prop];
      },
    }
  ),
};

window.__firefox__ = {};
