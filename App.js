import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect  } from 'react';
import { Button, SafeAreaView, StyleSheet, Text,
   TextInput, FlatList, View, TouchableOpacity, Modal, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Timer from './Timer';
import { requestNotificationPermissions,
  scheduleNotifications,
  checkScheduledNotifications,
  setupNotificationListeners }
from './NotificationServices';


  // Настройка обработчика уведомлений
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
export default function App() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [activeHabit, setActiveHabit] = useState(null);
// Функция для получения следующей даты для конкретного дня недели
  const getNextDayOccurrence = (dayName) => {
  const days = {
    'Понедельник': 1, 'Вторник': 2, 'Среда': 3, 
    'Четверг': 4, 'Пятница': 5, 'Суббота': 6, 'Воскресение': 0
  };
  
  const today = new Date();
  const dayNumber = days[dayName];
  const todayNumber = today.getDay();
  
  let daysToAdd = dayNumber - todayNumber;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  
  const nextDate = new Date();
  nextDate.setDate(today.getDate() + daysToAdd);
  return nextDate;
};

  // Загрузка данных при запуске приложения
  useEffect(() => {
    const requestPermissionsAndInitialize = async () => {
      // Явный запрос разрешений
      const permissionResult = await requestNotificationPermissions();
      
      if (permissionResult) {
        // Если разрешения получены, загружаем привычки
        loadHabits();
      } else {
        // Если разрешения не получены, показываем предупреждение
        Alert.alert(
          'Уведомления', 
          'Для корректной работы приложения необходимо разрешить уведомления',
          [
            {
              text: 'Открыть настройки',
              onPress: () => {
                // Здесь можно добавить логику открытия настроек устройства
                // Это зависит от платформы (iOS/Android)
                Linking.openSettings(); // Потребуется импортировать Linking из 'react-native'
              }
            },
            {
              text: 'Отмена',
              style: 'cancel'
            }
          ]
        );
      }
    };
  
    requestPermissionsAndInitialize();
  }, []);

  useEffect(() => {
    // Настройка обработчика уведомлений в фоновом режиме
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Background notification handled:', response);
    });
  
    // Настройка обработчика уведомлений в активном режиме
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Foreground notification received:', notification);
    });
  
    return () => {
      backgroundSubscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Настраиваем обработчик уведомлений
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });
  
    // Инициализируем разрешения и слушатели
    const initialize = async () => {
      await requestNotificationPermissions();
      loadHabits();
    };
  
    // Устанавливаем слушатели уведомлений
    const cleanup = setupNotificationListeners();
  
    initialize();
  
    // Очищаем слушатели при размонтировании
    return () => {
      cleanup();
    };
  }, []);

  // Функция загрузки привычек из хранилища
  const loadHabits = async () => {
    try {
      const savedHabits = await AsyncStorage.getItem('habits');
      if (savedHabits !== null) {
        setHabits(JSON.parse(savedHabits));
      }
    } catch (error) {
      console.error('Error loading habits:', error);
      Alert.alert('Error', 'Failed to load habits');
    }
  };

  // Функция сохранения привычек в хранилище
  const saveHabitsToStorage = async (updatedHabits) => {
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
    } catch (error) {
      console.error('Error saving habits:', error);
      Alert.alert('Error', 'Failed to save habits');
    }
  };

  const openScheduleModal = (habit = null) => {
    setSelectedHabit(habit);
    setModalVisible(true);
    
    if (habit) {
      setNewHabit(habit.name);
      setDaysOfWeek(habit.schedule?.days || []);
      setStartTime(habit.schedule?.startTime || '');
    } else {
      setNewHabit('');
      setDaysOfWeek([]);
      setStartTime('');
    }
  };

  const saveSchedule = async () => {
    if (!newHabit.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите название привычки");
      return;
    }

    if (!validateTimeFormat(startTime)) {
      Alert.alert("Ошибка", "Пожалуйста, введите время в формате ЧЧ:ММ");
      return;
    }

    let updatedHabits;
    const habitData = {
      id: selectedHabit?.id || Date.now().toString(),
      name: newHabit,
      completed: false,
      sessions: [],
      schedule: {
        days: daysOfWeek,
        startTime
      }
    };

    if (selectedHabit) {
      updatedHabits = habits.map(habit => 
        habit.id === selectedHabit.id ? habitData : habit
      );
    } else {
      updatedHabits = [...habits, habitData];
    }

    try {
      await saveHabitsToStorage(updatedHabits);
      setHabits(updatedHabits);
      
      // Планируем уведомления для привычки
      await scheduleNotifications(habitData);
      
      setModalVisible(false);
      setSelectedHabit(null);
      setNewHabit('');
      setDaysOfWeek([]);
      setStartTime('');
    } catch (error) {
      console.error('Error saving habit:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить привычку');
    }
  };

  // Функция валидации формата времени
  const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // Функция удаления привычки
  const deleteHabit = async (habitId) => {
    try {
      const updatedHabits = habits.filter(habit => habit.id !== habitId);
      await saveHabitsToStorage(updatedHabits);
      setHabits(updatedHabits);
    } catch (error) {
      console.error('Error deleting habit:', error);
      Alert.alert('Error', 'Failed to delete habit');
    }
  };

  const toggleDay = (day) => {
    setDaysOfWeek((prevDays) => 
      prevDays.includes(day) ? prevDays.filter(d => d !== day) : [...prevDays, day]
    );
  };

  const renderHabit = ({ item }) => (
    <View style={styles.habitItem}>
      <Text style={styles.habitText}>{item.name}</Text>
      <View style={styles.habitButtons}>
      <TouchableOpacity 
        onPress={() => startTimer(item)}
        style={styles.timerButton}
      >
        <Text style={styles.timerButtonText}>▶</Text>
      </TouchableOpacity>

        <TouchableOpacity onPress={() => openScheduleModal(item)}>
          <Text style={styles.scheduleButton}>⚙️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => deleteHabit(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  

  const startTimer = (habit) => {
    setActiveHabit(habit);
    setShowTimer(true);
  };

  const saveTimerSession = async (seconds) => {
    if (activeHabit) {
      const updatedHabits = habits.map(h => {
        if (h.id === activeHabit.id) {
          const sessions = [...(h.sessions || []), seconds];
          return { ...h, sessions };
        }
        return h;
      });
      
      await saveHabitsToStorage(updatedHabits);
      setHabits(updatedHabits);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Трекер привычек</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.mainButton} 
          onPress={() => openScheduleModal()}
        >
          <Text style={styles.mainButtonText}>Добавить привычку</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mainButton} 
          onPress={checkScheduledNotifications}
        >
          <Text style={styles.mainButtonText}>Проверить уведомления</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mainButton} 
          onPress={requestNotificationPermissions}
        >
          <Text style={styles.mainButtonText}>Разрешить уведомления</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {selectedHabit ? `Выбрать расписание для ${selectedHabit.name}` : 'Добавить новую привычку'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Введите привычку"
            value={newHabit}
            onChangeText={setNewHabit}
            editable={!selectedHabit}
          />

          <Text style={styles.label}>Выберете день недели</Text>
          <View style={styles.daysContainer}>
            {['Понедельник', 'Вторник', 'Среда', 'Четверг',
             'Пятница', 'Суббота', 'Воскресение'].map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  daysOfWeek.includes(day) && styles.selectedDayButton
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text style={styles.dayText}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Начало занятия:</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите время начала"
            keyboardType="numeric"
            value={startTime}
            onChangeText={setStartTime}
          />
          

          <Button title="Сохранить расписание" onPress={saveSchedule} />
          <Button title="Отмена" color="red" onPress={() => {
            setModalVisible(false);
            setNewHabit('');
            setSelectedHabit(null);
            setDaysOfWeek([]);
            setStartTime('');
          }} />
        </View>
      </Modal>

      <StatusBar style="auto" />

      <Timer
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        habit={activeHabit}
        onSaveSession={saveTimerSession}
        sessions={activeHabit?.sessions || []}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'lightgray', // Changed to grey background
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  mainButton: {
    backgroundColor: '#FFA500', // Orange color
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: 'white',
    marginVertical: 5,
    borderRadius: 8,
  },
  habitButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitText: {
    fontSize: 18,
  },
  timerButton: {
    fontSize: 10,
    marginRight: 15,
    backgroundColor: 'orange',
    padding: 2,
    borderRadius: 3
  },
  scheduleButton: {
    fontSize: 18
  },
  deleteButton: {
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginTop: 15,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  dayButton: {
    padding: 10,
    borderRadius: 5,
    margin: 5,
    backgroundColor: '#ddd',
  },
  selectedDayButton: {
    backgroundColor: '#8bc34a',
  },
  dayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});