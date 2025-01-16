import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth, signInWithPhoneNumber } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, getFirestore, getDoc, setDoc, doc, serverTimestamp, addDoc, updateDoc, orderBy, onSnapshot } from 'firebase/firestore';

// Your Firebase configuration
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth only once
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore();

// Function to send OTP to phone number
export const sendOTP = async (phoneNumber, recaptchaVerifier) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    alert('OTP sent!');
    return confirmationResult;
  } catch (error) {
    console.error(error);
  }
}

// Function to verify OTP and log in the user
export const verifyOTP = async (confirmationResult, otp) => {
  try {
    const result = await confirmationResult.confirm(otp);
    return result;
  } catch (error) {
    throw error;
  }
}

// Function to save user details along with dummy profile picture
// Function to save user details with a dummy profile picture URL
export const saveUserDetails = async (phoneNumber, username) => {
  try {
    const user = auth.currentUser;

    if (user) {
      const userRef = doc(db, "users", user.uid); // Reference to Firestore document
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        // Dummy profile image URL
        const dummyImageUrl = 'https://hancockogundiyapartners.com/wp-content/uploads/2019/07/dummy-profile-pic-300x300.jpg';

        // Save user details in Firestore, including the dummy profile picture URL
        await setDoc(userRef, {
          userId:user.uid,
          phoneNumber: phoneNumber,
          username: username,
          createdAt: new Date().toISOString(),
          profilePic: dummyImageUrl, // Save the dummy profile picture URL
        });

        console.log("User details saved successfully with dummy profile picture URL!");
      } else {
        console.log("User already exists!");
      }
    } else {
      console.error("No authenticated user found!");
    }
  } catch (error) {
    console.error("Error saving user details:", error);
  }
};


// Fetch registered users in chunks of 30
export const fetchRegisteredUsersInChunks = async (phoneNumbers) => {
  const chunkSize = 30; // Firestore's max `in` operator size
  const chunks = [];
  const usersRef = collection(db, 'users');

  // Split phoneNumbers into chunks
  for (let i = 0; i < phoneNumbers.length; i += chunkSize) {
    chunks.push(phoneNumbers.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk) => {
    const q = query(usersRef, where('phoneNumber', 'in', chunk));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  });

  // Await all promises and flatten the results
  const results = await Promise.all(promises);
  return results.flat();
};

export const sendMessage = async (roomId, from, to, message, dateTime) => {
  try {
    const roomRef = doc(db, "chats", roomId);
    const messagesRef = collection(roomRef, "messages");

    // Prepare the message object
    const newMessage = {
      from,
      to,
      message,
      timestamp: dateTime,
      status: "sent",
    };

    // Add the message
    const messageDocRef = await addDoc(messagesRef, newMessage);

    const messageId = messageDocRef.id;

    // Update room metadata with the last message and its status
    await Promise.all([
      updateDoc(messageDocRef, { messageId }),
      setDoc(
        roomRef,
        {
          participants: [from, to],
          lastMessage: message,
          lastMessageTo: to,
          lastMessageStatus: "unread", // Set initial status to unread
          lastUpdated: dateTime,
        },
        { merge: true } // Merges fields if the room already exists
      ),
    ]);

    console.log("Message sent successfully!");

    return messageId;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};


export const markLastMessageAsSeen = async (roomId) => {
  try {
    const roomRef = doc(db, "chats", roomId);

    // Update the last message status to 'seen'
    await updateDoc(roomRef, {
      lastMessageStatus: "seen",
    });

    console.log("Last message marked as seen!");
  } catch (error) {
    console.error("Error marking last message as seen:", error);
    throw error;
  }
};

export const getLastMessage = async (roomId) => {
  try {
    const roomRef = doc(db, "chats", roomId);
    const roomDoc = await getDoc(roomRef);
    const roomData = roomDoc.data();
    return roomData || {};
  } catch (error) {
    console.error("Error fetching last message:", error);
    throw error;
  }
};





export const markAsRead = async (chatId, messageId) => {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageRef, { status: "read" });
};

// Fetch user data by ID
export const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId); // Reference to the user's document
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data(); // Return user data (e.g., username, profilePic)
    } else {
      console.log("User not found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};


export const getRoomMetadata = async (roomId) => {
  const roomRef = doc(db, "rooms", roomId);
  const roomDoc = await getDoc(roomRef);

  if (roomDoc.exists()) {
    return roomDoc.data();
  } else {
    console.error("Room does not exist.");
    return null;
  }
};


// Fetch rooms where current user is a participant and the user data
export const getUserRoomsAndParticipants = async (userId) => {
  try {
    const roomsRef = collection(db, "chats"); // Reference to chats collection
    
    // Query rooms where the user is a participant
    const roomsQuery = query(roomsRef, where("participants", "array-contains", userId));
    const querySnapshot = await getDocs(roomsQuery);
    
    const rooms = [];
    
    // For each room, fetch room metadata and participant data
    for (const docSnapshot of querySnapshot.docs) {
      const roomData = docSnapshot.data();
      const roomId = docSnapshot.id; // Room ID is the document ID
      
      // Fetch user data for participants (excluding current user)
      const participants = roomData.participants.filter(participant => participant !== userId);
      const participantsData = await Promise.all(
        participants.map(async (participantId) => {
          const userData = await getUserData(participantId); // Fetch user data by participant ID
          return userData;
        })
      );
      
      // Fetch the metadata for the room (last message, last updated, etc.)
      const roomDocRef = doc(db, "chats", roomId); // Reference to the room document
      const roomDoc = await getDoc(roomDocRef); // Fetch the room document
      const roomMetaData = roomDoc.exists() ? roomDoc.data() : {};

      // Push the room data including metadata and participants data
      rooms.push({
        roomId,
        participantsData, // Array of user data for participants
        lastMessage: roomMetaData.lastMessage || null, // Last message
        lastUpdated: roomMetaData.lastUpdated || null, // Last updated timestamp
        lastMessageStatus: roomMetaData.lastMessageStatus || null, // Last message status
        lastMessageTo: roomMetaData.lastMessageTo || null, // Last message sender
      });
    }
    
    return rooms;
  } catch (error) {
    console.error("Error fetching rooms and participants:", error);
    throw error;
  }
};

export const fetchParticipantsData = async (participants, currentUserId) => {
  try {
    const participantsData = await Promise.all(
      participants
        .filter((id) => id !== currentUserId) // Exclude current user
        .map(async (participantId) => {
          const userData = await getUserData(participantId); // Fetch user data
          return userData;
        })
    );
    return participantsData;
  } catch (error) {
    console.error("Error fetching participants data:", error);
    throw error;
  }
};


export const getMessagesForRoom = async (roomId) => {
  try {
    console.log(roomId)
    // Reference to the room's messages sub-collection
    const messagesRef = collection(db, `chats/${roomId}/messages`);

    // Query messages ordered by timestamp
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    const querySnapshot = await getDocs(messagesQuery);

    const messages = querySnapshot.docs.map((doc) => ({
      id: doc.id, // Document ID
      ...doc.data(), // Message fields
    }));


    return messages;
  } catch (error) {
    console.error("Error retrieving messages for room:", error);
    throw error;
  }
};