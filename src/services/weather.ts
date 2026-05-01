export interface WeatherData {
    temp: number;
    description: string;
    icon: string;
    humidity?: number;
    condition?: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
    location?: string;
}

export async function getCurrentWeather(): Promise<WeatherData> {
    const DEFAULT_COORDS = { latitude: -33.8688, longitude: 151.2093, location: 'Sydney' };
    
    let latitude = DEFAULT_COORDS.latitude;
    let longitude = DEFAULT_COORDS.longitude;
    let locationName = DEFAULT_COORDS.location;

    // Try to get current position
    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationName = 'Current Location';
    } catch (e) {
        console.warn("Geolocation failed or timed out, using fallback:", e);
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relative_humidity_2m`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error("Weather API Error");

        const data = await response.json();
        const current = data.current_weather;
        const humidity = data.hourly?.relative_humidity_2m?.[0] || 50;

        const weatherCodes: Record<number, { desc: string; icon: string; condition: 'sunny' | 'rainy' | 'cloudy' | 'snowy' }> = {
            0: { desc: '맑음', icon: 'sunny', condition: 'sunny' },
            1: { desc: '대체로 맑음', icon: 'partly_cloudy_day', condition: 'sunny' },
            2: { desc: '구름 조금', icon: 'cloudy_with_sun', condition: 'cloudy' },
            3: { desc: '흐림', icon: 'cloud', condition: 'cloudy' },
            45: { desc: '안개', icon: 'foggy', condition: 'cloudy' },
            48: { desc: '서리 안개', icon: 'foggy', condition: 'cloudy' },
            51: { desc: '가벼운 이슬비', icon: 'rainy_light', condition: 'rainy' },
            53: { desc: '이슬비', icon: 'rainy_light', condition: 'rainy' },
            55: { desc: '강한 이슬비', icon: 'rainy_light', condition: 'rainy' },
            61: { desc: '가벼운 비', icon: 'rainy', condition: 'rainy' },
            63: { desc: '비', icon: 'rainy', condition: 'rainy' },
            65: { desc: '강한 비', icon: 'rainy', condition: 'rainy' },
            71: { desc: '가벼운 눈', icon: 'snowing', condition: 'snowy' },
            73: { desc: '눈', icon: 'snowing', condition: 'snowy' },
            75: { desc: '강한 눈', icon: 'snowing', condition: 'snowy' },
            77: { desc: '싸락눈', icon: 'snowing', condition: 'snowy' },
            80: { desc: '소나기', icon: 'rainy_heavy', condition: 'rainy' },
            81: { desc: '강한 소나기', icon: 'rainy_heavy', condition: 'rainy' },
            82: { desc: '격렬한 소나기', icon: 'rainy_heavy', condition: 'rainy' },
            95: { desc: '뇌우', icon: 'thunderstorm', condition: 'rainy' },
        };

        const mapped = weatherCodes[current.weathercode] || { desc: '맑음', icon: 'sunny', condition: 'sunny' };

        return {
            temp: Math.round(current.temperature),
            description: mapped.desc,
            icon: mapped.icon,
            humidity: humidity,
            condition: mapped.condition,
            location: locationName
        };
    } catch (error) {
        console.error("날씨 정보 로드 실패:", error);
        return {
            temp: 17,
            description: '정보 없음',
            icon: 'sunny',
            humidity: 45,
            condition: 'sunny',
            location: 'Error'
        };
    }
}
