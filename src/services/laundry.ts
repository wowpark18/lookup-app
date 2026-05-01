import { getCurrentWeather as getRealWeather, type WeatherData } from './weather';

/**
 * [코다리의 추천] 날씨 및 환경 기반 세탁 가이드 서비스
 * 실제 API 연동 데이터와 AI의 만남!🧚‍♀️✨
 */

export async function getCurrentWeather(): Promise<WeatherData> {
    // weather.ts의 실제 데이터를 가져옵니다.
    return await getRealWeather();
}

export function getLaundryAdvice(material: string, weather: WeatherData): string {
    const humidity = weather.humidity || 50;
    
    if (humidity > 75) {
        return `현재 습도가 ${humidity}%로 매우 높습니다! ${material} 소재는 자연 건조 시 냄새가 날 수 있으니 건조기 사용 혹은 세탁을 내일로 미루는 것을 권장합니다. ☔`;
    }
    
    if (weather.condition === 'sunny') {
        return `햇살이 비치는 화창한 날씨입니다! ${material} 소재는 직사광선을 피해 통풍이 잘 되는 그늘에서 말리면 가장 좋습니다. ☀️`;
    }

    return `${material} 소재는 표준 세탁법을 따르시되, 습도가 적절하니 오늘 세탁하시기 나쁘지 않은 날입니다. ✨`;
}
