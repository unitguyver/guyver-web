export default {
  namespace: 'desktop',

  state: {
    views: []
  },

  reducers: {
    active(state, payload) {
      state.views = state.views.filter(item => item.name != payload.name);
      state.views.unshift(payload);
      console.log(state)
    }
  }
}