import { connect } from "react-redux";

const ApplicationConnect = connect((state) => {
  console.log(state)
  return {
    taskbar: state.taskbar
  }
}, {})

export default ApplicationConnect;