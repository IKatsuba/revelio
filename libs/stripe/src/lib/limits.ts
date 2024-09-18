/**
 *
 * План	Цена (в месяц)	Токены (ввод)	Токены (вывод)	Общее количество токенов	Голосовые функции (минут)	Генерация изображений	Ожидаемая прибыль
 * Basic	$5	2,000,000	1,000,000	3,000,000	100	30	$2.30
 * Standard	$10	5,000,000	2,500,000	7,500,000	250	70	$3.35
 * Premium	$20	12,000,000	6,000,000	18,000,000	600	160	$4.20
 * Ultimate	$50	30,000,000	15,000,000	45,000,000	1,500	400	$10.50
 *
 */

export interface Limit {
  outputTokens: number;
  voiceMinutes: number;
  imageGeneration: number;
}

export const Limits: Record<string, Limit> = {
  basic: {
    outputTokens: 1_000_000,
    voiceMinutes: 100,
    imageGeneration: 30,
  },
  standard: {
    outputTokens: 2_500_000,
    voiceMinutes: 250,
    imageGeneration: 70,
  },
  premium: {
    outputTokens: 6_000_000,
    voiceMinutes: 600,
    imageGeneration: 160,
  },
  ultimate: {
    outputTokens: 15_000_000,
    voiceMinutes: 1500,
    imageGeneration: 400,
  },
};
