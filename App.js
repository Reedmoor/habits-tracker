import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect  } from 'react';
import { Button, SafeAreaView, StyleSheet, Text,
   TextInput, FlatList, View, TouchableOpacity, Modal, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';


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
  const [duration, setDuration] = useState('');
  const [showPicker, setShowPicker] = useState(false);
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
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Предупреждение',
          'Для работы уведомлений необходимо предоставить разрешение'
        );
      }
    };

    requestPermissions();
    loadHabits();
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

  // Функция для планирования уведомлений
  const scheduleNotifications = async (habit) => {
    try {
      // Отменяем существующие уведомления для этой привычки
      const existingTriggers = await Notifications.getAllScheduledNotificationsAsync();
      const habitTriggers = existingTriggers.filter(
        trigger => trigger.content.data?.habitId === habit.id
      );
      
      for (const trigger of habitTriggers) {
        await Notifications.cancelScheduledNotificationAsync(trigger.identifier);
      }

      // Планируем новые уведомления для каждого выбранного дня
      for (const day of habit.schedule.days) {
        const [hours, minutes] = habit.schedule.startTime.split(':').map(Number);
        const nextDate = getNextDayOccurrence(day);
        nextDate.setHours(hours, minutes, 0, 0);

        // Если время уже прошло сегодня, добавляем 7 дней
        if (nextDate < new Date()) {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Время для привычки: ${habit.name}`,
            body: `Длительность: ${habit.schedule.duration} минут`,
            data: { habitId: habit.id },
          },
          trigger: {
            date: nextDate,
            repeats: true,
            seconds: 60 * 60 * 24 * 7, // Повторять каждые 7 дней
          },
        });
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      Alert.alert('Ошибка', 'Не удалось установить уведомления');
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
        <TouchableOpacity onPress={() => openScheduleModal(item)}>
          <Text style={styles.scheduleButton}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
        onPress={() => startTimer(item)}
        style={styles.timerButton}
      >
        <Text style={styles.timerButtonText}>▶</Text>
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
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);

  const startTimer = async (habit) => {
    setIsTimerRunning(true);
    setTimerDuration(0);
    
    const intervalId = setInterval(() => {
      setTimerDuration(prevDuration => prevDuration + 1);
    }, 1000);
  
    const result = await new Promise((resolve) => {
      Alert.alert(
        'Таймер',
        `Таймер для привычки "${habit.name}" начат`,
        [
          {
            text: 'Остановить',
            onPress: () => {
              clearInterval(intervalId);
              setIsTimerRunning(false);
              
              // Сохранить длительность в объекте привычки
              const updatedHabits = habits.map(h =>
                h.id === habit.id
                  ? { ...h, schedule: { ...h.schedule, duration: timerDuration } }
                  : h
              );
              setHabits(updatedHabits);
              saveHabitsToStorage(updatedHabits);
              resolve();
            }
          }
        ]
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Трекер привычек</Text>

      <Button title="Добавить привычку" onPress={() => openScheduleModal()} />
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
          
          <Text style={styles.label}>Продолжительность (минуты):</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите продолжительность"
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />

          <Button title="Сохранить расписание" onPress={saveSchedule} />
          <Button title="Отмена" color="red" onPress={() => {
            setModalVisible(false);
            setNewHabit('');
            setSelectedHabit(null);
            setDaysOfWeek([]);
            setStartTime('');
            setDuration('');
          }} />
        </View>
      </Modal>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  habitButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitText: {
    fontSize: 18,
  },
  scheduleButton: {
    fontSize: 18,
    marginRight: 10,
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