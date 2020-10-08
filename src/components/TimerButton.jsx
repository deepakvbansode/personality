import React, { Component } from "react";
import { Button } from "reactstrap";
export class TimerButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timeLeft: 120, //seconds
    };
    this.timerId = null;
  }

  componentDidMount() {
    this.timerId = setInterval(() => {
      if (this.state.timeLeft < 0) {
        clearInterval(this.timerId);
      } else {
        this.setState((prevState) => {
          return {
            timeLeft: prevState.timeLeft - 1,
          };
        });
      }
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  render() {
    const buttonDisabled = this.props.disabled || this.state.timeLeft < 0;
    const seconds = this.state.timeLeft%60;
    const minutes = Math.floor(this.state.timeLeft/60);
    return (
      <Button
        color="primary"
        size="lg"
        active
        onClick={this.props.onClick}
        disabled={buttonDisabled}
      >
        {this.props.label}
        {!buttonDisabled && ` in ${minutes}:${seconds}`}
      </Button>
    );
  }
}
