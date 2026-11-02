export const CAMERA_COMMANDS = {
    Stop: 0,
    Up: 1,
    Down: 2,
    Left: 3,
    Right: 4,
    UpLeft: 5,
    UpRight: 6,
    DownLeft: 7,
    DownRight: 8,
    ZoomIn: 9,
    ZoomOut: 10,
    Restart: 11,
    Calibration: 12
} as const;

/** Thanh tốc độ quay PTZ: 0–100%, kéo từng 1%; giá trị gửi BE làm tròn tới mốc 5% (20 cấp). */
export const PTZ_SPEED_STEP_PERCENT = 1
export const PTZ_SPEED_LEVEL_PERCENT = 5
export const PTZ_SPEED_DEFAULT_PERCENT = 50

/**
 * Đổi % trên thanh trượt → tốc độ gửi BE (0–1), làm tròn tới bội số 0.05 gần nhất:
 * 12% → 0.10, 13% → 0.15, 3% → 0.05. Tối thiểu 0.05 vì gửi 0 thì camera không quay.
 */
export const toPtzSpeed = (percent: number): number => {
    const levels = Math.round(Math.max(0, Math.min(100, Number(percent) || 0)) / PTZ_SPEED_LEVEL_PERCENT)
    return Math.max(1, levels) * PTZ_SPEED_LEVEL_PERCENT / 100
};