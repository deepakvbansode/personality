import React, { Component } from "react";
export class Animation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      displayName: props.names[0],
    };
    this.iterator = 0;
  }

  componentDidMount() {
    this.timerId = setInterval(() => {
      this.setState({
        displayName: this.props.names[
          this.iterator++ % this.props.names.length
        ],
      });
    }, 100);
    if(this.props.duration){

        setTimeout(()=>{
            clearInterval(this.timerId);
        }, this.props.duration)
    }
  }

  render() {
    return <div className="animated-text">{this.state.displayName}</div>;
  }
}
