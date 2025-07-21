import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, SafeAreaView, TouchableOpacity, Keyboard, ActivityIndicator, Alert, FlatList } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';


const API_KEY = '2e221da48bd09743f58871e71ff38f25'; 
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

export default function WeatherApp() {
  const [inputCity, setInputCity] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (params: { q?: string; lat?: number; lon?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const weatherResponse = await axios.get(WEATHER_API_URL, { params: { ...params, appid: API_KEY, units: 'metric' } });
      const forecastResponse = await axios.get(FORECAST_API_URL, { params: { ...params, appid: API_KEY, units: 'metric' } });
      
      setWeatherData(weatherResponse.data);
      const dailyForecasts = forecastResponse.data.list.filter((item: ForecastItem) => item.dt_txt.includes("12:00:00"));
      setForecastData(dailyForecasts);

    } catch (e) {
      setError(`Could not find weather data. Please check the city name or your network connection.`);
      setWeatherData(null);
      setForecastData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied. Showing weather for Colombo.');
        fetchData({ q: 'Colombo' }); 
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      fetchData({ lat: location.coords.latitude, lon: location.coords.longitude });
    })();
  }, []);

  const handleSearch = () => {
    if (inputCity.trim()) {
      fetchData({ q: inputCity.trim() });
      setInputCity('');
      Keyboard.dismiss();
    }
  };

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#007bff" style={styles.centered} />;
    if (error && !weatherData) return <Text style={[styles.centered, styles.errorText]}>{error}</Text>;
    if (weatherData) {
      return (
        <View style={styles.weatherContainer}>
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
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search for a city..."
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
    backgroundColor: '#eaf5ff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
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
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  weatherContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  cityName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  weatherIcon: {
    fontSize: 80,
    marginVertical: 10,
  },
  temperature: {
    fontSize: 56,
    fontWeight: '200',
    color: '#333',
  },
  description: {
    fontSize: 22,
    textTransform: 'capitalize',
    color: '#555',
  },
  detailsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailText: {
    fontSize: 16,
    color: '#555',
  },
  forecastContainer: {
    marginTop: 'auto',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  forecastTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  forecastItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 8,
    minWidth: 70,
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  forecastIcon: {
    fontSize: 30,
    marginVertical: 5,
  },
  forecastTemp: {
    fontSize: 16,
  },
});