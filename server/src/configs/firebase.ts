const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, onValue } = require("firebase/database");

// Firebase config từ Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDeL7aNLwW5X8wi13VRmFtuuUSsslgcmbU",
  authDomain: "toeic-project-c00da.firebaseapp.com",
  databaseURL:
    "https://toeic-project-c00da-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "toeic-project-c00da",
  storageBucket: "toeic-project-c00da.firebasestorage.app",
  messagingSenderId: "234581371916",
  appId: "1:234581371916:web:19d9e6d3d0478320f25229",
  measurementId: "G-QJDHH9461S",
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);
const firebase = getDatabase(app);

// Ghi dữ liệu
set(ref(firebase, "users/user1"), {
  name: "Alice",
  age: 25,
});

// Đọc dữ liệu
get(ref(firebase, "users/user1")).then((snapshot: any) => {
  if (snapshot.exists()) {
    console.log(snapshot.val());
  } else {
    console.log("No data available");
  }
});

// Lắng nghe thay đổi dữ liệu
onValue(ref(firebase, "users"), (snapshot: any) => {
  console.log("Updated data:", snapshot.val());
});
export { firebase, set, get, onValue, ref };
