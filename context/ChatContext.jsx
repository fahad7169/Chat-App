import { createContext, useState, useContext, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { auth, db, fetchParticipantsData } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";



const ChatContext = createContext();
export const useChatContext = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [rooms, setRooms] = useState([]);
    const [messages, setMessages] = useState({});
    const [loading, setLoading] = useState(true); // Start with loading state set to true
    const [user, setUser] = useState(null);


    useEffect(() => {
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
          setUser(authUser);
       
        });
    
        return () => unsubscribe(); // Clean up the listener when the component is unmounted
      }, []);


    
    
    // Fetch rooms
  useEffect(() => {
    
    if (user) {
      console.log("IF CONDITION IS TRUE");
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
               });
         
               return prevRooms; // Maintain consistency while async processing resolves
             });
        setLoading(false);  // Set loading to false once data is fetched
      }, (error) => {
        console.error("Error fetching rooms: ", error);
        setLoading(false);  // Set loading to false if an error occurs
      });

      return () => unsubscribeRooms();
    }
  }, [user]);

  
  useEffect(() => {
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
        });
      });
  
      return () => unsubscribeMessages.forEach((unsubscribe) => unsubscribe());
    }
  }, [user, rooms]);
  
  


  const getRoomMessages = (roomId) => {
    return messages[roomId] || [];
  };


    return (
        <ChatContext.Provider
         value={{
            rooms,
            setRooms,
            messages,
            setMessages,
            loading,
            getRoomMessages
         }}
          >
            {children}
        </ChatContext.Provider>
    );
};