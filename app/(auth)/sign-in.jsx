import { View, Text, TouchableOpacity, Image, TextInput, Modal, ActivityIndicator } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import CountryPicker,{ Flag } from 'react-native-country-picker-modal'
import Arrow from '../../components/Arrow'
import ArrowRight from '../../components/ArrowRight'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { FontAwesome5 } from '@expo/vector-icons'
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import {
  GestureDetector,
  Gesture,
  Directions,
} from 'react-native-gesture-handler';

import Animated, {
  FadeIn,
  FadeOut,
  BounceInRight,
  SlideOutLeft,
  BounceOutLeft,
  SlideInRight,
} from 'react-native-reanimated';


import { firebaseConfig, saveUserDetails, sendOTP, verifyOTP } from '../../lib/firebase'
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha'



 
const SignIn = () => {


 
   useFocusEffect(
     React.useCallback(() => {
        setScreenIndex(0);
        setTimer(60);

      
     }, [])
   );

  const [country, setCountry] = useState({
    cca2: 'PK', // Default country ISO code
    callingCode: ['92'], // Default country code
  });

  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter()


  const handleCountrySelect = (selectedCountry) => {
    // Ensure callingCode is updated correctly
    setCountry({
      cca2: selectedCountry.cca2,
      callingCode: selectedCountry.callingCode,
    });
    setShowPicker(false); // Close picker after selection
  };


 

 


  const [screenIndex, setScreenIndex] = useState(0);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [userName, setUserName] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
 


  const onboardingSteps = [
    {
      title: 'What\'s your',
      subtitle: 'number?',
      subtext: 'We\'ll send you a code to verify your number',
      content: (
        <TextInput
           className="text-base text-white h-full w-full"
          keyboardType="phone-pad"
          placeholder="30 274 28408"
          placeholderTextColor="#7F8C8D"
          value={mobileNumber}
          onChangeText={(text) => setMobileNumber(text)}
          maxLength={15}
        />
      ),
    },
    {
      
      title: 'What\'s the',
      subtitle: 'code?',
      subtext: 'Enter the code we sent to +'+ country.callingCode + mobileNumber,
      content: (
        <TextInput
          className="text-base text-white h-full w-full"
          keyboardType="number-pad"
          placeholder="Enter OTP"
          placeholderTextColor="#7F8C8D"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
        />
      ),
    },
    {
      
      title: 'What\'s your',
      subtitle: 'name?',
      subtext: 'Enter your name to get started',
      content: (
        <TextInput
          className="text-base text-white h-full w-full p-2"
          placeholder="Enter Your Name"
          placeholderTextColor="#7F8C8D"
          value={userName}
          onChangeText={(text) => setUserName(text)}
          maxLength={15}
        />
      ),
    },
  ];

  const onContinue = () => {
    
    const fullPhoneNumber = `+${country.callingCode}${mobileNumber}`;
    if (screenIndex === 0) {
     
      if (!mobileNumber) {
        alert('Please enter your phone number.');
        return;
      }
    
      
      if (!validatePhoneNumber(fullPhoneNumber, country.cca2)) {
        alert('Invalid phone number for the selected country.');
        return;
      }
      setLoading(true);
      const appVerifier = recaptchaVerifier.current;
      if (!appVerifier) {
        alert('Please verify the CAPTCHA first');
        return;
      }
      
      
      sendOTP(fullPhoneNumber,appVerifier).then((result) => {
        setLoading(false);
        setConfirmationResult(result);
        setScreenIndex(1);
        
      }).catch((error) => {
        alert('Failed to send OTP',error);
        setLoading(false); // Stop loading if OTP fails
      });
    } else if (screenIndex === 1) {
      
      try {
        if (!otp) {
          alert('Please enter the OTP sent to your phone number.');
          return;
        }
        setLoading(true);
        verifyOTP(confirmationResult, otp).then(() => {
         
            setScreenIndex(2);
            setLoading(false);
            
        }).catch((error) => {
          alert('Invalid OTP. Please try again.', error);
          setLoading(false); // Stop loading if OTP verification fails
        });
        
        
      } catch (error) {
        alert('Error during OTP verification:', error);
        setLoading(false); // Stop loading if error occurs
        return
      }
      
    } else if(screenIndex===2) {
    
    
      if (userName === '') {
        alert('Please enter your name');
        return;
      }
    
      setLoading(true)
      
      saveUserDetails(fullPhoneNumber,userName).then(()=>{
        console.log(screenIndex)
        setLoading(false)
        router.replace('/messaging')
      }).catch((error)=>{
        alert('Try again',error)
      })
    }
  };
  
  

  const onBack = () => {
    const isFirstScreen = screenIndex === 0;
    if (isFirstScreen) {
    router.back()
    } else {
      setScreenIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    }
  };
  

 

  const swipes = Gesture.Simultaneous(
    Gesture.Fling().runOnJS(true).direction(Directions.RIGHT).onStart(onBack),
    Gesture.Fling().runOnJS(true).direction(Directions.LEFT).onStart(onContinue)
  );

  const data = onboardingSteps[screenIndex];

  const inputRefs = useRef([]);

  const [loading, setLoading] = useState(false);
  

  const validatePhoneNumber = (phoneNumber, countryCode) => {
    const parsedNumber = parsePhoneNumberFromString(phoneNumber, countryCode);
    if (!parsedNumber || !parsedNumber.isValid()) {
      return false; // Invalid phone number
    }
    return true; // Valid phone number
  };

  const [timer, setTimer] = useState(60); // Timer starts at 60 seconds
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    if (screenIndex === 1 && timer > 0) {  // Check if screenIndex is 1
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
  
      return () => clearInterval(interval); // Cleanup interval on unmount
    } else if (timer === 0) {
      setIsButtonDisabled(false); // Enable the button when timer hits 0
    }
  }, [timer, screenIndex]); // Include screenIndex in the dependency array
  

  const resendOtp = () => {
    // Logic to resend OTP
    setLoading(true);
    try{

      const fullPhoneNumber = `+${country.callingCode}${mobileNumber}`;
      const appVerifier = recaptchaVerifier.current;
      if (!appVerifier) {
        alert('Please verify the CAPTCHA first');
        return;
      }
      sendOTP(fullPhoneNumber,appVerifier).then((result) => {
        setConfirmationResult(result);
        setLoading(false);
        setTimer(60); // Reset the timer
        alert("OTP resent!");
      });
      setIsButtonDisabled(true); // Disable the button again
    }
    catch(error){
      alert("Error: ",error)
    }
   
  };

 

  const recaptchaVerifier = useRef(null);

  return (
   <SafeAreaView className="h-full w-full bg-[#1F2833] flex-1">
    
       <Stack.Screen options={{ headerShown: false }} />
  
       
         {/*Back Button */}
         <TouchableOpacity 
         onPress={onBack}
         className="mx-4 mt-8 rotate-180 w-10">
         <Arrow/>
         </TouchableOpacity>

         
         {loading && (
  <Modal transparent={true} animationType="none">
    <View className="flex-1 h-full justify-center items-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  </Modal>
)}


         <GestureDetector gesture={swipes}>
 
         <View className="flex-1" key={screenIndex}>
   
    


         <View className="mx-8 mt-8">
          <Animated.Text entering={SlideInRight} exiting={SlideOutLeft} className="text-4xl font-psemibold text-white">
              {data.title}
            </Animated.Text>
          <Animated.Text entering={SlideInRight} exiting={SlideOutLeft}  className="text-4xl font-psemibold text-white mt-4">
           {data.subtitle}
          </Animated.Text>
          <Animated.Text entering={SlideInRight} exiting={SlideOutLeft} className="text-white mt-2 text-base">
            {data.subtext}
          </Animated.Text>
         </View>


         <View className="flex-1 mx-8 mt-8 flex-row">
      {/* Button to display selected country */}
      <TouchableOpacity
        className={`border-white border rounded-md w-fit h-12 justify-center p-2 ${screenIndex === 0 ? 'flex' : 'hidden'}`}
        onPress={() => setShowPicker(true)} // Show picker on press
      >
       <View className="flex-row items-center">
       <Flag countryCode={country.cca2} />
          <FontAwesome5 name="chevron-down" size={12} color="white" />
        </View>
      </TouchableOpacity>

      {/* Country Picker */}
      {showPicker && (
        <CountryPicker
          withFilter={true}
          withFlag={true}
          withCountryNameButton={true}
          withCallingCode={true}
          countryCode={country.cca2}
          onSelect={handleCountrySelect}
          onClose={() => setShowPicker(false)} // Close picker without selection
          visible={showPicker}
        />
      )}
      
      {/* Input field for phone number */}
      <View className={`flex-1 flex-row ml-2 border-white border rounded-md h-12 items-center ${screenIndex ===1 ? 'hidden' : 'flex'}`}>

        <Text className={`text-base text-white ml-1 mb-[2px] ${screenIndex === 0 ? 'flex' : 'hidden'}`}>
          {'+'+country?.callingCode[0]}
          </Text>

    
      {data.content}

      </View>

      <View className={`flex-row justify-between ${screenIndex === 1 ? 'flex' : 'hidden'}`}>
      {Array(6)
        .fill()
        .map((_, index) => (
          <TextInput
            key={index}
            className="text-base text-white h-12 w-12 ml-2 border-white border rounded-md text-center"
            keyboardType="number-pad"
            maxLength={1}
            value={otp[index] || ''}
            onChangeText={(text) => {
              const newOtp = otp.split('');
              newOtp[index] = text;
              setOtp(newOtp?.join(''));

              // Move to the next input box if not the last one
              if (text && index < 5) {
                inputRefs.current[index + 1]?.focus();
              }
            }}
            ref={(input) => {
              inputRefs.current[index] = input;
            }}
          />
        ))}

        <View className="flex-row absolute top-20 ml-3 items-center">
      <Text className="text-white text-base">Didn't recieve the code? </Text>
      {timer > 0 && <Text className="mr-2 text-white text-base">{timer}s</Text>}
      <TouchableOpacity
        
        onPress={resendOtp}
        disabled={isButtonDisabled}
       
      >
        <Text className={`text-base font-bold ${isButtonDisabled ? 'text-[#aaa]' : 'text-white'}`}>Send Again</Text>
      </TouchableOpacity>
    </View>

    </View>

      </View>

    
      <TouchableOpacity onPress={onContinue} className="w-16 h-16 bg-white my-8 rounded-full mx-72 flex items-center justify-center">
        <ArrowRight/>
      </TouchableOpacity>
       
      
      </View>
      </GestureDetector>

      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />
      
  
   </SafeAreaView>
  )
}

export default SignIn