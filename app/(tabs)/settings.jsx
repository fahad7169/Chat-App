import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../lib/firebase';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';


const Settings = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState('');
  const [formValue, setFormValue] = useState('');
  const router = useRouter();

  // Function to handle button presses
  const handleOpenSection = (section) => {
    setCurrentSection(section);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    Alert.alert('Success', `${currentSection} updated!`);
    setModalVisible(false);
    setFormValue('');
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormValue('');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: () => {
          
          signOut(auth)
            .then(() => {
               router.replace('/sign-in');
               AsyncStorage.clear();
              // Navigate to login screen or perform other post-logout actions
            })
            .catch((error) => {
              alert('Logout failed:', error.message);
            });
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="h-full w-full bg-[#1F2833]">
       
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex items-center mt-10">
          <Text className="text-3xl font-bold text-white">Settings</Text>
        </View>

        {/* Account Section */}
        <View className="flex items-start mx-10 mt-5">
          <Text className="text-lg font-bold text-white">Account</Text>
          <View className="flex items-start mt-2">
            <TouchableOpacity onPress={() => handleOpenSection('Edit Profile')}>
              <Text className="text-base font-medium text-white">Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOpenSection('Change Password')} className="mt-2">
              <Text className="text-base font-medium text-white">Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOpenSection('Privacy')} className="mt-2">
              <Text className="text-base font-medium text-white">Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="flex items-start mx-10 mt-5">
          <Text className="text-lg font-bold text-white">Notifications</Text>
          <View className="flex items-start mt-2">
            <TouchableOpacity onPress={() => handleOpenSection('Push Notifications')}>
              <Text className="text-base font-medium text-white">Push Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOpenSection('Email Notifications')} className="mt-2">
              <Text className="text-base font-medium text-white">Email Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View className="flex items-start mx-10 mt-5">
          <Text className="text-lg font-bold text-white">Support</Text>
          <View className="flex items-start mt-2">
            <TouchableOpacity onPress={() => handleOpenSection('Contact Us')}>
              <Text className="text-base font-medium text-white">Contact Us</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOpenSection('FAQ')} className="mt-2">
              <Text className="text-base font-medium text-white">FAQ</Text>
            </TouchableOpacity>
          </View>
        </View>

       

      </ScrollView>

      {/* Modal for Editable Sections */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentSection}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${currentSection}...`}
              placeholderTextColor="#aaa"
              value={formValue}
              onChangeText={setFormValue}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-1 justify-center items-center">
  {/* Other settings options go here */}
  
  <View className="absolute w-full items-center">
    <TouchableOpacity
      className="bg-red-500 py-3 px-10 rounded-md"
      onPress={handleLogout}
    >
      <Text className="text-base font-bold text-white">Log Out</Text>
    </TouchableOpacity>
  </View>
</View>
     
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2F3A47',
    borderRadius: 10,
    width: '85%',
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  textInput: {
    backgroundColor: '#4C5B70',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default Settings;
