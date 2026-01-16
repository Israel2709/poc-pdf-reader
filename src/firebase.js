import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJpy4zcp0dNRiRPqGyJBWG7YsiRE9NIrM",
  authDomain: "prodik-news.firebaseapp.com",
  databaseURL: "https://prodik-news-default-rtdb.firebaseio.com",
  projectId: "prodik-news",
  storageBucket: "prodik-news.firebasestorage.app",
  messagingSenderId: "505055128886",
  appId: "1:505055128886:web:20bacb8dc13fc5a396d797",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const storage = getStorage(firebaseApp);
