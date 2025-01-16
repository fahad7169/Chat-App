import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, getUserRoomsAndParticipants, db, fetchParticipantsData } from '../../lib/firebase'; // Update import path as necessary
import { formatMessageDate } from '../../lib/utils';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatContext } from '../../context/ChatContext';

const Messaging = () => {
  const router = useRouter();
  const { rooms,loading } = useChatContext()
  
  useEffect(() => {
   console.log(rooms)
  }, [loading])
  
  
  
  
  
  const sortedRooms = [...rooms].sort((a, b) => {
    if (!a?.lastUpdated || !b?.lastUpdated) {
      return 0; // Treat rooms without timestamps as equal
    }
    const timeA = new Date(a.lastUpdated).getTime();
    const timeB = new Date(b.lastUpdated).getTime();
    return timeB - timeA; // Sort in descending order (latest message first)
  });
  
  
 

  return (
    <SafeAreaView className="flex-1 bg-[#1F2833] pt-5">
    {/* Header */}
    <View className="flex-row items-center mx-5 border rounded-lg border-[#ffffff] px-3 py-2">
      <TextInput
        placeholder="Search"
        placeholderTextColor="#A0A3A7"
        className="flex-1 mr-2 h-8 bg-transparent text-white text-base py-2"
      />
      <TouchableOpacity activeOpacity={0.7} className="w-8 h-8 justify-center items-center">
        <Ionicons name="search" size={24} color="white" />
      </TouchableOpacity>
    </View>
  
    {/* Contacts ScrollView */}
    { loading ? 
                     <View className="flex-1 h-full w-full justify-center items-center" >
                       <ActivityIndicator size="large" color="#ffffff" />
                     </View>
                  :
    <ScrollView className="mt-5 max-h-[84%]">
      {sortedRooms.map((room, index) => (
        <TouchableOpacity
          key={room?.roomId}
          className="flex-row items-center py-3 px-4 border-b-[1px] border-[#232533]"
          onPress={() =>
            router.push({
              pathname: `/chats/${room?.participantsData[index]?.userId}`,
              params: { contact: JSON.stringify(room?.participantsData[index]) },
            }) // Navigate to chat screen
          }
          activeOpacity={0.7}
        >
          {/* Profile Picture */}
          <Image
            source={{ uri: room?.participantsData[index]?.profilePic }}
            className="w-[50px] h-[50px] rounded-[25px] mr-[15px]"
          />
  
          {/* Contact Information */}
          <View className="flex-1 justify-center">
            <Text className="text-lg text-white font-bold">
              {room?.participantsData[index]?.username}
            </Text>
            <Text className="text-[#A0A3A7] mt-1 text-sm" numberOfLines={1}>
              {room?.lastMessage}
            </Text>
          </View>
  
          {/* Timestamp */}
          <Text
            className={`text-xs ${
              room?.lastMessageTo === auth.currentUser.uid
                ? room?.lastMessageStatus === "seen"
                  ? "text-[#A0A3A7]" // Receiver has seen the message
                  : "text-[#00B300]" // Receiver has not seen the message
                : "text-[#A0A3A7]" // Sender's timestamp, always gray
            } ml-[10px] mb-3`}
          >
            {formatMessageDate(room?.lastUpdated)}
          </Text>
  
          {/* Unread message indicator */}
          {room?.lastMessageStatus !== "seen" && room?.lastMessageTo === auth.currentUser.uid && (
            <View className="absolute right-3 bottom-2 justify-center items-center">
              <Ionicons name="ellipse" size={24} color="#00B300" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
}
    <TouchableOpacity
      onPress={() => router.push('/contacts')}
      className="w-14 h-14 bg-white absolute rounded-full right-8 bottom-24 flex justify-center items-center"
    >
      <Ionicons name="add" size={30} color="#00000" />
    </TouchableOpacity>
  </SafeAreaView>
  
  );
};

export default Messaging;
