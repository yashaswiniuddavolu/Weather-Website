// API Configuration
const apiKey = "9d5c7eeab93c8bd336805a0fe8b6aa65";
const weatherApiUrl = "https://api.openweathermap.org/data/2.5";
const geocodeApiUrl = "https://api.openweathermap.org/geo/1.0";

// DOM Elements
const cityInput = document.getElementById('cityInput');
const errorMsg = document.getElementById('errorMsg');
const currentWeather = document.getElementById('currentWeather');
const weatherHighlights = document.getElementById('weatherHighlights');
const forecastDays = document.getElementById('forecastDays');

// State
let isLoading = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  updateCurrentDate();
  loadLastCity();
  updateMajorCities();
  
  // Add event listeners
  cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      getWeather();
    }
  });
  
  // Add click handlers for major cities
  ['city1', 'city2', 'city3'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      const city = document.getElementById(id).textContent.split(',')[0].trim();
      cityInput.value = city;
      getWeather();
    });
  });
});

// Update current date
function updateCurrentDate() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
  
  // Update time every minute
  setTimeout(updateCurrentDate, 60000);
}

// Get weather icon based on condition
function getWeatherIcon(condition) {
  const iconMap = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '⛅', // few clouds day
    '02n': '⛅', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️', // scattered clouds
    '04d': '☁️', // broken clouds
    '04n': '☁️', // broken clouds
    '09d': '🌧️', // shower rain
    '09n': '🌧️', // shower rain
    '10d': '🌦️', // rain day
    '10n': '🌦️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️', // thunderstorm
    '13d': '❄️', // snow
    '13n': '❄️', // snow
    '50d': '🌫️', // mist
    '50n': '🌫️'  // mist
  };
  
  return iconMap[condition] || '🌤️';
}

// Convert timestamp to time with timezone offset
function timestampToTime(timestamp, timezone) {
  const date = new Date((timestamp + timezone) * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
}

// Convert m/s to km/h
function msToKmh(speed) {
  return (speed * 3.6).toFixed(1);
}

// Show loading state
function showLoading(element) {
  element.innerHTML = '<div class="loading">Loading...</div>';
}

// Show skeleton loading
function showSkeleton(element, lines = 3) {
  let html = '';
  for (let i = 0; i < lines; i++) {
    html += `<div class="skeleton" style="width: ${Math.random() * 50 + 50}%; height: 1em; margin-bottom: 8px;"></div>`;
  }
  element.innerHTML = html;
}

// Fetch with error handling
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Get coordinates for a city (more accurate than direct city name search)
async function getCoordinates(city) {
  const url = `${geocodeApiUrl}/direct?q=${city}&limit=1&appid=${apiKey}`;
  const data = await fetchData(url);
  
  if (!data || data.length === 0) {
    throw new Error('City not found');
  }
  
  return {
    lat: data[0].lat,
    lon: data[0].lon,
    name: data[0].name,
    country: data[0].country
  };
}

// Fetch current weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
  const url = `${weatherApiUrl}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  return fetchData(url);
}

// Fetch forecast by coordinates
async function fetchForecastByCoords(lat, lon) {
  const url = `${weatherApiUrl}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  return fetchData(url);
}

// Save last searched city to localStorage
function saveLastCity(city) {
  localStorage.setItem('lastCity', city);
}

// Load last searched city from localStorage
function loadLastCity() {
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) {
    cityInput.value = lastCity;
    // Don't auto-fetch to respect user bandwidth
  }
}

// Get weather for user's current location
function getLocation() {
  if (isLoading) return;
  
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser");
    return;
  }
  
  showLoading(currentWeather);
  showSkeleton(weatherHighlights.querySelector('.highlight-box'));
  showSkeleton(forecastDays);
  isLoading = true;
  errorMsg.textContent = '';
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const weatherData = await fetchWeatherByCoords(latitude, longitude);
        updateCurrentWeather(weatherData);
        
        const forecastData = await fetchForecastByCoords(latitude, longitude);
        updateForecast(forecastData);
        
        cityInput.value = `${weatherData.name}, ${weatherData.sys.country}`;
        saveLastCity(weatherData.name);
      } catch (error) {
        showError("Failed to get weather for your location");
      } finally {
        isLoading = false;
      }
    },
    (error) => {
      showError("Unable to retrieve your location");
      isLoading = false;
    }
  );
}

// Display error message
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
  setTimeout(() => {
    errorMsg.style.opacity = '1';
  }, 10);
  
  // Hide error after 5 seconds
  setTimeout(() => {
    errorMsg.style.opacity = '0';
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 300);
  }, 5000);
}

// Update current weather display
function updateCurrentWeather(data) {
  currentWeather.innerHTML = `
    <div class="weather-temp">${Math.round(data.main.temp)}°C</div>
    <div class="weather-condition">
      ${getWeatherIcon(data.weather[0].icon)} ${data.weather[0].description}
    </div>
    <div class="weather-location">${data.name}, ${data.sys.country}</div>
  `;

  weatherHighlights.querySelector('.highlight-box').innerHTML = `
    <div><strong>Feels like:</strong> ${Math.round(data.main.feels_like)}°C</div>
    <div><strong>Sunrise:</strong> ${timestampToTime(data.sys.sunrise, data.timezone)}</div>
    <div><strong>Sunset:</strong> ${timestampToTime(data.sys.sunset, data.timezone)}</div>
    <div><strong>Wind:</strong> ${msToKmh(data.wind.speed)} km/h ${getWindDirection(data.wind.deg)}</div>
    <div><strong>Humidity:</strong> ${data.main.humidity}%</div>
    <div><strong>Pressure:</strong> ${data.main.pressure} hPa</div>
  `;
}

// Get wind direction from degrees
function getWindDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((degrees % 360) / 45) % 8;
  return directions[index];
}

// Update forecast display
function updateForecast(data) {
  forecastDays.innerHTML = '';
  
  // Group forecasts by day
  const dailyForecasts = {};
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    if (!dailyForecasts[day]) {
      dailyForecasts[day] = {
        temps: [],
        icons: [],
        descriptions: []
      };
    }
    
    dailyForecasts[day].temps.push(item.main.temp);
    dailyForecasts[day].icons.push(item.weather[0].icon);
    dailyForecasts[day].descriptions.push(item.weather[0].main);
  });
  
  // Get next 5 days (excluding today)
  const days = Object.keys(dailyForecasts).slice(1, 6);
  
  days.forEach(day => {
    const dayData = dailyForecasts[day];
    const avgTemp = Math.round(dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length);
    
    // Get most frequent weather condition
    const weatherCounts = {};
    dayData.descriptions.forEach(desc => {
      weatherCounts[desc] = (weatherCounts[desc] || 0) + 1;
    });
    const mostFrequentWeather = Object.keys(weatherCounts).reduce((a, b) => 
      weatherCounts[a] > weatherCounts[b] ? a : b
    );
    
    // Get appropriate icon
    const primaryIcon = dayData.icons.find(icon => 
      icon.includes(mostFrequentWeather.toLowerCase().charAt(0))
    ) || dayData.icons[0];
    
    forecastDays.innerHTML += `
      <div class="day">
        ${day}<br/>
        ${getWeatherIcon(primaryIcon)}<br/>
        ${avgTemp}°C
      </div>
    `;
  });
  
  // Update weather distribution
  updateWeatherDistribution(data.list);
}

// Update weather distribution chart
function updateWeatherDistribution(forecastList) {
  const totalItems = forecastList.length;
  const weatherCounts = {};
  
  forecastList.forEach(item => {
    const weather = item.weather[0].main;
    weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
  });
  
  // Get top 2 weather conditions
  const sortedWeather = Object.entries(weatherCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  
  if (sortedWeather.length > 0) {
    document.getElementById('weatherSun').textContent = 
      `${Math.round((sortedWeather[0][1] / totalItems) * 100)}% ${sortedWeather[0][0]}`;
  }
  
  if (sortedWeather.length > 1) {
    document.getElementById('weatherRain').textContent = 
      `${Math.round((sortedWeather[1][1] / totalItems) * 100)}% ${sortedWeather[1][0]}`;
  }
}

// Update major cities weather
async function updateMajorCities() {
  const cities = [
    { id: 'city1', name: 'London', country: 'UK' },
    { id: 'city2', name: 'New York', country: 'US' },
    { id: 'city3', name: 'Tokyo', country: 'Japan' }
  ];

  await Promise.all(cities.map(async city => {
    try {
      const coords = await getCoordinates(`${city.name},${city.country}`);
      const data = await fetchWeatherByCoords(coords.lat, coords.lon);
      
      const element = document.getElementById(city.id);
      element.innerHTML = `
        <div>${data.name}, ${data.sys.country}<br/>
        ${getWeatherIcon(data.weather[0].icon)} ${Math.round(data.main.temp)}°C</div>
      `;
    } catch (error) {
      console.error(`Failed to fetch weather for ${city.name}:`, error);
    }
  }));
}

// Main weather function
async function getWeather() {
  if (isLoading) return;
  
  const city = cityInput.value.trim();
  errorMsg.textContent = "";
  
  if (!city) {
    showError("Please enter a city name");
    return;
  }
  
  isLoading = true;
  showLoading(currentWeather);
  showSkeleton(weatherHighlights.querySelector('.highlight-box'));
  showSkeleton(forecastDays);
  
  try {
    // First get coordinates for more accurate results
    const coords = await getCoordinates(city);
    
    // Then fetch weather data
    const [weatherData, forecastData] = await Promise.all([
      fetchWeatherByCoords(coords.lat, coords.lon),
      fetchForecastByCoords(coords.lat, coords.lon)
    ]);
    
    updateCurrentWeather(weatherData);
    updateForecast(forecastData);
    saveLastCity(coords.name);
    
  } catch (error) {
    console.error('Error:', error);
    showError("Failed to get weather data. Please check the city name and try again.");
    
    // Reset displays
    currentWeather.innerHTML = `
      <div class="weather-temp">--°C</div>
      <div class="weather-condition">--</div>
      <div class="weather-location">Search for a city</div>
    `;
    
    weatherHighlights.querySelector('.highlight-box').innerHTML = `
      <div><strong>Sunrise:</strong> --:-- AM</div>
      <div><strong>Sunset:</strong> --:-- PM</div>
      <div><strong>Wind:</strong> -- km/h</div>
      <div><strong>Humidity:</strong> --%</div>
      <div><strong>Pressure:</strong> -- hPa</div>
    `;
    
    forecastDays.innerHTML = `
      <div class="day">--<br/>--<br/>--°C</div>
      <div class="day">--<br/>--<br/>--°C</div>
      <div class="day">--<br/>--<br/>--°C</div>
      <div class="day">--<br/>--<br/>--°C</div>
      <div class="day">--<br/>--<br/>--°C</div>
    `;
    
  } finally {
    isLoading = false;
  }
}