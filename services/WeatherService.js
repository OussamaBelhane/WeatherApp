/**
 * WeatherService.js
 * Robust Service for Open-Meteo API
 * 
 * 1. searchCity(name) -> { name, lat, lon, country, ... }
 * 2. getWeather(lat, lon) -> { current, hourly, daily }
 * 3. Data Transformation & Video Mapping
 */

const BASE_URL = 'https://api.open-meteo.com/v1';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1';

/**
 * Maps WMO code + is_day to a video/icon file name.
 * @param {number} code - WMO Weather Code (0-99)
 * @param {number} isDay - 1 for day, 0 for night
 * @returns {string} Filename key (e.g., 'rain_day')
 */
export const getWeatherVideo = (code, isDay) => {
    const suffix = isDay ? 'day' : 'night';

    // Clear Sky (0)
    if (code === 0) return `clear_${suffix}`;

    // Mainly Clear, Partly Cloudy, Overcast (1, 2, 3)
    if (code <= 3) return `cloudy_${suffix}`;

    // Fog (45, 48)
    if (code === 45 || code === 48) return `fog_${suffix}`;

    // Drizzle (51, 53, 55, 56, 57)
    if (code >= 51 && code <= 57) return `rain_${suffix}`;

    // Rain (61, 63, 65, 66, 67)
    if (code >= 61 && code <= 67) return `rain_${suffix}`;

    // Snow (71, 73, 75, 77)
    if (code >= 71 && code <= 77) return `snow_${suffix}`;

    // Rain Showers (80, 81, 82)
    if (code >= 80 && code <= 82) return `rain_${suffix}`;

    // Snow Showers (85, 86)
    if (code >= 85 && code <= 86) return `snow_${suffix}`;

    // Thunderstorm (95, 96, 99)
    if (code >= 95) return `storm_${suffix}`;

    // Default
    return `clear_${suffix}`;
};

/**
 * Maps WMO code to semantic condition name for UI logic
 * @param {number} code - WMO Weather Code (0-99)
 * @returns {string} Semantic condition ('sunny', 'cloudy', 'rainy', 'clear')
 */
const mapCondition = (code) => {
    // Clear Sky (0)
    if (code === 0) return 'clear';

    // Mainly Clear, Partly Cloudy, Overcast (1, 2, 3)
    if (code <= 3) return 'cloudy';

    // Fog (45, 48)
    if (code === 45 || code === 48) return 'cloudy';

    // Drizzle, Rain, Rain Showers (51-67, 80-82)
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';

    // Snow (71-77, 85-86)
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'rainy'; // Treating snow as rainy for now

    // Thunderstorm (95-99)
    if (code >= 95) return 'rainy';

    return 'sunny';
};

/**
 * Helper to get day name from date string
 */
const getDayName = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Search for a city by name using OpenStreetMap Nominatim.
 * @param {string} name - City name query
 * @returns {Promise<Array>} List of cities
 */
export const searchCity = async (name) => {
    if (!name || name.length < 2) return [];

    try {
        // Use Nominatim (OpenStreetMap) for better local name handling
        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(name)}&` +
            `format=json&` +
            `limit=5&` +
            `addressdetails=1&` +
            `accept-language=en`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WeatherApp/1.0' // Nominatim requires User-Agent
            }
        });

        const data = await response.json();

        if (!data || data.length === 0) return [];

        // Filter to only include cities/towns/villages
        const cities = data.filter(item => {
            const type = item.type || '';
            const placeType = item.class || '';
            return placeType === 'place' ||
                placeType === 'boundary' ||
                type.includes('city') ||
                type.includes('town') ||
                type.includes('village');
        });

        return cities.map((city, index) => {
            const address = city.address || {};
            const cityName = address.city || address.town || address.village || city.name;
            const country = address.country_code?.toUpperCase() || '';
            const state = address.state || '';

            return {
                id: city.place_id || index,
                name: cityName,
                country: country,
                lat: parseFloat(city.lat),
                lon: parseFloat(city.lon),
                displayName: state
                    ? `${cityName}, ${state}, ${address.country || country}`
                    : `${cityName}, ${address.country || country}`
            };
        });
    } catch (error) {
        console.error('Error searching city:', error);
        return [];
    }
};

/**
 * Fetch comprehensive weather data.
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<Object>} Formatted weather object
 */
export const getWeather = async (lat, lon) => {
    try {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m,apparent_temperature',
            hourly: 'temperature_2m,weather_code,is_day,uv_index',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max',
            timezone: 'auto'
        });

        const url = `${BASE_URL}/forecast?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Weather fetch failed');

        const data = await response.json();

        // --- 1. CURRENT ---
        const current = {
            temp: Math.round(data.current.temperature_2m),
            condition: mapCondition(data.current.weather_code),
            video: getWeatherVideo(data.current.weather_code, data.current.is_day),
            wind: Math.round(data.current.wind_speed_10m),
            humidity: data.current.relative_humidity_2m,
            feelsLike: Math.round(data.current.apparent_temperature),
            isDay: data.current.is_day,
            description: getDescription(data.current.weather_code)
        };

        // --- 2. HOURLY TRANSFORMATION ---
        // Parallel arrays: time[], temperature_2m[], weather_code[], is_day[]
        const hourlyRaw = data.hourly;
        const now = new Date();
        const currentHourIndex = hourlyRaw.time.findIndex(t => {
            const d = new Date(t);
            return d.getHours() === now.getHours() && d.getDate() === now.getDate();
        });

        // Take next 24 hours starting from now
        const startIndex = currentHourIndex !== -1 ? currentHourIndex : 0;

        const hourly = hourlyRaw.time.slice(startIndex, startIndex + 24).map((time, i) => {
            const index = startIndex + i;
            return {
                id: i,
                time: hourlyRaw.time[index].split('T')[1].slice(0, 5), // '14:00'
                temp: Math.round(hourlyRaw.temperature_2m[index]),
                condition: mapCondition(hourlyRaw.weather_code[index]),
                video: getWeatherVideo(hourlyRaw.weather_code[index], hourlyRaw.is_day[index]),
                isDay: hourlyRaw.is_day[index],
                isNight: hourlyRaw.is_day[index] === 0,
                isCurrent: i === 0,
            };
        });

        // --- 3. DAILY TRANSFORMATION ---
        const dailyRaw = data.daily;
        const daily = dailyRaw.time.map((time, i) => ({
            id: i,
            day: i === 0 ? 'Today' : getDayName(time),
            high: Math.round(dailyRaw.temperature_2m_max[i]),
            low: Math.round(dailyRaw.temperature_2m_min[i]),
            uv: dailyRaw.uv_index_max[i],
            precipitation: dailyRaw.precipitation_probability_max[i] || 0,
            condition: mapCondition(dailyRaw.weather_code[i]),
            video: getWeatherVideo(dailyRaw.weather_code[i], 1),
            sunrise: dailyRaw.sunrise[i].split('T')[1],
            sunset: dailyRaw.sunset[i].split('T')[1],
            globalLow: Math.round(Math.min(...dailyRaw.temperature_2m_min)),
            globalHigh: Math.round(Math.max(...dailyRaw.temperature_2m_max)),
        }));

        // Attach UV to current if not present (using today's max or hourly)
        current.uv = dailyRaw.uv_index_max[0];

        return {
            current,
            hourly,
            daily,
            timezone: data.timezone,
            utcOffsetSeconds: data.utc_offset_seconds
        };

    } catch (error) {
        console.error('Error fetching weather:', error);
        return null; // Handle gracefully
    }
};

// Internal Helper for descriptions (kept from previous implementation for UI richness)
const getDescription = (code) => {
    const descriptions = {
        0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Depositing Rime Fog',
        51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
        56: 'Light Freezing Drizzle', 57: 'Dense Freezing Drizzle',
        61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
        66: 'Light Freezing Rain', 67: 'Heavy Freezing Rain',
        71: 'Slight Snow Fall', 73: 'Moderate Snow Fall', 75: 'Heavy Snow Fall',
        77: 'Snow Grains',
        80: 'Slight Rain Showers', 81: 'Moderate Rain Showers', 82: 'Violent Rain Showers',
        85: 'Slight Snow Showers', 86: 'Heavy Snow Showers',
        95: 'Thunderstorm', 96: 'Thunderstorm & Hail', 99: 'Visual Thunderstorm',
    };
    return descriptions[code] || 'Unknown';
};

export default {
    searchCity,
    getWeather,
    getWeatherVideo,
    reverseGeocode: async () => null // Placeholder as we use Expo native
};
