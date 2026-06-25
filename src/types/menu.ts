// EXPORTS: IDish, IIngredients, IMenuState, IMenuFormData, IMenuResult, ICategoryItems, ISeenMap

export interface IIngredients {
  vegetables: string[];
  meat_eggs: string[];
  seasonings: string[];
}

export interface IDish {
  name: string;
  type: string;
  cook_time: string;
  calories?: string;
  ingredients: IIngredients;
  steps: string[];
}

export interface IMenuState {
  diners: string;
  customDiners: string;
  diet: string;
  taste: string;
  avoid: string;
  cookTime: string;
  apiKey: string;
  model: string;
  customDishCount: string;
  tasteCustom: string;
  dishes: IDish[];
  loading: boolean;
}

export interface IMenuFormData {
  diners: string;
  customDiners: string;
  diet: string;
  taste: string;
  avoid: string;
  cookTime: string;
  apiKey: string;
  model: string;
  customDishCount: string;
  tasteCustom: string;
}

export interface IMenuResult {
  dishes: IDish[];
}

export interface ICategoryItems {
  label: string;
  items: string[];
}

export interface ISeenMap {
  [category: string]: { [item: string]: boolean };
}
