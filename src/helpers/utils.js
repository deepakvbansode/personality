export const getRandomPlayer = (allPlayers, playedPlayers = {}) => {
  if (allPlayers.length === Object.keys(playedPlayers).length) {
    return null;
  }
  const playingPlayer = allPlayers.filter(
    (player) => !playedPlayers[player.playerId]
  );
  const noOfPlayers = playingPlayer.length;
  const playerIndex = Math.floor(Math.random() * noOfPlayers);
  return playingPlayer[playerIndex];
};

export const getStatementWisePercentage = (players) => {
  let statement1Guess = 0;
  let statement2Guess = 0;
  let totalGuess = 0;
  players.forEach((player) => {
    switch (player.currentGuess) {
      case "1":
        statement1Guess++;
        totalGuess++;
        break;
      case "2":
        statement2Guess++;
        totalGuess++;
        break;
      default:
        return;
    }
  });
  const totalPlayers = players.length - 1;
  let state1P =
    totalPlayers > 0
      ? Math.round((100 * parseInt(statement1Guess)) / totalPlayers)
      : 0;
  let state2P =
    totalPlayers > 0
      ? Math.round((100 * parseInt(statement2Guess)) / totalPlayers)
      : 0;
  
  let tp =
    totalPlayers > 0
      ? Math.round((100 * parseInt(totalGuess)) / totalPlayers)
      : 0;
  return [state1P, state2P,  tp];
};
