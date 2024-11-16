import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Circle } from 'react-native-svg';

const Timer = ({ visible, onClose, habit, onSaveSession, sessions }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getMotivationalMessage = () => {
    if (sessions.length === 0) return "Отличное начало! Продолжайте в том же духе!";
    
    const averageSeconds = sessions.reduce((acc, curr) => acc + curr, 0) / sessions.length;
    const currentMinutes = Math.floor(seconds / 60);
    const averageMinutes = Math.floor(averageSeconds / 60);
    
    if (seconds > averageSeconds) {
      const diffMinutes = currentMinutes - averageMinutes;
      return `Супер! Вы занимаетесь на ${diffMinutes} ${getDeclension(diffMinutes, 'минуту', 'минуты', 'минут')} дольше, чем обычно!`;
    } else if (seconds > 0) {
      const remainingSeconds = averageSeconds - seconds;
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return `Еще ${remainingMinutes} ${getDeclension(remainingMinutes, 'минута', 'минуты', 'минут')} до вашего обычного результата!`;
    }
    
    return "Готовы превзойти свой предыдущий результат?";
  };

  const getDeclension = (number, one, two, five) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return number === 1 ? one : (number % 100 > 4 && number % 100 < 20) ? five : [one, two, five][cases[Math.min(number % 10, 5)]];
  };

  const handleStartStop = () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
      onSaveSession(seconds);
      setSeconds(0);
      onClose();
    }
  };

  const SimpleGraph = () => {
    const width = Dimensions.get('window').width * 0.8;
    const height = 200;
    const padding = 40;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // Если сессия только одна, создаем фиктивную точку для масштабирования
    const normalizedSessions = sessions.length === 1 
      ? [...sessions, sessions[0]] // Дублируем единственную сессию
      : sessions;

    const maxDuration = Math.max(...normalizedSessions.map(s => s / 60));
    
    const points = normalizedSessions.map((session, index) => {
      const x = padding + (index * (graphWidth / Math.max(normalizedSessions.length - 1, 1)));
      const y = height - (padding + ((session / 60) / maxDuration) * graphHeight);
      return { x, y, duration: session };
    });

    // Создаем path только если у нас больше одной реальной точки
    const pathData = sessions.length > 1 
      ? points.map((point, index) => 
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        ).join(' ')
      : '';

    return (
      <View style={styles.graphContainer}>
        <Svg height={height} width={width}>
          {/* Оси */}
          <Line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="black"
            strokeWidth="1"
          />
          
          <Line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="black"
            strokeWidth="1"
          />

          {/* Линия графика (только если больше 1 точки) */}
          {sessions.length > 1 && (
            <Path
              d={pathData}
              stroke="#8884d8"
              strokeWidth="2"
              fill="none"
            />
          )}

          {/* Отображаем только реальные точки */}
          {sessions.map((session, index) => (
            <React.Fragment key={index}>
              <Circle
                cx={points[index].x}
                cy={points[index].y}
                r="4"
                fill="#8884d8"
              />
              <SvgText
                x={points[index].x}
                y={height - padding / 2}
                textAnchor="middle"
                fill="black"
                fontSize="12"
              >
                {index + 1}
              </SvgText>
              <SvgText
                x={points[index].x}
                y={points[index].y - 10}
                textAnchor="middle"
                fill="black"
                fontSize="10"
              >
                {Math.floor(session / 60)}м
              </SvgText>
            </React.Fragment>
          ))}

          {/* Подписи осей */}
          <SvgText
            x={padding / 2}
            y={height / 2}
            textAnchor="middle"
            fill="black"
            fontSize="12"
            rotation="-90"
          >
            Минуты
          </SvgText>
          
          <SvgText
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fill="black"
            fontSize="12"
          >
            Сессии
          </SvgText>
        </Svg>
        
        {/* Информационное сообщение при одной сессии */}
        {sessions.length === 1 && (
          <Text style={styles.singleSessionMessage}>
            Это ваша первая сессия. Продолжайте тренироваться, чтобы увидеть свой прогресс!
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.habitName}>{habit?.name}</Text>
          
          {!showGraph ? (
            <>
              <Text style={styles.timerText}>{formatTime(seconds)}</Text>
              
              {isRunning && (
                <Text style={styles.motivationalText}>
                  {getMotivationalMessage()}
                </Text>
              )}
              
              <TouchableOpacity 
                style={[styles.button, isRunning ? styles.stopButton : styles.startButton]} 
                onPress={handleStartStop}
              >
                <Text style={styles.buttonText}>
                  {isRunning ? 'Стоп' : 'Старт'}
                </Text>
              </TouchableOpacity>

              {sessions.length > 0 && (
                <TouchableOpacity 
                  style={styles.graphButton} 
                  onPress={() => setShowGraph(true)}
                >
                  <Text style={styles.buttonText}>Показать график</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <SimpleGraph />
              
              <TouchableOpacity 
                style={[styles.button, styles.backButton]} 
                onPress={() => setShowGraph(false)}
              >
                <Text style={styles.buttonText}>Вернуться к таймеру</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.exitButton]} 
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Выйти</Text>
              </TouchableOpacity>
            </>
          )}

          {!showGraph && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Закрыть</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  habitName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  motivationalText: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  backButton: {
    backgroundColor: '#2196F3',
  },
  exitButton: {
    backgroundColor: '#f44336',
  },
  graphButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#757575',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  graphContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  singleSessionMessage: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});

export default Timer;