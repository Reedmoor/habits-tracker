import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Circle, Rect } from 'react-native-svg';

// Design system colors
const COLORS = {
  primary: '#FF9800', // Orange
  primaryDark: '#F57C00',
  secondary: '#757575', // Gray
  secondaryLight: '#BDBDBD',
  background: '#FFFFFF',
  text: '#424242',
  success: '#4CAF50',
  error: '#f44336',
  chart: '#FF9800',
  chartGrid: '#E0E0E0',
};

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
    const width = Dimensions.get('window').width * 0.85;
    const height = 250;
    const padding = 40;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    const normalizedSessions = sessions.length === 1 
      ? [...sessions, sessions[0]]
      : sessions;

    const maxDuration = Math.max(...normalizedSessions.map(s => s / 60));
    
    const points = normalizedSessions.map((session, index) => {
      const x = padding + (index * (graphWidth / Math.max(normalizedSessions.length - 1, 1)));
      const y = height - (padding + ((session / 60) / maxDuration) * graphHeight);
      return { x, y, duration: session };
    });

    const pathData = sessions.length > 1 
      ? points.map((point, index) => 
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        ).join(' ')
      : '';

    return (
      <View style={styles.graphContainer}>
        <Svg height={height} width={width}>
          {/* Background Grid */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Line
              key={`grid-h-${i}`}
              x1={padding}
              y1={padding + (i * (graphHeight / 4))}
              x2={width - padding}
              y2={padding + (i * (graphHeight / 4))}
              stroke={COLORS.chartGrid}
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          ))}

          {/* Axes */}
          <Line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke={COLORS.text}
            strokeWidth="2"
          />
          
          <Line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke={COLORS.text}
            strokeWidth="2"
          />

          {/* Chart Area Background */}
          <Rect
            x={padding}
            y={padding}
            width={graphWidth}
            height={graphHeight}
            fill="white"
            opacity={0.5}
          />

          {/* Line Graph */}
          {sessions.length > 1 && (
            <>
              <Path
                d={pathData}
                stroke={COLORS.chart}
                strokeWidth="3"
                fill="none"
              />
              <Path
                d={`${pathData} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
                fill={COLORS.chart}
                opacity={0.1}
              />
            </>
          )}

          {/* Data Points */}
          {sessions.map((session, index) => (
            <React.Fragment key={index}>
              <Circle
                cx={points[index].x}
                cy={points[index].y}
                r="6"
                fill={COLORS.chart}
              />
              <Circle
                cx={points[index].x}
                cy={points[index].y}
                r="4"
                fill="white"
              />
              <SvgText
                x={points[index].x}
                y={height - padding + 20}
                textAnchor="middle"
                fill={COLORS.text}
                fontSize="12"
              >
                {index + 1}
              </SvgText>
              <SvgText
                x={points[index].x}
                y={points[index].y - 15}
                textAnchor="middle"
                fill={COLORS.text}
                fontSize="12"
                fontWeight="bold"
              >
                {Math.floor(session / 60)}м
              </SvgText>
            </React.Fragment>
          ))}

          {/* Axis Labels */}
          <SvgText
            x={padding / 2}
            y={height / 2}
            textAnchor="middle"
            fill={COLORS.text}
            fontSize="14"
            fontWeight="bold"
            rotation="-90"
          >
            Минуты
          </SvgText>
          
          <SvgText
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fill={COLORS.text}
            fontSize="14"
            fontWeight="bold"
          >
            Сессии
          </SvgText>
        </Svg>
        
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
                  style={[styles.button, styles.graphButton]} 
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
            </>
          )}

          {!showGraph && (
            <TouchableOpacity 
              style={[styles.button, styles.closeButton]} 
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
    backgroundColor: COLORS.background,
    padding: 25,
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  habitName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    fontFamily: 'System',
  },
  motivationalText: {
    fontSize: 16,
    color: COLORS.success,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  graphButton: {
    backgroundColor: COLORS.secondary,
  },
  backButton: {
    backgroundColor: COLORS.primary,
  },
  closeButton: {
    backgroundColor: COLORS.secondary,
    marginTop: 10,
  },
  graphContainer: {
    marginVertical: 20,
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2.84,
  },
  singleSessionMessage: {
    marginTop: 15,
    textAlign: 'center',
    color: COLORS.secondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default Timer;