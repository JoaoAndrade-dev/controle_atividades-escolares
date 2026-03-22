// src/navigation/AppNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import StudentsScreen from '../screens/StudentsScreen';
import WorksScreen from '../screens/WorksScreen';
import WorkDetailScreen from '../screens/WorkDetailScreen';
import ActivitiesProgressScreen from '../screens/ActivitiesProgressScreen';
import ChartScreen from '../screens/ChartScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const WorksStack = createNativeStackNavigator();

function WorksStackNavigator() {
  return (
    <WorksStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <WorksStack.Screen name="WorksList" component={WorksScreen} />
      <WorksStack.Screen name="WorkDetail" component={WorkDetailScreen} />
    </WorksStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Alunos') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Trabalhos') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Andamento') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Gráficos') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopColor: colors.primaryLight,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Alunos" component={StudentsScreen} />
      <Tab.Screen name="Trabalhos" component={WorksStackNavigator} />
      <Tab.Screen name="Andamento" component={ActivitiesProgressScreen} />
      <Tab.Screen name="Gráficos" component={ChartScreen} />
    </Tab.Navigator>
  );
}
