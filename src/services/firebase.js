import firebase from "firebase";

const config = {
  apiKey: "AIzaSyCJG21FTfLkdbSSffRbCWUkhsUCz8fjFzA",
  authDomain: "personality-2a30d.firebaseapp.com",
  databaseURL: "https://personality-2a30d.firebaseio.com",
};

firebase.initializeApp(config);
export const auth = firebase.auth;
export const db = firebase.database();
