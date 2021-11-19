const _active = function (state, name, status) {
  let activeView;
  state.list = state.list.filter(item => {
    if (item.name === name) {
      activeView = item;
      if (status) {
        activeView.status = status;
      }
    }
    return item.name !== name;
  });
  activeView && state.list.unshift(activeView);
}

const _deactive = function (state, name, status) {
  let activeView;
  state.list = state.list.filter(item => {
    if (item.name === name) {
      activeView = item;
      if (status) {
        activeView.status = status;
      }
    }
    return item.name !== name;
  });
  activeView && state.list.push(activeView);
}

export default {

  state: {
    list: []
  },

  reducers: {
    init(state, payload) {
      state.list = payload;
    },

    active(state, payload) {
      _active(state, payload);
    },

    switch(state, payload) {
      const status = payload.status.toUpperCase();
      if (/^(CLOSED|MIN)$/.test(status)) {
        _deactive(state, payload.name, status);
      } else {
        _active(state, payload.name, status);
      }
    }
  }
}