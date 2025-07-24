import { OPENWEATHER_API_KEY } from '@env';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, FlatList, Keyboard, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const API_KEY = OPENWEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

interface WeatherData {
  name: string;
  main: { temp: number; humidity: number; feels_like: number; pressure: number };
  weather: { main: string; description: string; icon: string }[];
  wind: { speed: number };
  visibility: number;
  sys: { sunrise: number; sunset: number };
}

interface ForecastItem {
  dt_txt: string;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: { icon: string; main: string; description: string }[];
}

const getWeatherIcon = (iconCode: string) => {
  const icons: { [key: string]: string } = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️', '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️',
  };
  return icons[iconCode] || '🌤️';
};

const getAdvancedGradient = (weatherMain: string, isNight: boolean = false) => {
  const gradients: { [key: string]: { day: string[], night: string[] } } = {
    'Clear': {
      day: ['#FF9A8B', '#A8E6CF', '#FFD3A5', '#FD9853'],
      night: ['#2C3E50', '#4A6741', '#34495E', '#2980B9']
    },
    'Clouds': {
      day: ['#BDC3C7', '#2C3E50', '#95A5A6', '#34495E'],
      night: ['#34495E', '#2C3E50', '#7F8C8D', '#2980B9']
    },
    'Rain': {
      day: ['#3A7BD5', '#00D2FF', '#667db6', '#0082c8'],
      night: ['#2980B9', '#6BB6FF', '#1B4F72', '#2E86AB']
    },
    'Drizzle': {
      day: ['#A8E6CF', '#DCEDC1', '#B2DFDB', '#80CBC4'],
      night: ['#34495E', '#2C3E50', '#5DADE2', '#3498DB']
    },
    'Thunderstorm': {
      day: ['#654EA3', '#EAAFC8', '#8E44AD', '#C39BD3'],
      night: ['#2C3E50', '#8E44AD', '#34495E', '#7D3C98']
    },
    'Snow': {
      day: ['#E6E6FA', '#FAFAFA', '#D6EAF8', '#EBF5FB'],
      night: ['#5DADE2', '#85C1E9', '#AED6F1', '#D6EAF8']
    },
    'Mist': {
      day: ['#D5D4D0', '#D5D4D0', '#EEEEEE', '#EFEEEE'],
      night: ['#7F8C8D', '#BDC3C7', '#95A5A6', '#AEB6BF']
    },
  };
  
  const colors = gradients[weatherMain] || gradients['Clear'];
  return isNight ? colors.night : colors.day;
};

export default function WeatherApp() {
  const [inputCity, setInputCity] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.8);

  const fetchData = async (params: { q?: string; lat?: number; lon?: number }) => {
    if (!API_KEY) {
      setError("API Key is missing. Please check your .env file and restart the app.");
      setLoading(false);
      return;
    }
    if (!refreshing) setLoading(true);
    setError(null);
    try {
      const weatherResponse = await axios.get(WEATHER_API_URL, { params: { ...params, appid: API_KEY, units: 'metric' } });
      const forecastResponse = await axios.get(FORECAST_API_URL, { params: { ...params, appid: API_KEY, units: 'metric' } });
      
      setWeatherData(weatherResponse.data);
      const dailyForecasts = forecastResponse.data.list.filter((item: ForecastItem) => item.dt_txt.includes("12:00:00"));
      setForecastData(dailyForecasts);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (e) {
      setError(`Could not find weather data. Please try another city.`);
      setWeatherData(null);
      setForecastData(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadInitialWeather = useCallback(async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission denied. Showing weather for Colombo.');
      fetchData({ q: 'Colombo' });
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    fetchData({ lat: location.coords.latitude, lon: location.coords.longitude });
  }, []);

  useEffect(() => {
    loadInitialWeather();
  }, [loadInitialWeather]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);
    loadInitialWeather();
  }, [loadInitialWeather]);

  const handleSearch = () => {
    if (inputCity.trim()) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.8);
      fetchData({ q: inputCity.trim() });
      setInputCity('');
      Keyboard.dismiss();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isNightTime = () => {
    if (!weatherData) return false;
    const now = Date.now() / 1000;
    return now < weatherData.sys.sunrise || now > weatherData.sys.sunset;
  };

  const renderWeatherCards = () => {
    if (!weatherData) return null;

    const cards = [
      {
        title: 'Feels Like',
        value: `${weatherData.main.feels_like.toFixed(1)}°C`,
        icon: '🌡️',
        color: '#FF6B6B'
      },
      {
        title: 'Humidity',
        value: `${weatherData.main.humidity}%`,
        icon: '💧',
        color: '#4ECDC4'
      },
      {
        title: 'Wind Speed',
        value: `${weatherData.wind.speed} m/s`,
        icon: '💨',
        color: '#45B7D1'
      },
      {
        title: 'Pressure',
        value: `${weatherData.main.pressure} hPa`,
        icon: '📊',
        color: '#96CEB4'
      },
      {
        title: 'Visibility',
        value: `${(weatherData.visibility / 1000).toFixed(1)} km`,
        icon: '👁️',
        color: '#FFEAA7'
      },
      {
        title: 'Sunrise',
        value: formatTime(weatherData.sys.sunrise),
        icon: '🌅',
        color: '#FD79A8'
      }
    ];

    return (
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => (
          <Animated.View
            key={card.title}
            style={[
              styles.weatherCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView intensity={20} style={styles.cardBlur}>
              <View style={[styles.cardContent, { borderLeftColor: card.color }]}>
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardValue}>{card.value}</Text>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Getting weather data...</Text>
        </View>
      );
    }
    
    if (error && !weatherData) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😔</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    
    if (weatherData) {
      return (
        <ScrollView 
          contentContainerStyle={styles.weatherContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#fff"
              colors={['#fff']}
            />
          }
        >
          {error && (
            <BlurView intensity={20} style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </BlurView>
          )}
          

          <Animated.View 
            style={[
              styles.mainWeatherContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ],
              },
            ]}
          >
            <Text style={styles.cityName}>{weatherData.name}</Text>
            <Text style={styles.weatherIcon}>
              {getWeatherIcon(weatherData.weather[0].icon)}
            </Text>
            <Text style={styles.temperature}>
              {weatherData.main.temp.toFixed(1)}°
            </Text>
            <Text style={styles.description}>
              {weatherData.weather[0].description}
            </Text>
          </Animated.View>

          
          {renderWeatherCards()}
          
          <Animated.View 
            style={[
              styles.forecastSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <BlurView intensity={20} style={styles.forecastBlur}>
              <Text style={styles.forecastTitle}>5-Day Forecast</Text>
              <FlatList
                data={forecastData}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.dt_txt}
                contentContainerStyle={styles.forecastList}
                renderItem={({ item, index }) => (
                  <Animated.View 
                    style={[
                      styles.forecastItem,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: slideAnim.interpolate({
                              inputRange: [0, 50],
                              outputRange: [0, 20 + index * 10],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.forecastDay}>
                      {new Date(item.dt_txt).toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={styles.forecastIcon}>
                      {getWeatherIcon(item.weather[0].icon)}
                    </Text>
                    <Text style={styles.forecastTemp}>
                      {item.main.temp.toFixed(0)}°
                    </Text>
                    <Text style={styles.forecastDesc}>
                      {item.weather[0].main}
                    </Text>
                  </Animated.View>
                )}
              />
            </BlurView>
          </Animated.View>
        </ScrollView>
      );
    }
    return null;
  };

  const gradientColors = getAdvancedGradient(
    weatherData?.weather[0].main || 'Clear',
    isNightTime()
  ) as [string, string, ...string[]];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <BlurView intensity={30} style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.input}
              placeholder="Search for a city..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={inputCity}
              onChangeText={setInputCity}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        {renderContent()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  searchContainer: {
    margin: 16,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
  },
  errorBanner: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
  weatherContainer: {
    paddingBottom: 30,
  },
  mainWeatherContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  cityName: {
    fontSize: screenWidth * 0.08,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  weatherIcon: {
    fontSize: screenWidth * 0.25,
    marginVertical: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  temperature: {
    fontSize: screenWidth * 0.18,
    fontWeight: '100',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 18,
    textTransform: 'capitalize',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: 8,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  weatherCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardBlur: {
    flex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderLeftWidth: 4,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forecastSection: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  forecastBlur: {
    padding: 20,
  },
  forecastTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#fff',
  },
  forecastList: {
    paddingHorizontal: 10,
  },
  forecastItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  forecastIcon: {
    fontSize: 32,
    marginVertical: 8,
  },
  forecastTemp: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  forecastDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});