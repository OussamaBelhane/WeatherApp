/**
 * VideoService.js
 * Maps weather conditions and time of day to Cloudinary video backgrounds
 * Time periods: day (7:00-17:00), sunset (17:00-20:00 & 5:00-7:00), night (20:00-5:00)
 */

const CLOUD_NAME = 'dft6axtes';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload`;

// Video mappings with multiple options for variety
const VIDEO_LIBRARY = {
    // ============================================================================
    // DAY VIDEOS (7:00 - 17:00)
    // ============================================================================
    day: {
        clear: [
            `${BASE_URL}/v1766841211/day_clear_1_kevkxe.mp4`,
            `${BASE_URL}/v1766841093/day_clear_ah26xj.mp4`,

        ],
        clouds: [
            `${BASE_URL}/v1766841227/day_clouds_1_vbal7k.mp4`,
            `${BASE_URL}/v1766841186/day_clouds_2_eenj6g.mp4`,
            `${BASE_URL}/v1766841025/day_clouds_4_qpmyln.mp4`,
            `${BASE_URL}/v1766845534/day_clouds_5_lio3zi.mp4`,
        ],
        snow: [
            `${BASE_URL}/v1766845563/day_snow_1_gbjt6u.mp4`,
        ],
        rain: [
            `${BASE_URL}/v1766841031/night_rain_voztvm.mp4`,
            `${BASE_URL}/v1766846138/day_rain_wvfqbe.mp4`,
            `${BASE_URL}/v1766846443/day_rain_1_z6ohwl.mp4`,
        ],
        storm: [
            // fallback to clouds for day storm
        ],
        default: [
            `${BASE_URL}/v1766841211/day_clear_1_kevkxe.mp4`,
        ],
    },

    // ============================================================================
    // SUNSET VIDEOS (17:00 - 20:00 evening, 5:00 - 7:00 morning)
    // ============================================================================
    sunset: {
        clear: [
            `${BASE_URL}/v1766841133/Sunset_binrd8.mp4`,
            `${BASE_URL}/v1766841121/sunrise_zebbbl.mp4`,
            `${BASE_URL}/v1766841001/sunrise_1_a3wqvh.mp4`,
            `${BASE_URL}/v1766841195/dawn_clear_jihzhd.mp4`,
        ],
        clouds: [
            `${BASE_URL}/v1766841151/dawn_clouds_rlvxjh.mp4`,
            `${BASE_URL}/v1766841133/Sunset_binrd8.mp4`,
        ],
        snow: [
            `${BASE_URL}/v1766840995/dawn_snow_i2lejr.mp4`,
        ],
        rain: [
            `${BASE_URL}/v1766841151/dawn_clouds_rlvxjh.mp4`,
        ],
        storm: [
            `${BASE_URL}/v1766841151/dawn_clouds_rlvxjh.mp4`,
        ],
        default: [
            `${BASE_URL}/v1766841133/Sunset_binrd8.mp4`,
            `${BASE_URL}/v1766841121/sunrise_zebbbl.mp4`,
        ],
    },

    // ============================================================================
    // NIGHT VIDEOS (20:00 - 5:00)
    // ============================================================================
    night: {
        clear: [
            `${BASE_URL}/v1766841177/night_clear_rsqeiq.mp4`,
            `${BASE_URL}/v1766841195/night_clear_1_scb0ga.mp4`,
            `${BASE_URL}/v1766841098/night_clear_3_lvsnm8.mp4`,
        ],
        clouds: [
            `${BASE_URL}/v1766841177/night_clear_rsqeiq.mp4`,
        ],
        snow: [
            `${BASE_URL}/v1766841110/night_snow_bkbqor.mp4`,
        ],
        rain: [
            `${BASE_URL}/v1766841031/night_rain_voztvm.mp4`,
            `${BASE_URL}/v1766841101/night_rain_1_wmxweq.mp4`,
            `${BASE_URL}/v1766846292/night_rain_2_uetlh9.mp4`,
        ],
        storm: [
            `${BASE_URL}/v1766840986/night_storm_uf54ca.mp4`,
        ],
        default: [
            `${BASE_URL}/v1766841177/night_clear_rsqeiq.mp4`,
            `${BASE_URL}/v1766841195/night_clear_1_scb0ga.mp4`,
        ],
    },
};

/**
 * Get the time period based on current hour
 * @param {number} hour - Hour of day (0-23)
 * @returns {'day' | 'sunset' | 'night'}
 */
export const getTimePeriod = (hour) => {
    if (hour >= 5 && hour < 7) return 'sunset';    // Dawn
    if (hour >= 7 && hour < 17) return 'day';       // Daytime
    if (hour >= 17 && hour < 20) return 'sunset';   // Evening sunset
    return 'night';                                  // Night (20:00 - 5:00)
};

/**
 * Map weather condition to video category
 * @param {string} condition - Weather condition string
 * @returns {string} Video category key
 */
const mapConditionToCategory = (condition) => {
    const c = (condition || '').toLowerCase();

    if (c.includes('clear') || c.includes('sunny')) return 'clear';
    if (c.includes('cloud') || c.includes('overcast') || c.includes('partly')) return 'clouds';
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rain';
    if (c.includes('snow') || c.includes('sleet') || c.includes('ice')) return 'snow';
    if (c.includes('thunder') || c.includes('storm') || c.includes('lightning')) return 'storm';
    if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'clouds';

    return 'default';
};

/**
 * Get a random item from an array
 */
const getRandomItem = (array) => {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
};

/**
 * Get video URL for current weather and time
 * @param {string} condition - Weather condition (e.g., 'Partly Cloudy', 'Rain', 'Clear')
 * @param {number} hour - Hour of day (0-23), defaults to current hour
 * @returns {string} Cloudinary video URL
 */

// Cache to store video URL per time period + category combination
// This prevents unnecessary player recreation when the same condition is requested multiple times
const videoUrlCache = {};

export const getVideoUrl = (condition, hour = null) => {
    // Use current hour if not provided
    const currentHour = hour !== null ? hour : new Date().getHours();

    // Determine time period
    const timePeriod = getTimePeriod(currentHour);

    // Map condition to category
    const category = mapConditionToCategory(condition);

    // Create cache key
    const cacheKey = `${timePeriod}_${category}`;

    // Return cached URL if available (prevents player recreation on re-renders)
    if (videoUrlCache[cacheKey]) {
        return videoUrlCache[cacheKey];
    }

    // Get videos for this time period and category
    const timeVideos = VIDEO_LIBRARY[timePeriod];
    let videos = timeVideos[category];

    // Fallback to default if no videos for this category
    if (!videos || videos.length === 0) {
        videos = timeVideos.default;
    }

    // Select random video and cache it
    const selectedVideo = getRandomItem(videos);
    videoUrlCache[cacheKey] = selectedVideo;

    console.log(`[VideoService] ${timePeriod} + ${category} → ${selectedVideo?.split('/').pop()} (cached)`);

    return selectedVideo;
};

// Clear cache when time period changes (call this on app initialization or periodically)
export const clearVideoCache = () => {
    Object.keys(videoUrlCache).forEach(key => delete videoUrlCache[key]);
    console.log('[VideoService] Cache cleared');
};

/**
 * Get video URL with explicit time period override
 * @param {string} condition - Weather condition
 * @param {'day' | 'sunset' | 'night'} timePeriod - Time period override
 * @returns {string} Cloudinary video URL
 */
export const getVideoUrlForPeriod = (condition, timePeriod) => {
    const category = mapConditionToCategory(condition);
    const timeVideos = VIDEO_LIBRARY[timePeriod] || VIDEO_LIBRARY.day;
    let videos = timeVideos[category];

    if (!videos || videos.length === 0) {
        videos = timeVideos.default;
    }

    return getRandomItem(videos);
};

/**
 * Preload video URLs for smooth transitions
 * Returns all video URLs that might be needed
 */
export const getAllVideoUrls = () => {
    const urls = [];
    Object.values(VIDEO_LIBRARY).forEach(timeVideos => {
        Object.values(timeVideos).forEach(categoryVideos => {
            urls.push(...categoryVideos);
        });
    });
    return [...new Set(urls)]; // Remove duplicates
};

export default {
    getVideoUrl,
    getVideoUrlForPeriod,
    getTimePeriod,
    getAllVideoUrls,
    clearVideoCache,
    VIDEO_LIBRARY,
};
