export default {
  namespace: 'desktop',

  state: {
    list: []
  },

  reducers: {
    init(state, payload) {
      state.list = payload;
    },
    push(state, payload) {
      state.list.push(payload)
    }
  }
}