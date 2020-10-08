import React from "react";
import { Table } from 'reactstrap';
export const Player = ({ players }) => {
    
  return (
      <Table striped>
        <thead>
          <tr>
            <th>Sr.No.</th>
            <th>Name</th>
            <th>Correct guesses</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            return (
              <tr key={player.id}>
                <th scope="row">{index + 1}</th>
                <td>{player.name}</td>
                <td>{player.totalCorrectGuess}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
  );
};
