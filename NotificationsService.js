import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';


// Настройка обработчика уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Функция для получения следующей даты для конкретного дня недели
const getNextDayOccurrence = (dayName) => {
  const days = {
    'Понедельник': 1,
    'Вторник': 2,
    'Среда': 3,
    'Четверг': 4,
    'Пятница': 5,
    'Суббота': 6,
    'Воскресение': 0
  };

  const targetDay = days[dayName];
  if (targetDay === undefined) {
    console.error('Invalid day name:', dayName);
    return null;
  }

  const today = new Date();
  const currentDay = today.getDay();
  
  // Вычисляем, сколько дней нужно добавить
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  // Создаем новую дату
  const nextDate = new Date();
  nextDate.setDate(today.getDate() + daysToAdd);
  // Сбрасываем время на начало дня
  nextDate.setHours(0, 0, 0, 0);
  
  return nextDate;
};

export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Предупреждение',
      'Для работы уведомлений необходимо предоставить разрешение'
    );
    return false;
  }
  return true;
};

export const scheduleNotifications = async (habit) => {
  try {
    if (!habit.schedule || !habit.schedule.days || !habit.schedule.startTime) {
      console.error('Invalid habit schedule:', habit);
      return false;
    }

    // Отменяем существующие уведомления для этой привычки
    const existingTriggers = await Notifications.getAllScheduledNotificationsAsync();
    const habitTriggers = existingTriggers.filter(
      trigger => trigger.content.data?.habitId === habit.id
    );
    
    for (const trigger of habitTriggers) {
      await Notifications.cancelScheduledNotificationAsync(trigger.identifier);
    }

    // Планируем новые уведомления для каждого выбранного дня
    const scheduledNotifications = [];
    
    for (const day of habit.schedule.days) {
      const baseDate = getNextDayOccurrence(day);
      if (!baseDate) {
        console.error('Failed to get next date for day:', day);
        continue;
      }

      const [hours, minutes] = habit.schedule.startTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('Invalid time format:', habit.schedule.startTime);
        continue;
      }

      const notificationDate = new Date(baseDate);
      notificationDate.setHours(hours, minutes, 0, 0);

      // Если время уже прошло сегодня, добавляем 7 дней
      if (notificationDate < new Date()) {
        notificationDate.setDate(notificationDate.getDate() + 7);
      }

      try {
        const notification = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Время для привычки: ${habit.name}`,
            body: `Пора приступить к выполнению привычки!`,
            data: { habitId: habit.id },
          },
          trigger: {
            date: notificationDate,
            repeats: true,
            seconds: 60 * 60 * 24 * 7, // Повторять каждые 7 дней
          },
        });
        scheduledNotifications.push({
          id: notification,
          date: notificationDate,
          day: day
        });
      } catch (error) {
        console.error('Error scheduling notification for day:', day, error);
      }
    }

    console.log('Scheduled notifications:', scheduledNotifications);
    return scheduledNotifications.length > 0;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    Alert.alert('Ошибка', 'Не удалось установить уведомления');
    return false;
  }
};

export const checkScheduledNotifications = async () => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    if (scheduledNotifications.length === 0) {
      Alert.alert(
        'Уведомления',
        'Нет запланированных уведомлений'
      );
      return;
    }

    const notificationsList = scheduledNotifications.map(notification => {
      const date = notification.trigger.date;
      const formattedDate = date ? new Date(date).toLocaleString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Дата не указана';

      return `${notification.content.title}\nДата: ${formattedDate}`;
    });

    Alert.alert(
      'Запланированные уведомления',
      `Количество: ${scheduledNotifications.length}\n\n${notificationsList.join('\n\n')}`
    );
  } catch (error) {
    console.error('Error checking notifications:', error);
    Alert.alert('Ошибка', 'Не удалось получить список уведомлений');
  }
};

// Вспомогательная функция для отмены всех уведомлений
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    Alert.alert('Успешно', 'Все уведомления были отменены');
  } catch (error) {
    console.error('Error canceling notifications:', error);
    Alert.alert('Ошибка', 'Не удалось отменить уведомления');
  }
};