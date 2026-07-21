import type { GoalType, Supplement } from '@/types';

/**
 * A small starter library of well-studied supplements used for local search and
 * as fallback analysis when the AI backend is not configured.
 */
export const COMMON_SUPPLEMENTS: Omit<Supplement, 'id'>[] = [
  {
    name: 'Creatine Monohydrate',
    form: 'powder',
    servingSize: '5 g',
    ingredients: [{ name: 'Creatine Monohydrate', amount: 5, unit: 'g' }],
    purpose: 'Strength & power output',
    benefits: ['Increases strength and lean mass', 'Improves high-intensity performance', 'Supports recovery'],
    cautions: ['Drink plenty of water', 'May cause minor water retention'],
    timing: 'Any time daily, consistency matters more than timing',
    goalFit: 0.95,
  },
  {
    name: 'Whey Protein Isolate',
    form: 'powder',
    servingSize: '30 g',
    ingredients: [
      { name: 'Protein', amount: 25, unit: 'g' },
      { name: 'BCAAs', amount: 5.5, unit: 'g' },
    ],
    purpose: 'Muscle protein synthesis',
    benefits: ['Convenient high-quality protein', 'Supports muscle repair'],
    cautions: ['Contains dairy'],
    timing: 'Post-workout or to fill protein gaps',
    goalFit: 0.9,
  },
  {
    name: 'Vitamin D3',
    form: 'softgel',
    servingSize: '1 softgel',
    ingredients: [{ name: 'Vitamin D3 (Cholecalciferol)', amount: 2000, unit: 'IU', dailyValuePct: 250 }],
    purpose: 'Bone, immune & hormonal health',
    benefits: ['Supports immune function', 'Bone density', 'Mood in low-sunlight seasons'],
    cautions: ['Fat-soluble — do not mega-dose without labs'],
    timing: 'With a meal containing fat',
    goalFit: 0.7,
  },
  {
    name: 'Omega-3 Fish Oil',
    form: 'softgel',
    servingSize: '2 softgels',
    ingredients: [
      { name: 'EPA', amount: 720, unit: 'mg' },
      { name: 'DHA', amount: 480, unit: 'mg' },
    ],
    purpose: 'Recovery & cardiovascular health',
    benefits: ['Anti-inflammatory', 'Supports joints and heart', 'Recovery'],
    cautions: ['May thin blood — check with a doctor if on medication'],
    timing: 'With meals',
    goalFit: 0.7,
  },
  {
    name: 'Magnesium Glycinate',
    form: 'capsule',
    servingSize: '2 capsules',
    ingredients: [{ name: 'Magnesium (as glycinate)', amount: 300, unit: 'mg', dailyValuePct: 71 }],
    purpose: 'Sleep & muscle relaxation',
    benefits: ['Supports sleep quality', 'Muscle relaxation', 'Stress resilience'],
    cautions: ['High doses can loosen stools'],
    timing: 'Evening, 1–2 hours before bed',
    goalFit: 0.65,
  },
  {
    name: 'Caffeine + L-Theanine',
    form: 'capsule',
    servingSize: '1 capsule',
    ingredients: [
      { name: 'Caffeine', amount: 100, unit: 'mg' },
      { name: 'L-Theanine', amount: 200, unit: 'mg' },
    ],
    purpose: 'Focus & training energy',
    benefits: ['Smooth energy without jitters', 'Improved focus', 'Pre-workout alternative'],
    cautions: ['Avoid within 8 hours of bedtime', 'Watch total daily caffeine'],
    timing: '30–45 min before training or focus work',
    goalFit: 0.6,
  },
];

export const GOAL_SUPPLEMENT_HINTS: Record<GoalType, string[]> = {
  lose_fat: ['Whey Protein Isolate', 'Caffeine + L-Theanine', 'Vitamin D3', 'Omega-3 Fish Oil'],
  build_muscle: ['Creatine Monohydrate', 'Whey Protein Isolate', 'Vitamin D3', 'Magnesium Glycinate'],
  recomp: ['Creatine Monohydrate', 'Whey Protein Isolate', 'Omega-3 Fish Oil'],
  maintain: ['Vitamin D3', 'Omega-3 Fish Oil', 'Magnesium Glycinate'],
  endurance: ['Omega-3 Fish Oil', 'Magnesium Glycinate', 'Caffeine + L-Theanine', 'Vitamin D3'],
};
