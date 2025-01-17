import { createContext, useState, useContext, useEffect, useRef } from "react";
import { registerForPushNotificationsAsync } from "../lib/notifications";
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from "firebase/firestore";
import { auth, db, getUserData } from "../lib/firebase";
import { useRouter } from "expo-router";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});


const NotificationContext = createContext();
export const useNotificationContext = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(
     
    );
    const notificationListener = useRef();
    const responseListener = useRef();

    const router = useRouter();


    const savePushToken = async (token) => {
      if(!token || !auth.currentUser) return;
      const userId = auth.currentUser.uid;
      setExpoPushToken(token);
      try {
        const userDocRef = doc(db, "users", userId); // Reference to the user's document
        await setDoc(userDocRef, {
          expoPushToken: token, // Save the expoPushToken field
        }, { merge: true }); // Use merge: true to avoid overwriting other fields
        console.log('Expo push token saved successfully');
      } catch (error) {
        console.error('Error saving expo push token:', error);
      }
      };


    
    useEffect(() => {
        registerForPushNotificationsAsync().then((token) => {
          savePushToken(token);
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
         
          setNotification(notification);
        });
        
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
           const { contact } = response.notification.request.content.data;
         
           setTimeout(() => {
            router.push({
              pathname: `/chats/${contact.userId}`,
              params: { contact : JSON.stringify(contact) }
            })
           }, 200);
        

        });
    
        return () => {
          notificationListener.current &&
            Notifications.removeNotificationSubscription(notificationListener.current);
          responseListener.current &&
            Notifications.removeNotificationSubscription(responseListener.current);
        };


    }, []);

    console.log(expoPushToken);
    console.log("notification", notification);


    return (
        <NotificationContext.Provider
          value={
            {
              expoPushToken
            }
          }
          >
            {children}
        </NotificationContext.Provider>
    );
};