import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';

// Функция запроса разрешений на уведомления
export const requestNotificationPermissions = async () => {
  try {
    // Убираем проверку на эмулятор
    // Проверяем существующие разрешения
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Если разрешения нет, запрашиваем его
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Проверяем финальный статус разрешений
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Разрешения',
        'Для работы уведомлений необходимо предоставить разрешение в настройках'
      );
      return false;
    }

    // Настраиваем канал уведомлений для Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    console.log('Разрешения на уведомления получены успешно');
    return true;
  } catch (error) {
    console.error('Ошибка при запросе разрешений:', error);
    Alert.alert('Ошибка', 'Не удалось получить разрешения на уведомления');
    return false;
  }
};

// Функция планирования уведомлений
export const scheduleNotifications = async (habit) => {
  try {
    console.log('Начало планирования уведомлений для привычки:', habit.name);

    // Проверяем наличие необходимых данных
    if (!habit.schedule || !habit.schedule.days || !habit.schedule.startTime) {
      console.error('Неверный формат расписания:', habit);
      return false;
    }

    // Запрашиваем разрешения
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Нет разрешения на отправку уведомлений');
      return false;
    }

    // Отменяем существующие уведомления для этой привычки
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of existingNotifications) {
      if (notification.content.data?.habitId === habit.id) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('Отменено уведомление:', notification.identifier);
      }
    }

    // Парсим время
    const [hours, minutes] = habit.schedule.startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Неверный формат времени:', habit.schedule.startTime);
      return false;
    }

    // Планируем уведомления для каждого дня
    const daysMap = {
      'Воскресение': 1,
      'Понедельник': 2,
      'Вторник': 3,
      'Среда': 4,
      'Четверг': 5,
      'Пятница': 6,
      'Суббота': 7
    };

    const scheduledIds = [];

    // Создаём тестовое уведомление для эмулятора с меньшей задержкой
    const testId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Тестовое уведомление',
        body: `Проверка для привычки "${habit.name}"`,
        data: { habitId: habit.id },
      },
      trigger: { seconds: 2 } // Уменьшаем задержку до 2 секунд
    });
    console.log('Создано тестовое уведомление:', testId);

    // Планируем регулярные уведомления с учетом особенностей эмулятора
    for (const day of habit.schedule.days) {
      try {
        // Получаем текущую дату и время
        const now = new Date();
        const targetTime = new Date(now);
        targetTime.setHours(hours, minutes, 0, 0);

        // Если время уже прошло сегодня, добавляем 1 день
        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }

        // Создаем уведомление с конкретной датой для эмулятора
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Время для привычки: ${habit.name}`,
            body: `Запланировано: ${day}, ${habit.schedule.startTime}`,
            data: {
              habitId: habit.id,
              day: day,
              time: habit.schedule.startTime
            },
            sound: true,
            priority: 'high',
          },
          trigger: {
            date: targetTime,
            repeats: false // На эмуляторе лучше работает без повторений
          },
        });

        scheduledIds.push(identifier);
        console.log(`Запланировано уведомление для ${day} на ${targetTime}`, identifier);

        // Дополнительно создаем уведомление через короткий промежуток времени для тестирования
        const quickTestId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Тест привычки: ${habit.name}`,
            body: `Быстрое тестовое уведомление`,
            data: { habitId: habit.id },
          },
          trigger: { seconds: 10 } // Уведомление через 10 секунд
        });
        console.log('Создано быстрое тестовое уведомление:', quickTestId);
      } catch (error) {
        console.error(`Ошибка при планировании уведомления для ${day}:`, error);
      }
    }

    return scheduledIds.length > 0;
  } catch (error) {
    console.error('Ошибка при планировании уведомлений:', error);
    Alert.alert('Ошибка', 'Не удалось запланировать уведомления');
    return false;
  }
};

// Функция проверки запланированных уведомлений
export const checkScheduledNotifications = async () => {
  try {
    console.log('Начало проверки запланированных уведомлений');
    
    // Получаем все запланированные уведомления
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Получены уведомления:', notifications);

    if (notifications.length === 0) {
      Alert.alert('Уведомления', 'Нет запланированных уведомлений');
      return;
    }

    // Форматируем информацию о каждом уведомлении
    const formattedNotifications = notifications.map(notification => {
      const trigger = notification.trigger;
      let scheduleInfo = '';

      if (trigger.date) {
        const date = new Date(trigger.date);
        scheduleInfo = date.toLocaleString('ru-RU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (trigger.seconds) {
        scheduleInfo = `Через ${trigger.seconds} секунд`;
      } else {
        scheduleInfo = 'Время не определено';
      }

      return `Название: ${notification.content.title}\n` +
             `Время: ${scheduleInfo}\n` +
             `ID: ${notification.identifier}${notification.content.data?.habitId ? 
               `\nПривычка ID: ${notification.content.data.habitId}` : ''}`;
    });

    // Показываем информацию пользователю
    Alert.alert(
      'Запланированные уведомления',
      `Количество: ${notifications.length}\n\n${formattedNotifications.join('\n\n')}`
    );

  } catch (error) {
    console.error('Ошибка при проверке уведомлений:', error);
    Alert.alert('Ошибка', 'Не удалось получить список уведомлений');
  }
};

// Настройка обработчиков уведомлений с расширенным логированием
export const setupNotificationListeners = () => {
  // Слушатель для уведомлений в активном приложении
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Получено уведомление в активном приложении:', notification);
    Alert.alert('Уведомление получено', 'Уведомление пришло в активном режиме');
  });

  // Слушатель для нажатий на уведомления
  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Пользователь нажал на уведомление:', response);
    Alert.alert('Уведомление обработано', 'Пользователь нажал на уведомление');
  });

  // Возвращаем функцию очистки
  return () => {
    foregroundSubscription.remove();
    backgroundSubscription.remove();
  };
};