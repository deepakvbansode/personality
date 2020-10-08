import React from "react";
import "./App.css";
import { Alert } from "reactstrap";
import { Game } from "./pages/Game";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
function App() {
  return (
    <div className="container-fluid">
      <Alert color="primary">
        <h1>Welcome to Frontdoor's Cross Functional Team Game zone! </h1>
      </Alert>
      <Router>
        <Switch>
          <Route exact path="/personality" component={Game}></Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
