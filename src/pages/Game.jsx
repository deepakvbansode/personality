import React, { Component } from "react";
import { db } from "../services/firebase";
import { Player } from "../components/Players";
import {
  Jumbotron,
  Alert,
  Button,
  ListGroup,
  ListGroupItem,
  Label,
  FormGroup,
  Input,
  Progress,
  Spinner,
} from "reactstrap";
import { getRandomPlayer, getStatementWisePercentage } from "../helpers/utils";
import { Animation } from "../components/Animation";
import { TimerButton } from "../components/TimerButton";

const PLAYER_SESSION = "player-session-personality";
export class Game extends Component {
  hasValidPlayerChecked = false;
  constructor(props) {
    super(props);
    const playerSession = localStorage.getItem(PLAYER_SESSION);
    this.state = {
      playerName: "",
      playerId: null,
      readError: null,
      writeError: null,
      showLoader: playerSession ? true : false,
      hasPlayerSession: playerSession,

      statement_1: "",
      statement_2: "",
      guess: null,
      //firebase
      players: [],
      playedPlayerIds: null,
      currentPlayer: null,
      statements: null,
      game: null,
    };
  }

  async componentDidMount() {
    //listen for all the database keys
    //and update in the state
    this.setState({ readError: null });
    try {
      db.ref("players").on("value", this.updatePlayers);
      db.ref("statements").on("value", this.updateStatements);
      db.ref("currentPlayer").on("value", (snapshot) => {
        const currentPlayer = snapshot.val();
        this.setState({ currentPlayer, guess: 0 });
      });
      db.ref("game").on("value", (snapshot) => {
        const game = snapshot.val();
        this.setState({ game });
      });
      db.ref("playedPlayerIds").on("value", (snapshot) => {
        const playedPlayerIds = snapshot.val();
        this.setState({ playedPlayerIds });
      });
    } catch (error) {
      this.setState({ readError: error.message });
    }
  }

  updatePlayers = (snapshot) => {
    let players = [];

    snapshot.forEach((snap) => {
      let player = snap.val();
      players.push(player);
      if (this.state.game && this.state.game.pollStarted) {
      }
    });
    players = players.sort(
      (player1, player2) =>
        parseInt(player2.totalCorrectGuess) -
        parseInt(player1.totalCorrectGuess)
    );
    if (
      !this.hasValidPlayerChecked &&
      this.state.hasPlayerSession &&
      this.state.playerId === null
    ) {
      //when all players listener received data
      //state.hasPlayerSession && state.playerId == null, check if playerSession is in players => only one time check
      //yes -> update the player id, set loading to false
      //no -> go to login, clear the session, set hasPlayerSession to null
      const player = players.find(
        (player) => player.playerId === this.state.hasPlayerSession
      );
      if (player) {
        this.setState({ playerId: player.playerId, showLoader: false });
      } else {
        localStorage.removeItem(PLAYER_SESSION);
        this.setState({ showLoader: false });
      }
      this.hasValidPlayerChecked = true;
    }
    this.setState({
      players,
    });
  };

  updateStatements = (snapshot) => {
    let statements = [];
    snapshot.forEach((snap) => {
      statements.push(snap.val());
    });
    let resultDeclare = statements.some((statement) => statement.isLie);
    this.setState({ statements, resultDeclare });
  };
  handlePlayerNameChange = (event) => {
    this.setState({
      playerName: event.target.value,
    });
  };

  handleLogin = async (event) => {
    //create playerid -> validate not null
    //store it in firebase
    //store it in session
    //update the playerId
    event.preventDefault();
    this.setState({ writeError: null });
    try {
      const playerId = db.ref().child("players").push().key;
      if (playerId) {
        await db.ref("players/" + playerId).set({
          playerId: playerId,
          name: this.state.playerName,
          currentGuess: 0,
          totalCorrectGuess: 0,
          lockedGuess: false,
          timestamp: Date.now(),
        });

        localStorage.setItem(PLAYER_SESSION, playerId);
        this.setState({ playerName: "", playerId, hasPlayerSession: playerId });
      } else {
        this.setState({ writeError: "Please try again..." });
      }
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  };

  handleStatementChange = async (event) => {
    const { name, value } = event.target;
    this.setState({
      [name]: value,
    });
    //also set isTyping to true -> only once do it based on value.length ==1
    if (value.length === 1) {
      this.setState({ writeError: null });
      const id = name.split("_")[1];
      try {
        await db.ref("statements/" + id).update({ isTyping: true });
      } catch (error) {
        this.setState({ writeError: error.message });
      }
    }
  };
  handleStatementBlur = async (event) => {
    //save value to the firebase
    //set typing to false
    const { name, value } = event.target;
    this.setState({ writeError: null });
    const id = name.split("_")[1];
    try {
      await db.ref("statements/" + id).update({ id, value, isTyping: false });
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  };

  startPoll = async () => {
    //set pollStarted = true
    let updates = {};
    this.setState({ writeError: null });
    const { game, players, playerId } = this.state;
    try {
      updates["/game"] = { ...game, pollStarted: true };
      players.forEach((player) => {
        const updatedPlayer = { ...player, lockedGuess: false };
        if (player.playerId && player.playerId != playerId) {
          updates["/players/" + player.playerId] = updatedPlayer;
        } else {
          console.log("wrong player", player);
        }
      });
      db.ref().update(updates);
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  };

  handleSubmitLie = () => {
    //update all the statement true or false
    //for all the user, update the score board
    this.setState({ writeError: null });
    try {
      const {
        playerId,
        players,
        guess,
        playedPlayerIds,
        currentPlayer,
        statements,
        game,
      } = this.state;
      const updatedStatements = {
        1: { ...statements[0], isLie: guess == 1 },
        2: { ...statements[1], isLie: guess == 2 },
      };
      let updates = {};
      updates["/statements"] = updatedStatements;
      players.forEach((player) => {
        const totalCorrectGuess =
          player.currentGuess == guess
            ? parseInt(player.totalCorrectGuess) + 1
            : player.totalCorrectGuess;
        const updatedPlayer = { ...player, totalCorrectGuess };
        if (player.playerId && player.playerId != playerId) {
          updates["/players/" + player.playerId] = updatedPlayer;
        } else {
          console.log("wrong player", player);
        }
      });
      let newPlayedList = {
        ...playedPlayerIds,
        [currentPlayer.playerId]: true,
      };
      updates["playedPlayerIds"] = newPlayedList;
      updates["game"] = { ...game, showResult: true };
      db.ref().update(updates);
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  };

  handleChooseNextPlayer = () => {
    //choosingPlayer = true,
    //remove the statements
    //pollStarted = false
    //showResult = false
    //remove every players current guess
    //set timer of 30 sec
    //get random player and set as current player, set choosingPlayer = false

    this.setState({ writeError: null });
    try {
      const { players, game } = this.state;
      let updateGame = {};
      updateGame["/game"] = {
        ...game,
        gameStarted: true,
        choosingPlayer: true,
        showResult: false,
      };

      updateGame["/currentPlayer"] = null;
      db.ref().update(updateGame);

      setTimeout(async () => {
        const playedPlayers = this.state.playedPlayerIds
          ? this.state.playedPlayerIds
          : {};
        const randomPlayer = getRandomPlayer(this.state.players, playedPlayers);
        this.setState({ writeError: null });
        let updates = {};
        try {
          // await db.ref("currentPlayer").set(randomPlayer);

          //deepak
          updates["/currentPlayer"] = randomPlayer;
          updates["/game"] = {
            ...game,
            gameStarted: true,
            showResult: false,
            choosingPlayer: false,
            pollStarted: true,
          };
          players.forEach((player) => {
            const updatedPlayer = {
              ...player,
              currentGuess: null,
              lockedGuess: false,
            };
            if (player.playerId) {
              updates["/players/" + player.playerId] = updatedPlayer;
            } else {
              console.log("wrong player", player);
            }
          });

          db.ref().update(updates);
        } catch (error) {
          this.setState({ writeError: error.message });
        }
      }, 5000);
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  };

  handleGuess = (event) => {
    this.setState({
      guess: event.target.value,
    });
  };

  handleSubmitGuess = async () => {
    //update players guess and lock it
    const { guess, playerId } = this.state;
    this.setState({ writeError: null });
    try {
      await db.ref("players/" + playerId).update({
        currentGuess: guess,
        lockedGuess: true,
      });
    } catch (error) {
      this.setState({ writeError: error.message });
    }
  };

  renderAnimation = (players) => {
    return (
      <div>
        <Animation
          names={players.map((player) => player.name)}
          duration={5000}
        />
      </div>
    );
  };

  renderChosenPlayerPollStartedUI = (
    playerId,
    playerInfo,
    currentPlayer,
    game,
    statements,
    guess,
    players
  ) => {
    //show 3 statements based on statements array from firebase
    //show the vote percentage below each statement if showResult == true
    //show actual poll, total votes
    //submit Lie button -> 50% vote , handleSubmitLie
    let percentages = [0, 0, 0];
    if (players.length > 0 && game.pollStarted) {
      percentages = getStatementWisePercentage(players);
    }
    return (
      <>
        <p>{currentPlayer.name}'s personality looks like?</p>
        <ListGroup>
          {statements.map((statement) => {
            return (
              <ListGroupItem
                active={guess == statement.id}
                key={statement.id}
                tag="label"
                for={statement.id}
                action
                disabled={game.showResult}
              >
                <input
                  type="radio"
                  id={statement.id}
                  name="guess"
                  value={statement.id}
                  checked={guess == statement.id}
                  onChange={this.handleGuess}
                  className="invisible"
                ></input>
                <label for={statement.id}>{statement.value}</label>
                {game.showResult && (
                  <div className="progress-wrapper">
                    <Progress
                      animated
                      color="info"
                      value={percentages[parseInt(statement.id) - 1]}
                    >
                      {percentages[parseInt(statement.id) - 1]}%/
                    </Progress>
                  </div>
                )}
              </ListGroupItem>
            );
          })}
        </ListGroup>
        <div className="total-guesses">
          <div>Total guesses:</div>
          <Progress animated color="info" value={percentages[2]}>
            {percentages[2]}%
          </Progress>
        </div>
        {!game.showResult && (
          <Button
            color="primary"
            size="lg"
            active
            onClick={this.handleSubmitLie}
          >
            Reveal
          </Button>
        )}
        {game.showResult && (
          <Button
            color="primary"
            size="lg"
            active
            onClick={this.handleChooseNextPlayer}
          >
            Choose the next player
          </Button>
        )}
      </>
    );
  };

  renderChosenPlayerBeforePollStartUI = (statement_1, statement_2) => {
    //show 3 text boxes, handleStatementChange, handleStatementBlur
    //show button in disabled state till all 3 statements are there, startPoll
    return (
      <>
        {" "}
        <p>What are you statements ?</p>
        <ListGroup>
          <ListGroupItem tag="label" for="1" action>
            <Input
              type="text"
              onChange={this.handleStatementChange}
              onBlur={this.handleStatementBlur}
              name="statement_1"
              value={statement_1}
            />
          </ListGroupItem>
          <ListGroupItem tag="label" for="2" action>
            <Input
              type="text"
              onChange={this.handleStatementChange}
              onBlur={this.handleStatementBlur}
              name="statement_2"
              value={statement_2}
            />
          </ListGroupItem>
        </ListGroup>
        <Button
          color="primary"
          size="lg"
          active
          onClick={this.startPoll}
          disabled={statement_1 === "" || statement_2 === ""}
        >
          Start Guess
        </Button>
      </>
    );
  };

  renderNonChosenPlayerUI = (
    playerId,
    playerInfo,
    currentPlayer,
    game,
    statements,
    guess,
    players
  ) => {
    //this is rest player screen
    //show result, show the result
    //show 3 statements based on statements array from firebase
    //if isTyping show typing...
    //show the vote percentage below each statement if showResult == true
    //if game.pollStarted === true show the button -> handleSubmitGuess
    const justStartedGame = statements.every(
      (statement) => statement.value == ""
    );
    if (justStartedGame) {
      return <div className="chosen-player-name">{currentPlayer.name}</div>;
    }
    let alertColor = "";
    let alertMessage = "";
    let percentages = [0, 0, 0];
    if (game.showResult) {
      const correctStatement = statements.find((statement) => statement.isLie);
      if (correctStatement && playerInfo.currentGuess == correctStatement.id) {
        alertColor = "success";
        alertMessage = "Great.....you guessed it!";
      } else {
        alertColor = "danger";
        alertMessage = "Better luck next time!";
      }
      percentages = getStatementWisePercentage(players);
    }
    return (
      <>
        {game.showResult && <Alert color={alertColor}>{alertMessage}</Alert>}
        <p>{currentPlayer.name}'s personality looks like?</p>
        <ListGroup>
          {statements.map((statement) => {
            return (
              <ListGroupItem
                active={guess == statement.id}
                key={statement.id}
                tag="label"
                for={statement.id}
                action
                color={game.showResult && statement.isLie ? "success" : "none"}
                disabled={
                  (currentPlayer && currentPlayer.playerId === playerId) ||
                  (playerInfo ? playerInfo.lockedGuess : false)
                }
              >
                <input
                  type="radio"
                  id={statement.id}
                  name="guess"
                  value={statement.id}
                  checked={guess == statement.id}
                  onChange={this.handleGuess}
                  className="invisible"
                ></input>
                <label for={statement.id}>
                  {statement.isTyping ? `typing...` : statement.value}
                </label>
                {game.showResult && (
                  <div className="progress-wrapper">
                    <Progress
                      animated
                      color="info"
                      value={percentages[parseInt(statement.id) - 1]}
                    >
                      {percentages[parseInt(statement.id) - 1]}%
                    </Progress>
                  </div>
                )}
              </ListGroupItem>
            );
          })}
        </ListGroup>
        <TimerButton
          onClick={this.handleSubmitGuess}
          disabled={
            playerInfo ? playerInfo.lockedGuess || !game.pollStarted || game.showResult : false
          }
          label={
            playerInfo && playerInfo.lockedGuess && game.pollStarted
              ? `Your guess is submitted`
              : `Submit Guess`
          }
        />
        {/* <Button
          color="primary"
          size="lg"
          active
          onClick={this.handleSubmitGuess}
          disabled={
            playerInfo ? playerInfo.lockedGuess || !game.pollStarted : false
          }
        >
          {playerInfo && playerInfo.lockedGuess && game.pollStarted
            ? `Your guess is submitted`
            : `Submit Guess`}
        </Button> */}
      </>
    );
  };

  renderLoginUI = (playerName, writeError) => {
    return (
      <form onSubmit={this.handleLogin}>
        <FormGroup>
          <Label for="userName">What is your good name?</Label>
          <Input
            type="text"
            name="name"
            id="userName"
            placeholder="Name"
            onChange={this.handlePlayerNameChange}
            value={playerName}
          />
        </FormGroup>

        {writeError ? <p>{writeError}</p> : null}

        <Button
          color="primary"
          size="lg"
          active
          type="submit"
          disabled={!playerName}
        >
          Start Playing
        </Button>
      </form>
    );
  };
  render() {
    const {
      showLoader,
      players,
      hasPlayerSession,
      playerId,
      playerName,
      writeError,
      game,
      guess,
      currentPlayer,
      statements,
      statement_1,
      statement_2,
      playedPlayerIds,
    } = this.state;

    let ui;
    if (showLoader) {
      ui = (
        <div className="loader">
          <Spinner style={{ width: "5rem", height: "5rem" }} />
        </div>
      );
    } else {
      const playerInfo = players.find((player) => player.playerId === playerId);
      if (hasPlayerSession && playerId) {
        //state.hasPlayerSession and playerId -> valid logged in user
        if (game && game.gameStarted) {
          //game.choosingPlayer === true && show the animation
          if (game.choosingPlayer) {
            ui = this.renderAnimation(players);
          } else {
            if (currentPlayer !== null && currentPlayer.playerId === playerId) {
              if (game.pollStarted) {
                ui = this.renderChosenPlayerPollStartedUI(
                  playerId,
                  playerInfo,
                  currentPlayer,
                  game,
                  statements,
                  guess,
                  players
                );
              } else {
                ui = this.renderChosenPlayerBeforePollStartUI(
                  statement_1,
                  statement_2
                );
              }
            } else if (currentPlayer) {
              ui = this.renderNonChosenPlayerUI(
                playerId,
                playerInfo,
                currentPlayer,
                game,
                statements,
                guess,
                players
              );
            } else {
              if (
                playedPlayerIds &&
                players.length === Object.keys(playedPlayerIds).length
              ) {
                ui = "Game Over!";
              } else {
                ui = (
                  <Button
                    color="primary"
                    size="lg"
                    active
                    onClick={this.handleChooseNextPlayer}
                  >
                    Lets give it one more try
                  </Button>
                );
              }
            }
          }
        } else {
          if (currentPlayer === null && game && game.gameStarter === playerId) {
            ui = (
              <Button
                color="primary"
                size="lg"
                active
                onClick={this.handleChooseNextPlayer}
              >
                Start Game
              </Button>
            );
          } else {
            ui = <div>Game will begin soon...</div>;
          }
        }
      } else {
        ui = this.renderLoginUI(playerName, writeError);
      }
    }

    return (
      <Jumbotron className="admin-wrapper">
        <div className="statement-wrapper">{ui}</div>
        {hasPlayerSession && playerId && (
          <div className="players-list">
            <Player players={this.state.players} />
          </div>
        )}
      </Jumbotron>
    );
  }
}
