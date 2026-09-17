import { COGNITIVE_DOMAINS } from '../shared/gameTypes.js';
import { clampDifficulty } from '../shared/gameMetrics.js';

export const GAME_ID = 'daily_routine';

/**
 * Safe, unambiguous everyday routines. `steps` are stored in the correct order,
 * so a level that uses fewer steps takes a prefix and stays logical.
 * `distractors` are plausible daily actions that belong to a different routine.
 */
export const SCENARIOS = [
  {
    id: 'morning',
    nameKey: 'games.routines.morning.name',
    steps: [
      { id: 'wake_up', labelKey: 'games.routines.morning.steps.wake_up', emoji: '🌅' },
      { id: 'brush_teeth', labelKey: 'games.routines.morning.steps.brush_teeth', emoji: '🪥' },
      { id: 'bathe', labelKey: 'games.routines.morning.steps.bathe', emoji: '🚿' },
      { id: 'eat_breakfast', labelKey: 'games.routines.morning.steps.eat_breakfast', emoji: '🍽️' },
      { id: 'take_medicine', labelKey: 'games.routines.morning.steps.take_medicine', emoji: '💊' },
    ],
    distractors: [
      { id: 'watch_tv', labelKey: 'games.routines.morning.steps.watch_tv', emoji: '📺' },
      { id: 'go_to_sleep', labelKey: 'games.routines.morning.steps.go_to_sleep', emoji: '🛏️' },
    ],
  },
  {
    id: 'tea',
    nameKey: 'games.routines.tea.name',
    steps: [
      { id: 'boil_water', labelKey: 'games.routines.tea.steps.boil_water', emoji: '♨️' },
      { id: 'put_tea', labelKey: 'games.routines.tea.steps.put_tea', emoji: '🍵' },
      { id: 'pour_water', labelKey: 'games.routines.tea.steps.pour_water', emoji: '🫖' },
      { id: 'add_sugar', labelKey: 'games.routines.tea.steps.add_sugar', emoji: '🥄' },
      { id: 'drink_tea', labelKey: 'games.routines.tea.steps.drink_tea', emoji: '☕' },
    ],
    distractors: [
      { id: 'wash_clothes', labelKey: 'games.routines.tea.steps.wash_clothes', emoji: '🧺' },
      { id: 'open_window', labelKey: 'games.routines.tea.steps.open_window', emoji: '🪟' },
    ],
  },
  {
    id: 'going_out',
    nameKey: 'games.routines.going_out.name',
    steps: [
      { id: 'get_dressed', labelKey: 'games.routines.going_out.steps.get_dressed', emoji: '👕' },
      { id: 'put_on_shoes', labelKey: 'games.routines.going_out.steps.put_on_shoes', emoji: '👟' },
      { id: 'take_keys', labelKey: 'games.routines.going_out.steps.take_keys', emoji: '🔑' },
      { id: 'lock_door', labelKey: 'games.routines.going_out.steps.lock_door', emoji: '🔒' },
      { id: 'leave_home', labelKey: 'games.routines.going_out.steps.leave_home', emoji: '🚪' },
    ],
    distractors: [
      { id: 'cook_rice', labelKey: 'games.routines.going_out.steps.cook_rice', emoji: '🍚' },
      { id: 'read_book', labelKey: 'games.routines.going_out.steps.read_book', emoji: '📖' },
    ],
  },
  {
    id: 'meal',
    nameKey: 'games.routines.meal.name',
    steps: [
      { id: 'wash_hands', labelKey: 'games.routines.meal.steps.wash_hands', emoji: '🧼' },
      { id: 'serve_food', labelKey: 'games.routines.meal.steps.serve_food', emoji: '🍛' },
      { id: 'eat_meal', labelKey: 'games.routines.meal.steps.eat_meal', emoji: '😋' },
      { id: 'wash_plate', labelKey: 'games.routines.meal.steps.wash_plate', emoji: '🧽' },
      { id: 'rest', labelKey: 'games.routines.meal.steps.rest', emoji: '🪑' },
    ],
    distractors: [
      { id: 'water_plants', labelKey: 'games.routines.meal.steps.water_plants', emoji: '🪴' },
      { id: 'call_friend', labelKey: 'games.routines.meal.steps.call_friend', emoji: '☎️' },
    ],
  },
];

/**
 * Level 1 pre-places the first step, which shows the patient what "in order"
 * means without explaining it. From level 2 the board starts empty.
 */
export const DIFFICULTY_LEVELS = [
  { level: 1, stepCount: 3, distractors: 0, prePlaced: 1, hintsPerRound: 2 },
  { level: 2, stepCount: 4, distractors: 0, prePlaced: 0, hintsPerRound: 2 },
  { level: 3, stepCount: 4, distractors: 1, prePlaced: 0, hintsPerRound: 1 },
  { level: 4, stepCount: 5, distractors: 1, prePlaced: 0, hintsPerRound: 1 },
  { level: 5, stepCount: 5, distractors: 2, prePlaced: 0, hintsPerRound: 1 },
];

export function getLevel(difficulty) {
  return DIFFICULTY_LEVELS[clampDifficulty(difficulty) - 1];
}

export const dailyRoutineConfig = {
  gameId: GAME_ID,
  cognitiveDomain: COGNITIVE_DOMAINS.EXECUTIVE_FUNCTION,
  roundsPerSession: 4,
  levels: DIFFICULTY_LEVELS,
  scenarios: SCENARIOS,
  getLevel,
};

export default dailyRoutineConfig;
