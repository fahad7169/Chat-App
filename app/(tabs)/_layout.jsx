import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

const TabLayout = () => {
  return (
    <>
   <Tabs
   screenOptions={
    {
     headerShown: false,
     sceneStyle:{
      backgroundColor: '#2F3A47'
     },
     tabBarStyle: {
        position: 'absolute',
        left: 16,
        right: 16,
        height: 62,
        backgroundColor: '#2F3A47',
        alignItems: 'center',
        justifyContent: 'center',
        
     }
      
    }
  }
    >
        <Tabs.Screen
    name="messaging"
    options={{
      title: "Messaging",
      headerShown: false,
      tabBarIcon: ({ focused }) => (
         
             <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={focused ? '#3B82F6' : '#9CA3AF'} />
                
         
      ),
    }}
  />

  {/* Settings Screen */}
  <Tabs.Screen
    name="settings"
    options={{
      title: "Settings",
      headerShown: false,
      tabBarIcon: ({ focused }) => (
       
           <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={focused ? '#3B82F6' : '#9CA3AF'} />
  
    ),
    }}
  />
   </Tabs>
    <StatusBar style="light" />
    </>
  )
}

export default TabLayout