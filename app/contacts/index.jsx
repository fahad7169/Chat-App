import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { auth, fetchRegisteredUsersInChunks, getUserData } from '../../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const ContactsScreen = () => {
  const [userContacts, setUserContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper function to normalize phone numbers
  const normalizePhoneNumber = (number) => {
    // Remove all non-numeric characters except "+"
    let cleanedNumber = number.replace(/[^\d+]/g, '');

    // If the number starts with "+", assume it's already in international format
    if (cleanedNumber.startsWith('+')) {
      return cleanedNumber;
    }

    // For Pakistani numbers (starting with "0"), replace "0" with "+92"
    if (cleanedNumber.startsWith('0')) {
      return `+92${cleanedNumber.slice(1)}`;
    }

    // Add default country code (+92) if no "+" or leading "0" exists
    return `+92${cleanedNumber}`;
  };

  useEffect(() => {
    const loadContacts = async () => {
      try {
        // Load contacts from AsyncStorage
        const savedContacts = await AsyncStorage.getItem('userContacts');
        if (savedContacts) {
          setUserContacts(JSON.parse(savedContacts));
        } else {
          fetchContacts();
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };

    loadContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Request permission to access contacts
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Access to contacts is required to find registered users.');
        setLoading(false);
        return;
      }
  
      // Get all contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
  
      if (data.length > 0) {
        // Normalize and process phone numbers
        const processedPhoneNumbers = data
          .flatMap((contact) =>
            contact.phoneNumbers?.map((phone) => normalizePhoneNumber(phone.number.trim())) || []
          )
          .filter((number, index, self) => self.indexOf(number) === index); // Remove duplicates
  
        // Fetch registered users in chunks
        const registeredUsers = await fetchRegisteredUsersInChunks(processedPhoneNumbers);
  
        // Remove duplicates from registered users based on phone number
        const uniqueRegisteredUsers = Array.from(
          new Map(registeredUsers.map((user) => [user.phoneNumber, user])).values()
        );
  
        // Get the current user's phone number (you may need to use an API or local storage to fetch the user's phone number)
        const currentUserData = await getUserData(auth.currentUser.uid); // Example function to fetch user's phone number
  
        // Filter out the current user's number
        const filteredUsers = uniqueRegisteredUsers.filter(
          (user) => user.phoneNumber !== currentUserData.phoneNumber
        );
  
        // Retrieve existing contacts from AsyncStorage
        const savedContacts = await AsyncStorage.getItem('userContacts');
        const existingContacts = savedContacts ? JSON.parse(savedContacts) : [];
  
        // Filter out duplicates from existing contacts
        const newContacts = filteredUsers.filter(
          (contact) => !existingContacts.some((saved) => saved.id === contact.id)
        );
  
        // Combine existing and new contacts
        const allContacts = [...existingContacts, ...newContacts];
  
        // Save to AsyncStorage and update state
        await AsyncStorage.setItem('userContacts', JSON.stringify(allContacts));
        setUserContacts(allContacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };
 
  
 

  return (
    <SafeAreaView className="flex-1 bg-[#1F2833]">
      <ScrollView className="mt-5">
        {loading ? (
          <Modal transparent={true} animationType="none">
             <View className="flex-1 h-full justify-center items-center" >
               <ActivityIndicator size="large" color="#ffffff" />
             </View>
           </Modal>
        ) : userContacts.length > 0 ? (
          userContacts.map((contact, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center py-3 px-4 border-b-[1px] border-[#232533]"
              onPress={() => router.push({
                pathname: `/chats/${contact.id}`,
                params: { contact : JSON.stringify(contact) }
              })}
              activeOpacity={0.7}
            >
              {/* Profile Picture */}
              <Image 
                source={{ uri: contact?.profilePic }} 
                className="w-[50px] h-[50px] rounded-[25px] mr-[15px]" 
              />

              {/* Contact Information */}
              <View className="flex-1 justify-center">
                <Text className="text-lg text-white font-bold">{contact?.username || contact?.phoneNumber}</Text>
              </View>

            
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-center text-white mt-20 text-lg">No registered contacts found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ContactsScreen;
