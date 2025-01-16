import { View, Text, ScrollView, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from '../constants'
import CustomButton from './CustomButton'
import { useRouter } from 'expo-router'



const OnBoarding = () => {
  const router  = useRouter()
 
 
  return (
    <SafeAreaView className="h-full w-full bg-[#1F2833]">
      <ScrollView className="flex-1 ">
        <View className="w-full items-center mt-28">
          <Image
           source={images?.onboarding}
           className="w-96 h-96"
          />

        </View>
        <View className="flex items-start mx-10">
          <Text className="text-3xl font-pregular text-center text-white mt-10">
          Your world,
          </Text>
          <Text className="text-3xl font-pregular text-center text-white">
          one message away
          </Text>
        </View>
        <View>
          <CustomButton
          title={"Get Started"}
          containerStyles={"mt-10 mx-auto w-80 bg-white"}
          textStyles={""}
          handlePress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default OnBoarding