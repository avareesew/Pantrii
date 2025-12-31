/**
 * Recipe Taxonomy - Controlled enums for genre and dish type
 * These are strict constants to prevent hallucination and enable filtering
 */

export enum GenreOfFood {
  AMERICAN = 'American',
  ITALIAN = 'Italian',
  MEXICAN = 'Mexican',
  TEX_MEX = 'Tex-Mex',
  LATIN_AMERICAN = 'Latin American',
  CARIBBEAN = 'Caribbean',
  FRENCH = 'French',
  SPANISH = 'Spanish',
  GREEK = 'Greek',
  MEDITERRANEAN = 'Mediterranean',
  MIDDLE_EASTERN = 'Middle Eastern',
  INDIAN = 'Indian',
  CHINESE = 'Chinese',
  JAPANESE = 'Japanese',
  KOREAN = 'Korean',
  THAI = 'Thai',
  VIETNAMESE = 'Vietnamese',
  FILIPINO = 'Filipino',
  AFRICAN = 'African',
  ETHIOPIAN = 'Ethiopian',
  MOROCCAN = 'Moroccan',
  GERMAN = 'German',
  EASTERN_EUROPEAN = 'Eastern European',
  BRITISH = 'British',
  FUSION = 'Fusion',
  INTERNATIONAL = 'International',
  PLANT_BASED = 'Plant-Based',
  VEGAN = 'Vegan',
  VEGETARIAN = 'Vegetarian',
  GLUTEN_FREE = 'Gluten-Free',
  KETO = 'Keto',
}

export enum TypeOfDish {
  BREAKFAST = 'Breakfast',
  BRUNCH = 'Brunch',
  LUNCH = 'Lunch',
  DINNER = 'Dinner',
  SNACK = 'Snack',
  DESSERT = 'Dessert',
  APPETIZER = 'Appetizer',
  SIDE_DISH = 'Side Dish',
  MAIN_COURSE = 'Main Course',
  SOUP = 'Soup',
  SALAD = 'Salad',
  SANDWICH = 'Sandwich',
  PASTA = 'Pasta',
  PIZZA = 'Pizza',
  RICE_DISH = 'Rice Dish',
  NOODLES = 'Noodles',
  CASSEROLE = 'Casserole',
  STIR_FRY = 'Stir-Fry',
  BOWL = 'Bowl',
  WRAP = 'Wrap',
  TACO = 'Taco',
  BURGER = 'Burger',
  SEAFOOD = 'Seafood',
  POULTRY = 'Poultry',
  BEEF = 'Beef',
  PORK = 'Pork',
  VEGETARIAN_DISH = 'Vegetarian Dish',
  VEGAN_DISH = 'Vegan Dish',
  BREAD = 'Bread',
  MUFFINS = 'Muffins',
  COOKIES = 'Cookies',
  CAKE = 'Cake',
  BROWNIES = 'Brownies',
  BARS = 'Bars',
  PIE = 'Pie',
  SMOOTHIE = 'Smoothie',
  SAUCE = 'Sauce',
  DRESSING = 'Dressing',
  DIP = 'Dip',
  MARINADE = 'Marinade',
}

export enum MethodOfCooking {
  STOVE = 'Stove',
  OVEN = 'Oven',
  MICROWAVE = 'Microwave',
  AIR_FRYER = 'Air Fryer',
  INSTANT_POT = 'Instant Pot',
  GRILL = 'Grill',
  SLOW_COOKER = 'Slow Cooker',
  NO_COOK = 'No-Cook',
}

// Array of all values for easy iteration
export const GENRE_OF_FOOD_OPTIONS = Object.values(GenreOfFood);
export const TYPE_OF_DISH_OPTIONS = Object.values(TypeOfDish);
export const METHOD_OF_COOKING_OPTIONS = Object.values(MethodOfCooking);

// Type guards to validate values
export function isValidGenreOfFood(value: string): value is GenreOfFood {
  return GENRE_OF_FOOD_OPTIONS.includes(value as GenreOfFood);
}

export function isValidTypeOfDish(value: string): value is TypeOfDish {
  return TYPE_OF_DISH_OPTIONS.includes(value as TypeOfDish);
}

export function isValidMethodOfCooking(value: string): value is MethodOfCooking {
  return METHOD_OF_COOKING_OPTIONS.includes(value as MethodOfCooking);
}

// Helper to validate and filter typeOfDish array (max 3)
export function validateTypeOfDishArray(values: string[]): TypeOfDish[] {
  const valid = values
    .filter(isValidTypeOfDish)
    .slice(0, 3); // Max 3 values
  return valid as TypeOfDish[];
}

