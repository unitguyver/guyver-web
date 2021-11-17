export default {
  namespace: 'desktop',

  state: {
    list() {
      return []
    }
  },

  actions: {
    count() {
      console.log(...arguments);
    }
  }
}