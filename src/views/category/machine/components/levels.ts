import {
  TEMPERATURE_LEVEL_GOOD,
  TEMPERATURE_LEVEL_FAIR,
  TEMPERATURE_LEVEL_AVERAGE,
  TEMPERATURE_LEVEL_BAD
} from "@/constants"

// labelKey/noteKey là key i18n, dịch lúc hiển thị
export const defaultLevels = [
  {
    labelKey: 'machine.levels.good',
    noteKey: 'machine.levels.goodNote',
    fromText: "",
    toText: "<=",
    color: "bg-[green]",
    level: TEMPERATURE_LEVEL_GOOD,
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>`
  },
  {
    labelKey: 'machine.levels.fair',
    noteKey: 'machine.levels.fairNote',
    fromText: ">",
    toText: "<=",
    color: "bg-[blue]",
    level: TEMPERATURE_LEVEL_FAIR,
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                <circle cx="12" cy="12" r="10"></circle>
                            </svg>`
  },
  {
    labelKey: 'machine.levels.average',
    noteKey: 'machine.levels.averageNote',
    fromText: ">",
    toText: "<=",
    color: "bg-[orange]",
    level: TEMPERATURE_LEVEL_AVERAGE,
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z">
                                </path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>`
  },
  {
    labelKey: 'machine.levels.bad',
    noteKey: 'machine.levels.badNote',
    fromText: ">",
    toText: "<=",
    color: "bg-[red]",
    level: TEMPERATURE_LEVEL_BAD,
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>`
  },
]

// Mức 4 (Nguy hiểm) không có trần - "đến +∞". BE xếp mức theo "mốc nhỏ nhất còn > giá trị đo"
// (AnalyzeDataService.appreciateThermalData, PdDataRepository.MatchThreshold) và cột max_temperature
// là int, nên lưu int.MaxValue thay cho vô cùng: mọi giá trị vượt mức 3 đều rơi vào mức 4.
export const UNBOUNDED_MAX = 2147483647

// BE serialize enum dạng chuỗi (StringEnumConverter) nên dữ liệu đã lưu trả về level = "Bad",
// còn ngưỡng FE vừa tạo (buildDefaultThresholds) mang số 4 - phải nhận cả hai.
export function isUnboundedLevel(level: number | string) {
  return level === TEMPERATURE_LEVEL_BAD || level === 'Bad'
}

export function buildDefaultThresholds(thresholdType: number) {
  return defaultLevels.map((levelItem) => ({
    maxTemperature: isUnboundedLevel(levelItem.level) ? UNBOUNDED_MAX : 0,
    thresholdType,
    level: levelItem.level,
  }))
}

// Dữ liệu cũ có thể còn trần mức 4 do người dùng nhập tay - ép về UNBOUNDED_MAX.
export function applyUnboundedMax(mode: any) {
  for (const threshold of mode?.temperatureThresholds ?? []) {
    if (isUnboundedLevel(threshold.level) && threshold.maxTemperature !== UNBOUNDED_MAX) {
      threshold.maxTemperature = UNBOUNDED_MAX
    }
  }
}
