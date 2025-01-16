import { FontAwesome, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, getLastMessage, getMessagesForRoom, getUserData, markLastMessageAsSeen, sendMessage } from '../../lib/firebase';
import Arrow from '../../components/Arrow';
import { convertTo24HourFormat, generateRoomId, generateUniqueId } from '../../lib/utils';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const router = useRouter();

  const isScreenFocused = useRef(false); // Track if the screen is focused

  useFocusEffect(
    React.useCallback(() => {
      isScreenFocused.current = true;

      // Mark unseen messages as seen when the screen comes into focus
      const unseenMessages = messages.filter(
        (message) => message.status === 'sent' && message.to === user.uid
      );

      unseenMessages.forEach((message) => {
        const messageDocRef = doc(
          db,
          'chats',
          generateRoomId(currentUser?.userId, contactData?.userId),
          'messages',
          message.id
        );

        updateDoc(messageDocRef, { status: 'seen' }).then(() => {
          console.log('Message marked as seen:', message.id);
        });
      });

      return () => {
        isScreenFocused.current = false; // Reset on screen blur
      };
    }, [messages, currentUser, contactData])
  );


  useEffect(() => {
    if(currentUser && contactData && messages.length > 0){
      const roomId = generateRoomId(currentUser?.userId, contactData?.userId);

      getLastMessage(roomId).then((lastMessageData) => {
        setLastMessage(lastMessageData);
      });
    }
    console.log("Last")
    }
    , [messages]);



  useEffect(() => {
    const markMessagesAsSeen = async () => {
      try {
      if(currentUser && contactData && messages.length > 0 && lastMessage?.lastMessageStatus !== 'seen' && lastMessage?.lastMessageTo === currentUser?.userId){

        const roomId = generateRoomId(currentUser?.userId, contactData?.userId);

        const roomRef = doc(db, "chats", roomId);

         // Check if the room exists
      const roomDoc = await getDoc(roomRef);
      if (roomDoc.exists()) {
        console.log("Room exists, updating last message status to 'seen'");
        await markLastMessageAsSeen(generateRoomId(currentUser?.userId, contactData?.userId));
      
    }
      }
      } catch (error) {
        console.error("Error marking messages as seen:", error);
      }
    };
  
    markMessagesAsSeen();
  }, [messages, currentUser, contactData, lastMessage]);
  
  

  


  
 
  useEffect(() => {
    if (user) {
      getUserData(user.uid).then((userData) => {
        setCurrentUser(userData);
      });
    }
  }, []);

  useEffect(() => {
    scrollToEnd();
   
  }, [messages]);


  useEffect(() => {
   if(currentUser && contactData){

   setLoading(true);
    getMessagesForRoom(generateRoomId(currentUser?.userId, contactData?.userId)).then((messages) => {
      setMessages(messages);
      setLoading(false);
    });
   }
  }, [currentUser]);

// Function to listen for messages across all rooms where the current user is a participant
useEffect(() => {
  if (currentUser && contactData) {
    const roomId = generateRoomId(currentUser?.userId, contactData?.userId);
    const messagesRef = collection(db, 'chats', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    console.log('Listening for messages in Firestore for room ID:', roomId);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(
        'Firestore query snapshot triggered. Total messages fetched:',
        querySnapshot.size
      );

      const firestoreMessages = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.map((localMessage) => {
          const matchedFirestoreMessage = firestoreMessages.find(
            (firestoreMessage) => firestoreMessage.id === localMessage.id
          );

          if (matchedFirestoreMessage) {
            return { ...localMessage, ...matchedFirestoreMessage };
          }
          return localMessage;
        });

        const newMessages = firestoreMessages.filter(
          (firestoreMessage) =>
            !prevMessages.some((localMessage) => localMessage.id === firestoreMessage.id)
        );

        const filteredNewMessages = newMessages.filter(
          (message) => message.from !== user?.uid
        );

        console.log("Filtered Messages: ", filteredNewMessages)

        return [...updatedMessages, ...filteredNewMessages];
      });
    });

    return () => {
      console.log('Cleaning up Firestore listener for room ID:', roomId);
      unsubscribe();
    };
  }
}, [currentUser, contactData]);









  

  const { contact }    = useLocalSearchParams();
  const contactData = contact ? JSON.parse(contact) : null;
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef(null);


  // Function to scroll to the end of the FlatList
  const scrollToEnd = () => {
    flatListRef.current?.scrollToEnd();
  };
  

  const handleSend = async () => {
    if (newMessage.trim() === '') return;
  
    // Generate a dummy ID for the new message
    const dummyMessageId = generateUniqueId();
  
    const newMsg = {
      messageId: dummyMessageId, // Temporary ID for the pending message
      id: dummyMessageId,        // Temporary ID
      from: currentUser,
      to: contactData,
      room: generateRoomId(currentUser?.userId, contactData?.userId),
      message: newMessage,
      status: "pending",
      timestamp: new Date().toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit', // Add seconds to the timestamp
        hour12: true,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    };
  
    scrollToEnd();
  
    // Add the new message with the pending status and dummy ID
    setMessages((prevMessages) => [...prevMessages, newMsg]);
  
    setNewMessage('');
  
    // Now send the message and wait for the real messageId
    const messageId = await sendMessage(newMsg.room, newMsg.from?.userId, newMsg.to?.userId, newMsg.message, newMsg.timestamp);
  
    // After receiving the real messageId, update the message status and ID
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.messageId === dummyMessageId
          ? { ...msg, messageId, id: messageId, status: "sent" } // Update the dummy message with real ID and status
          : msg
      )
    );
  };
  



  const renderMessage = ({ item }) => {
    if (!item || !item.message) return null; // Ensure valid message object

    const isSender = item?.from !== contactData?.userId;
    let cleanedTimestamp=''
    if (item?.timestamp.length === 24) {
      // Remove characters from position 17 to 19
       cleanedTimestamp = item.timestamp.slice(0, 17) + item.timestamp.slice(19);
    }
    else{
      cleanedTimestamp=item.timestamp.slice(0, 16) + item.timestamp.slice(19);
    }

    // console.log(item.messageId);

    // Determine the status icon
    let StatusIcon;
    let iconColor = '#FFFFFF'; // Default color for icons

    switch (item.status) {
      case 'pending':
        StatusIcon = <Ionicons name="time-outline" size={14} color={iconColor} />;
        break;
      case 'sent':
        StatusIcon = <FontAwesome5 name="check" size={14} color={iconColor} />;
        break;
      case 'delivered':
        StatusIcon = <FontAwesome5 name="check-double" size={14} color={iconColor} />;
        break;
      case 'seen':
        StatusIcon = <FontAwesome5 name="check-double" size={14} color="skyblue" />;
        break;
      default:
        StatusIcon = <Ionicons name="time-outline" size={14} color={iconColor} />;
    }
    

    return (
      <View
        style={[
          styles.messageContainer,
          isSender ? styles.receiverContainer : styles.senderContainer,
        ]}
      >
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.dateTimeText}>{cleanedTimestamp}</Text>
        {isSender && <Text className="self-end">{StatusIcon}</Text>}
      </View>
    );
  };

 
  // Sort the messages based on dateTime in ascending order
  const sortedMessages = [...messages].sort((a, b) => {
    if (!a || !b || !a?.timestamp || !b?.timestamp) {
      return 0; // If any timestamp is null/undefined, treat them as equal
    }
    const dateA = new Date(convertTo24HourFormat(a.timestamp)).getTime();
    const dateB = new Date(convertTo24HourFormat(b.timestamp)).getTime();
    return dateA - dateB;
  });
  

  return (
    <SafeAreaView className="flex-1 bg-[#1F2833]">
      <View style={styles.headerContainer}>
        {/*Back Button */}
        <TouchableOpacity 
         onPress={() => router.back()}
         className="rotate-180 m-2">
         <Arrow/>
         </TouchableOpacity>
      {/* Profile Picture and Name */}
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: contactData?.profilePic }}
          style={styles.profilePic}
        />
        <Text style={styles.usernameText}>
          {contactData?.username || contactData?.phoneNumber}
        </Text>
      </View>

      {/* Action Icons */}
      <View style={styles.iconContainer}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <FontAwesome name="phone" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <MaterialIcons name="videocam" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>{ loading ?   <Modal transparent={true} animationType="none">
                 <View className="flex-1 h-full w-full justify-center items-center" >
                   <ActivityIndicator size="large" color="#ffffff" />
                 </View>
               </Modal> :
      <FlatList
        ref={flatListRef}
        data={sortedMessages}
        keyExtractor={(item) => item?.messageId || item?.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={scrollToEnd} // Scroll to the end when content changes
      />
    }
      <View className={`flex-row items-center p-[10px] border-t border-[#3C4858] ${loading ? "absolute bottom-0" : ""}`}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline={true} // Allows the input to expand vertically
          textAlignVertical="top" // Ensures the text aligns properly when multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    padding: 10,
    marginTop: 5,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '75%',
    borderRadius: 10,
    padding: 10,
  },
  senderContainer: {
    backgroundColor: '#4C5B70',
    alignSelf: 'flex-start',
  },
  receiverContainer: {
    backgroundColor: '#2F3A47',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dateTimeText: {
    color: '#B0B0B0',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2F3A47',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    maxHeight: 90, // Limits vertical expansion
    minHeight: 40,  // Adds a minimum height
    maxWidth: '100%', // Prevents horizontal expansion
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#4C5B70',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2833',
    gap: 10,
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#3C4858',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  usernameText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 15,
    flex: 1,
    alignItems: 'center',
    marginRight: '10'
  },
  iconButton: {
    marginLeft: 15,
  },
});

export default ChatScreen;
