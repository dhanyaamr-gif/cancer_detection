// Provide a minimal localStorage shim for Node environments when Next's dev overlay
// or other client-oriented modules try to access localStorage during SSR.
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  globalThis.localStorage = {
    _data: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
    },
    setItem(key, value) {
      this._data[key] = String(value);
    },
    removeItem(key) {
      delete this._data[key];
    },
    clear() {
      this._data = {};
    },
  };
}
