// Простой стор состояния с подпиской (без фреймворка — весь фронтенд на vanilla JS + ES-модули,
// чтобы GitHub Pages раздавал статику без шага сборки).

class Store {
  constructor(initial) {
    this._state = initial;
    this._listeners = new Set();
  }

  get state() {
    return this._state;
  }

  set(patch) {
    this._state = { ...this._state, ...patch };
    this._listeners.forEach((fn) => fn(this._state));
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const store = new Store({
  route: 'dashboard',
  loading: false,
  error: null,
  habits: [],
  today: null,
  stats: null,
  calendar: null,
  achievements: null,
  profile: null,
  avatar: null,
  goals: []
});

export function setLoading(v) {
  store.set({ loading: v });
}

export function setError(err) {
  store.set({ error: err ? String(err.message || err) : null });
}
