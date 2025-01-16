import { createContext, useState, useContext, useEffect, useRef } from "react";
import { registerForPushNotificationsAsync } from "../lib/notifications";




const NotificationContext = createContext();
export const useNotificationContext = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [expoPushToken, setExpoPushToken] = useState('');
    
    useEffect(() => {
        registerForPushNotificationsAsync().then((token) => setExpoPushToken(token));
    }, []);

    console.log(expoPushToken);


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