import { createContext, useState, useContext, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { auth, db, fetchParticipantsData } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { notifyUserAboutNewMessage } from "../lib/notifications";
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from "@react-native-async-storage/async-storage";


const ChatContext = createContext();
export const useChatContext = () => useContext(ChatContext);

const CHAT_TASK_NAME = 'chat-background-fetch';

export const ChatProvider = ({ children }) => {
    const [rooms, setRooms] = useState([]);
    const [messages, setMessages] = useState({});
    const [loading, setLoading] = useState(true); // Start with loading state set to true
    const [user, setUser] = useState(null);
    const isChatScreenFocused = useRef(false);
    const roomIndex = useRef(0);


    useEffect(() => {
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
          setUser(authUser);
       
        });
    
        return () => unsubscribe(); // Clean up the listener when the component is unmounted
      }, []);


      // Set up background fetch task
  useEffect(() => {
    // Register the background task
    TaskManager.defineTask(CHAT_TASK_NAME, async () => {
      try {
        if (user) {
          // Fetch rooms and messages
          await fetchRooms();
          await fetchMessages();
          return BackgroundFetch?.Result?.NewData; // Indicating that new data is fetched
        }
        return BackgroundFetch?.Result?.NoData;
      } catch (error) {
        console.error("Error in background fetch task:", error);
        return BackgroundFetch?.Result?.Failed;
      }
    });

    // Register the background fetch task
    const registerBackgroundFetch = async () => {
      await BackgroundFetch.registerTaskAsync(CHAT_TASK_NAME, {
        minimumInterval: 1, // Run every second
        stopOnTerminate: false, // Keep running after app terminates
        startOnBoot: true, // Start task after device restarts
      });
    };

    registerBackgroundFetch();

    return () => {
      // Clean up task when component is unmounted
      TaskManager.unregisterTaskAsync(CHAT_TASK_NAME);
    };
  }, [user]);

    
    
    // Fetch rooms
    const fetchRooms = async () => {
      try {
        if (user) {
        
          

          const roomsQuery = query(
            collection(db, "chats"),
            where("participants", "array-contains", auth.currentUser.uid)
          );
          
          const unsubscribeRooms = onSnapshot(roomsQuery, (querySnapshot) => {
            const firestoreRooms = querySnapshot.docs.map(doc => ({
              ...doc.data(),
              roomId: doc.id,
    
            }));
            console.log("Firestore rooms:", firestoreRooms);
             setRooms((prevRooms) => {
                   // Merge and deduplicate data
                   const updatedRooms = prevRooms.map((localRoom) => {
                     const matchedFirestoreRoom = firestoreRooms.find(
                       (firestoreRoom) => firestoreRoom.roomId === localRoom.roomId
                     );
             
                     if (matchedFirestoreRoom) {
                       return {
                         ...localRoom,
                         ...matchedFirestoreRoom,
                       };
                     }
             
                     return localRoom;
                   });
             
                   const newRooms = firestoreRooms.filter(
                     (firestoreRoom) =>
                       !prevRooms.some((localRoom) => localRoom.roomId === firestoreRoom.roomId)
                   );
             
                   const finalRooms = [...updatedRooms, ...newRooms];
             
                   // Fetch participantsData for rooms where it's missing
                   const updatedFinalRooms = finalRooms.map(async (room) => {
                     if (!room.participantsData || room.participantsData.length === 0) {
                       const participantsData = await fetchParticipantsData(
                         room.participants,
                         auth.currentUser.uid
                       );
                       return {
                         ...room,
                         participantsData, // Add participantsData
                       };
                     }
                     return room; // Return room as is if participantsData exists
                   });
             
                   // Wait for all participant data to resolve
                   Promise.all(updatedFinalRooms).then((resolvedRooms) => {
                     const deduplicatedRooms = resolvedRooms.filter(
                       (room, index, self) =>
                         room &&
                         self.findIndex((r) => r.roomId === room.roomId) === index
                     );
             
                    //  console.log("Updated state:", JSON.stringify(deduplicatedRooms, null, 2));
                     setRooms(deduplicatedRooms);
                      // Save updated rooms to AsyncStorage
                    //remove previous rooms and add new rooms
                    AsyncStorage.removeItem('rooms').then(() => {
                      AsyncStorage.setItem('rooms', JSON.stringify(deduplicatedRooms)).then(() => {
                        console.log('Rooms saved to AsyncStorage');
                      });
                    })
                   });
             
                   return prevRooms; // Maintain consistency while async processing resolves
                 });
          
          }, (error) => {
            console.error("Error fetching rooms: ", error);
           
          });
    
          return () => unsubscribeRooms();
        }
       }
       catch (error) {
         console.error('Error fetching rooms:', error);
       }
    }
      
         
        
     
        
const fetchMessages = async () => {
  if (user && rooms.length > 0) {
   
    // Fetch messages for all rooms where the current user is a participant
    const unsubscribeMessages = rooms.map((room) => {
      const messageRef = collection(db, "chats", room?.roomId, "messages");
      const messagesQuery = query(messageRef, orderBy("timestamp", "asc"));

      return onSnapshot(messagesQuery, (querySnapshot) => {
        const firestoreMessages = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

    

        setMessages((prevMessages) => {
          // Ensure `prevMessages` is an object and `prevMessages[room.roomId]` is initialized
          const currentRoomMessages = prevMessages[room.roomId] || [];

          // Merge local and Firestore messages
          const updatedMessages = currentRoomMessages.map((localMessage) => {
            const matchedFirestoreMessage = firestoreMessages.find(
              (firestoreMessage) => firestoreMessage.id === localMessage.id
            );

            if (matchedFirestoreMessage) {
              return { ...localMessage, ...matchedFirestoreMessage };
            }
            return localMessage;
          });

          // Filter out new messages not already in the local state
          const newMessages = firestoreMessages.filter(
            (firestoreMessage) =>
              !currentRoomMessages.some(
                (localMessage) => localMessage.id === firestoreMessage.id
              )
          );

          // console.log("New Messages for Room:", room?.roomId, newMessages);
          newMessages.forEach((message) => {
                if(message.status === "sent" && message.to === auth.currentUser.uid){

                     
                    console.log("isChatScreenFocused:", isChatScreenFocused.current);
                    console.log("New message:", message);
                    if (!isChatScreenFocused.current) {
                      notifyUserAboutNewMessage(message).then(() => {
                        console.log("Notification sent after delay.");
                      });
                    }
               
                  
                  const messageDocRef = doc(
                    db,
                    'chats',
                    room?.roomId,
                    'messages',
                    message.id
                  );
          
                  updateDoc(messageDocRef, { status: 'delivered' }).then(() => {
                    console.log('Message marked as delivered:', message);
                  });
              
                }
              });
      
             

             

          // Combine and return the updated state
          return {
            ...prevMessages,
            [room.roomId]: [...updatedMessages, ...newMessages],
          };
        });
       AsyncStorage.removeItem('messages').then(() => {
        AsyncStorage.setItem('messages', JSON.stringify(messages)).then(() => {
          console.log('Messages saved to AsyncStorage');
        })
       });
      });
    });

    return () => unsubscribeMessages.forEach((unsubscribe) => unsubscribe());
  }
}
    
   
 

  
useEffect(() => {
  fetchMessages().finally(() => {
    setLoading(false);
  })
}, [user, rooms]);

  // Fetch rooms
  useEffect(() => {
      fetchRooms().finally(() => {
        setLoading(false);
      });
  },[user])
  
      
  

  
  






  useEffect(() => {
    // Fetch rooms and messages when the app is in the foreground
    const loadCachedRooms = async () => {
      setLoading(true);
      const cachedRooms = JSON.parse(await AsyncStorage.getItem('rooms')) || [];
      if (cachedRooms.length > 0) {
     
        setRooms(cachedRooms);
      }
      else{
        await fetchRooms();
      }
      setLoading(false);
    }

    loadCachedRooms();
  }, [user]);

  useEffect(()=>{
    //Load messages from AsyncStorage when rooms change
    const loadCachedMessages = async () => {
      setLoading(true);
      const cachedMessages = JSON.parse(await AsyncStorage.getItem('messages')) || {};
      if (Object.entries(cachedMessages).length > 0) {
     
        setMessages(cachedMessages);
      }
      else{
         console.log("No cached messages found Fetching from firestore");
        await fetchMessages();
      }
      setLoading(false);
     
    }

    loadCachedMessages();
  },[user])

  useEffect(() => {
  if(rooms.length > 0){
    const sortedRooms = [...rooms].sort((a, b) => {
      if (!a?.lastUpdated || !b?.lastUpdated) {
        return 0; // Treat rooms without timestamps as equal
      }
      const timeA = new Date(a.lastUpdated).getTime();
      const timeB = new Date(b.lastUpdated).getTime();
      return timeB - timeA; // Sort in descending order (latest message first)
    });
    setRooms(sortedRooms);

  }
 
  }, [loading]);

  
  



    return (
        <ChatContext.Provider
         value={{
            rooms,
            setRooms,
            messages,
            setMessages,
            loading,
            isChatScreenFocused,
            roomIndex
          

         }}
          >
            {children}
        </ChatContext.Provider>
    );
};