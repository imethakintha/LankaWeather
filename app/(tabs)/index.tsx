import axios from 'axios';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { OPENWEATHER_API_KEY } from '@env';

const API_KEY = OPENWEATHER_API_KEY; 
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

interface WeatherData {
  name: string;
  main: { temp: number; humidity: number };
  weather: { main: string; description: string; icon: string }[];
  wind: { speed: number };
}

interface ForecastItem {
  dt_txt: string;
  main: { temp: number };
  weather: { icon: string; main: string }[];
}

const getWeatherIcon = (iconCode: string) => {
  const icons: { [key: string]: string } = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅️', '02n': '☁️', '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️',
  };
  return icons[iconCode] || '❓';
};

const getBackgroundColor = (weatherMain: string) => {
  const colors: { [key: string]: string[] } = {
    'Clear': ['#47a3ff', '#2d87e6'],
    'Clouds': ['#7c8ca3', '#5b6b82'],
    'Rain': ['#5d6d7e', '#4a5766'],
    'Drizzle': ['#a9b1b9', '#8d969e'],
    'Thunderstorm': ['#3b3b3b', '#2a2a2a'],
    'Snow': ['#d3d3d3', '#b0b0b0'],
    'Mist': ['#a9b1b9', '#8d969e'],
  };

  return colors[weatherMain] || ['#47a3ff', '#2d87e6']; 
};

export default function WeatherApp() {
  const [inputCity, setInputCity] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (params: { q?: string; lat?: number; lon?: number }) => {
    if (!refreshing) setLoading(true);
    setError(null);
    try {
      const weatherResponse = await axios.get(WEATHER_API_URL, { params: { ...params, appid: API_KEY, units: 'metric' } });
      const forecastResponse = await axios.get(FORECAST_API_URL, { params: { ...params, appid: API_KEY, units: 'metric' } });
      
      setWeatherData(weatherResponse.data);
      setCurrentCity(weatherResponse.data.name);
      const dailyForecasts = forecastResponse.data.list.filter((item: ForecastItem) => item.dt_txt.includes("12:00:00"));
      setForecastData(dailyForecasts);

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
    loadInitialWeather();
  }, [loadInitialWeather]);

  const handleSearch = () => {
    if (inputCity.trim()) {
      fetchData({ q: inputCity.trim() });
      setInputCity('');
      Keyboard.dismiss();
    }
  };

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#fff" style={styles.centered} />;
    if (error && !weatherData) return <Text style={[styles.centered, styles.errorText]}>{error}</Text>;
    if (weatherData) {
      return (
        <ScrollView 
          contentContainerStyle={styles.weatherContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Text style={styles.cityName}>{weatherData.name}</Text>
          <Text style={styles.weatherIcon}>{getWeatherIcon(weatherData.weather[0].icon)}</Text>
          <Text style={styles.temperature}>{weatherData.main.temp.toFixed(1)}°C</Text>
          <Text style={styles.description}>{weatherData.weather[0].main}</Text>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>Wind: {weatherData.wind.speed} m/s</Text>
            <Text style={styles.detailText}>Humidity: {weatherData.main.humidity}%</Text>
          </View>
          
          <View style={styles.forecastContainer}>
            <Text style={styles.forecastTitle}>5-Day Forecast</Text>
            <FlatList
              data={forecastData}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.dt_txt}
              renderItem={({ item }) => (
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastDay}>{new Date(item.dt_txt).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                  <Text style={styles.forecastIcon}>{getWeatherIcon(item.weather[0].icon)}</Text>
                  <Text style={styles.forecastTemp}>{item.main.temp.toFixed(0)}°C</Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
      );
    }
    return null;
  };

  const [bgColorStart, bgColorEnd] = getBackgroundColor(weatherData?.weather[0].main || 'Clear');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColorStart }]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search for a city..."
          placeholderTextColor="#999"
          value={inputCity}
          onChangeText={setInputCity}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  button: {
    marginLeft: 10,
    height: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    backgroundColor: 'rgba(255,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  weatherContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  cityName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  weatherIcon: {
    fontSize: 80,
    marginVertical: 10,
  },
  temperature: {
    fontSize: 56,
    fontWeight: '200',
    color: '#fff',
  },
  description: {
    fontSize: 22,
    textTransform: 'capitalize',
    color: '#fff',
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailText: {
    fontSize: 16,
    color: '#fff',
  },
  forecastContainer: {
    marginTop: 30,
    width: '100%',
    paddingVertical: 20,
  },
  forecastTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#fff',
  },
  forecastItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 8,
    minWidth: 70,
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  forecastIcon: {
    fontSize: 30,
    marginVertical: 5,
  },
  forecastTemp: {
    fontSize: 16,
    color: '#fff',
  },
});