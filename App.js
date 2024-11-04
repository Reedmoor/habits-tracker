import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect  } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, TextInput, FlatList, View, TouchableOpacity, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider'; 


export default function App() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [durationHours, setDurationHours] = useState(0); // Часы
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [duration, setDuration] = useState(""); // Дата для выбора времени начала занятия
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);
  
  const scheduleNotification = async (date, time) => {
    const notificationDate = new Date(date);
    notificationDate.setHours(time.getHours());
    notificationDate.setMinutes(time.getMinutes());
  
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit Reminder",
        body: `Time to work on your habit: ${selectedHabit.name}`,
      },
      trigger: notificationDate,
    });
  };
  
  
  

  // Добавление новой привычки
  const addHabit = () => {
    if (newHabit.trim()) {
      setHabits([...habits, { id: Date.now().toString(), name: newHabit, completed: false, schedule: null }]);
      setNewHabit('');
    }
  };

  // Открыть настройки расписания для выбранной привычки
  const openScheduleModal = (habit) => {
    setSelectedHabit(habit);
    setModalVisible(true);
  };

  // Сохранение расписания
  const saveSchedule = () => {
    setHabits(habits.map(habit => 
      habit.id === selectedHabit.id ? { ...habit, schedule: { days: daysOfWeek, time: selectedTime, duration } } : habit
    ));
    console.log(habits);
    setModalVisible(false);
    setSelectedHabit(null);
    setDaysOfWeek([]);
    setSelectedTime(new Date());
    setDuration('');
  };

  // Переключение дня недели
  const toggleDay = (day) => {
    setDaysOfWeek((prevDays) => 
      prevDays.includes(day) ? prevDays.filter(d => d !== day) : [...prevDays, day]
    );
  };

  // Рендер привычки
  const renderHabit = ({ item }) => (
    <View style={styles.habitItem}>
      <Text style={styles.habitText}>{item.name}</Text>
      <TouchableOpacity onPress={() => openScheduleModal(item)}>
        <Text style={styles.scheduleButton}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  const onChangeTime = (event, selectedDate) => {
    const currentDate = selectedDate || duration;
    setShowPicker(false);
    setDuration(currentDate); // Устанавливаем новое время
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Трекер привычек</Text>

      <TextInput
        style={styles.input}
        placeholder="Введите привычку"
        value={newHabit}
        onChangeText={setNewHabit}
      />
      <Button title="Добавить привычку" onPress={addHabit} />

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Выбрать расписание для {selectedHabit?.name}</Text>

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

          <Text>Начало занятия:</Text>
          {showPicker && (
            <DateTimePicker
              value={duration}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
          
          
          <Text style={styles.label}>Продолжительность (минуты):</Text>
          <TextInput
            style={styles.input}
            // placeholder
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />

          <Button title="Сохранить расписание" onPress={saveSchedule} />
          <Button title="Отмена" color="red" onPress={() => setModalVisible(false)} />
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
  habitText: {
    fontSize: 18,
  },
  scheduleButton: {
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
