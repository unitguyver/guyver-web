

export default {

  dialogDiv(template, bottom) {
    const wrap = this.ace.container;
    const dialog = document.createElement("div");
    dialog.className = bottom
      ? "ace_dialog ace_dialog-bottom"
      : "ace_dialog ace_dialog-top";

    if (typeof template == "string") {
      dialog.innerHTML = template;
    } else {
      dialog.appendChild(template);
    }
    wrap.appendChild(dialog);
    return dialog;
  },

  openDialog(template, callback, options = {}) {
    if (this.virtualSelectionMode()) return;

    this.closeNotification(this, null);
    const _self = this;
    const dialog = this.dialogDiv(this, template, options.bottom);

    let closed = false;
    this.state.dialog = dialog;
    function close(newVal) {
      if (typeof newVal == 'string') {
        inp.value = newVal;
      } else {
        if (closed) return;

        if (newVal && newVal.type == "blur") {
          if (document.activeElement === inp)
            return;
        }

        if (_self.state.dialog == dialog) {
          _self.state.dialog = null;
          _self.focus();
        }
        closed = true;
        dialog.remove();

        if (options.onClose) options.onClose(dialog);

        if (_self.state.vim) {
          _self.state.vim.status = null;
          _self.ace._signal("changeStatus");
          _self.ace.renderer.$loop.schedule(_self.ace.renderer.CHANGE_CURSOR);
        }
        // ace_patch}
      }
    }

    const inp = dialog.getElementsByTagName("input")[0];
    let button;
    if (inp) {
      if (options.value) {
        inp.value = options.value;
        if (options.selectValueOnOpen !== false) inp.select();
      }

      if (options.onInput)
        CodeMirror.on(inp, "input", function (e) {
          options.onInput(e, inp.value, close);
        });
      if (options.onKeyUp)
        CodeMirror.on(inp, "keyup", function (e) {
          options.onKeyUp(e, inp.value, close);
        });

      CodeMirror.on(inp, "keydown", function (e) {
        if (options && options.onKeyDown && options.onKeyDown(e, inp.value, close)) {
          return;
        }
        if (e.keyCode == 13) {
          callback(inp.value);
        }
        if (e.keyCode == 27 || (options.closeOnEnter !== false && e.keyCode == 13)) {
          CodeMirror.e_stop(e);
          close();
        }
      });

      if (options.closeOnBlur !== false) {
        CodeMirror.on(inp, "blur", close);
      }

      inp.focus();
    } else if (button = dialog.getElementsByTagName("button")[0]) {
      CodeMirror.on(button, "click", function () {
        close();
        _self.focus();
      });

      if (options.closeOnBlur !== false) CodeMirror.on(button, "blur", close);

      button.focus();
    }
    return close;
  },

  closeNotification(newVal) {
    if (this.state.currentNotificationClose) {
      this.state.currentNotificationClose();
    }
    this.state.currentNotificationClose = newVal;
  },

  openNotification(template, options) {
    if (this.virtualSelectionMode()) return;
    this.closeNotification(this, close);
    const dialog = this.dialogDiv(this, template, options && options.bottom);
    let closed = false, doneTimer;
    let duration = options && typeof options.duration !== "undefined" ? options.duration : 5000;

    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(doneTimer);
      dialog.remove();
    }

    CodeMirror.on(dialog, 'click', function (e) {
      CodeMirror.e_preventDefault(e);
      close();
    });

    if (duration) {
      doneTimer = setTimeout(close, duration);
    }

    return close;
  },
}