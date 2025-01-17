import { Platform } from "react-native";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device'
import Constants from 'expo-constants';
import { doc, getDoc } from "firebase/firestore";
import { db, getUserData } from "./firebase";
import { generateRoomId } from "./utils";

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        handleRegistrationError('Permission not granted to get push token for push notification!');
        return;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        handleRegistrationError('Project ID not found');
      }
      try {
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log(pushTokenString);
        return pushTokenString;
      } catch (e) {
        handleRegistrationError(`${e}`);
      }
    } else {
      handleRegistrationError('Must use physical device for push notifications');
    }
  }

  function handleRegistrationError(errorMessage) {
    alert(errorMessage);
    throw new Error(errorMessage);
  }
  async function sendPushNotification(expoPushToken, message, senderData) {
    const notificationMessage = {
      to: expoPushToken,
      sound: 'default',
      title: senderData?.username,
      body: message?.message,
      data: { 
        contact: senderData,
       },
    };
  
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationMessage),
    });
  }
  
const getUserToken = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId); // Reference to the user's document
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data().expoPushToken; // Return user data (e.g., username, profilePic)
      } else {
        console.log("User not found");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

export const notifyUserAboutNewMessage = async (message) => {
    try {
      const token = await getUserToken(message?.to); // Fetch the user's token
      const senderData = await getUserData(message?.from); // Fetch the sender's data
      if (token) {
        console.log("Notifying: ", token);
        sendPushNotification(token, message, senderData); // Send push notification
      } else {
        console.log("User token not found");
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  };