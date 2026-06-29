// Compatibility constants for Minecraft/ItemsAdder coordinates. Values preserve existing export output.
export const MINECRAFT_MODEL_UNIT = 16
export const ANIMATION_POSITION_ROUNDING = 100000
export const EXPORT_TRANSFORM_ROUNDING = 10000

// ItemsAdder Java loader/player emote alignment contracts. Do not change without golden export checks.
export const INTERNAL_PLAYER_PIVOT_OFFSET = { x: -1, y: 10, z: 0.5 } as const
export const EXTERNAL_HAND_PIVOT_OFFSET = { x: -1.2, y: 10, z: 0.5 } as const
export const EXTERNAL_HAT_PIVOT_OFFSET = { x: 0, y: -8, z: -4 } as const
export const PLAYER_EMOTE_HEAD_Y_OFFSET = -1.913
export const DEFAULT_SCALE_MODEL_KEY = '1-1-1'