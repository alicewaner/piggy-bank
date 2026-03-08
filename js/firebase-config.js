// ============================================================
// firebase-config.js — Firebase initialization
// ============================================================

var firebaseConfig = {
  apiKey: "AIzaSyBiXJvgiU556WYe77Cl8Yb5zO9Bw3GJKJs",
  authDomain: "piggy-bank-17a7c.firebaseapp.com",
  projectId: "piggy-bank-17a7c",
  storageBucket: "piggy-bank-17a7c.firebasestorage.app",
  messagingSenderId: "1012332227997",
  appId: "1:1012332227997:web:2788d48e43ff48b28ad374"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var auth = firebase.auth();

// Enable offline persistence so app works without network
db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
  if (err.code === 'failed-precondition') {
    console.log('Firestore persistence: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.log('Firestore persistence: browser not supported');
  }
});
