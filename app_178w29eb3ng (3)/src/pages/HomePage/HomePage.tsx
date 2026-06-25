import { useState, useCallback, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Copy, Heart, RefreshCw, ShoppingCart, Sparkles, Users, Salad, Flame, Settings, BookmarkCheck } from 'lucide-react';
import { logger, copyToClipboard } from '@lark-apaas/client-toolkit-lite';

// ─── Types ───────────────────────────────────────────────────────────────────
interface IDish {
  name: string;
  type: string;
  cook_time: string;
  calories?: string;
  ingredients: {
    vegetables: string[];
    meat_eggs: string[];
    seasonings: string[];
  };
  steps: string[];
}

interface IMenuState {
  diners: string;
  customDiners: string;
  customDishCount: string;
  dietType: string;
  taste: string;
  avoid: string;
  cookTime: string;
  apiKey: string;
  model: string;
  tasteCustom: string;
  dishes: IDish[];
  loading: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DINER_OPTIONS = [
  { value: '1', label: '1 人' },
  { value: '2', label: '2 人' },
  { value: '3-4', label: '3-4 人' },
  { value: '5+', label: '5 人以上' },
  { value: 'c', label: '自定义' },
] as const;

const DIET_OPTIONS = [
  { value: 'n', label: '普通家常菜' },
  { value: 'd', label: '减脂餐' },
] as const;

const TASTE_OPTIONS = [
  { value: 'r', label: '不挑（随机）' },
  { value: '清淡', label: '清淡' },
  { value: '香辣', label: '香辣' },
  { value: '酸甜', label: '酸甜' },
  { value: '粤式', label: '粤式' },
  { value: '川湘', label: '川湘' },
  { value: '东北家常', label: '东北家常' },
] as const;

const COOK_TIME_OPTIONS = [
  { value: 'q', label: '15 分钟快手' },
  { value: 'n30', label: '30 分钟家常' },
  { value: 'u', label: '不限制' },
] as const;

const STORAGE_KEY = 'dm';
const FAVORITES_KEY = 'dm_favs';
const HISTORY_KEY = 'dm_history';
const HISTORY_MAX = 60;

interface IFavoriteDish extends IDish {
  savedAt: number;
}

// ─── Favorites Helpers ───────────────────────────────────────────────────────
function loadFavorites(): IFavoriteDish[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw) as IFavoriteDish[];
  } catch (e) {
    logger.error('Failed to load favorites:', String(e));
  }
  return [];
}

function saveFavorites(favs: IFavoriteDish[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch (e) {
    logger.error('Failed to save favorites:', String(e));
  }
}

function isFavorited(favs: IFavoriteDish[], dish: IDish): boolean {
  return favs.some(f => f.name === dish.name);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDishCount(diners: string, customDishCount: string, customDiners: string): number {
  if (diners === 'c') {
    if (customDishCount) {
      const n = parseInt(customDishCount);
      if (n > 0 && n < 20) return n;
    }
    const p = parseInt(customDiners) || 2;
    return Math.min(2 + Math.ceil(p / 2), 8);
  }
  const map: Record<string, number> = { '1': 3, '2': 4, '3-4': 5, '5+': 7 };
  return map[diners] || 4;
}

function getCookTimeLabel(v: string): string {
  const map: Record<string, string> = { q: '15min', n30: '30min', u: 'any' };
  return map[v] || 'any';
}

function getTypeLabel(t: string): string {
  const map: Record<string, string> = { meat: '荤菜', veg: '素菜', soup: '汤', staple: '主食' };
  return map[t] || t;
}

function getTypeColor(t: string): string {
  const map: Record<string, string> = { meat: '#EF4444', veg: '#F0A060', soup: '#60A5FA', staple: '#FBBF24' };
  return map[t] || '#6B7280';
}

// ─── Default State ───────────────────────────────────────────────────────────
function loadState(): IMenuState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._v === 2) {
        return {
          diners: parsed.d || '2',
          customDiners: parsed.dc || '',
          customDishCount: parsed.cdc || '',
          dietType: parsed.dn || 'n',
          taste: parsed.t || 'r',
          avoid: parsed.a || '',
          cookTime: parsed.ct || 'u',
          apiKey: parsed.ak || '',
          model: parsed.m || 'deepseek-chat',
          tasteCustom: parsed.tci || '',
          dishes: [],
          loading: false,
        };
      }
    }
  } catch (e) {
    logger.error('Failed to load state:', String(e));
  }
  return {
    diners: '2',
    customDiners: '',
    customDishCount: '',
    dietType: 'n',
    taste: 'r',
    avoid: '',
    cookTime: 'u',
    apiKey: '',
    model: 'deepseek-chat',
    tasteCustom: '',
    dishes: [],
    loading: false,
  };
}

function saveState(state: IMenuState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _v: 2,
      d: state.diners,
      dc: state.customDiners,
      cdc: state.customDishCount,
      dn: state.dietType,
      t: state.taste,
      a: state.avoid,
      ct: state.cookTime,
      ak: state.apiKey,
      m: state.model,
      tci: state.tasteCustom,
    }));
  } catch (e) {
    logger.error('Failed to save state:', String(e));
  }
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────
function buildPrompt(state: IMenuState, fresh: boolean, excludeNames: string[]): string {
  const cnt = fresh ? 1 : getDishCount(state.diners, state.customDishCount, state.customDiners);
  let people = DINER_OPTIONS.find(d => d.value === state.diners)?.label || '2';
  if (state.diners === 'c') {
    const pc = parseInt(state.customDiners) || 2;
    people = `${pc}`;
  }
  const dietLabel = state.dietType === 'd' ? '减脂餐' : '普通家常菜';
  const tasteLabel = state.taste === 'r' ? '随机' : state.taste;
  const timeLabel = getCookTimeLabel(state.cookTime);
  const ti = state.tasteCustom.trim();

  let p = `请为${people}人用餐生成菜单，共${cnt}道菜。`;
  p += `饮食模式：${dietLabel}。`;
  p += `口味偏好：${tasteLabel}。`;
  if (ti) p += `特别想吃：${ti}。`;
  p += `忌口：${state.avoid || '无'}。`;
  p += `烹饪时长限制：${timeLabel}。`;
  if (excludeNames.length > 0) {
    p += `不要与以下菜品重复：${excludeNames.join('、')}。`;
  }
  p += '每道菜需包含菜名、类型(荤菜/素菜/汤/主食)、烹饪时长。';
  if (state.dietType === 'd') p += '额外提供每道菜热量(千卡)。';
  p += '食材清单分蔬菜(vegetables)、肉蛋(meat_eggs)、调料(seasonings)三类。做法步骤分步。返回JSON：{"dishes":[{"name":"菜名","type":"类型","cook_time":"时长"';
  if (state.dietType === 'd') p += ',"calories":"热量千卡"';
  p += ',"ingredients":{"vegetables":[],"meat_eggs":[],"seasonings":[]},"steps":[]}]}';
  return p;
}

// ─── API Call ────────────────────────────────────────────────────────────────
async function callDeepSeek(prompt: string, apiKey: string, model: string): Promise<IDish[] | null> {
  if (!apiKey) {
    toast.error('请先填写 API Key');
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个专业的中国菜谱生成器。必须以纯JSON格式返回，不要包含其他文字或markdown标记。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4096,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      let errMsg = '生成失败，请检查 API Key';
      try {
        const errData = await res.json();
        if (errData.error?.message) errMsg = `API错误：${errData.error.message}`;
      } catch { /* ignore */ }
      toast.error(errMsg);
      return null;
    }
    const data = await res.json();
    if (!data.choices?.[0]?.message) {
      toast.error('数据解析失败');
      return null;
    }
    let content: string = data.choices[0].message.content;
    const mh = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mh) content = mh[1].trim();
    let parsed: { dishes?: IDish[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      const om = content.match(/\{[\s\S]*\}/);
      if (om) {
        try { parsed = JSON.parse(om[0]); } catch {
          toast.error('JSON解析失败');
          return null;
        }
      } else {
        toast.error('JSON解析失败');
        return null;
      }
    }
    if (!parsed.dishes || !Array.isArray(parsed.dishes) || parsed.dishes.length === 0) {
      toast.error('数据格式异常');
      return null;
    }
    return parsed.dishes;
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      toast.error('请求超时');
    } else {
      toast.error('生成失败，请检查网络连接');
    }
    return null;
  }
}

// ─── Shopping List Helpers ───────────────────────────────────────────────────
interface IShoppingCategory {
  label: string;
  icon: string;
  items: string[];
}

function buildShoppingList(dishes: IDish[]): IShoppingCategory[] {
  const cats: IShoppingCategory[] = [
    { label: '蔬菜类', icon: '🥬', items: [] },
    { label: '肉蛋类', icon: '🥩', items: [] },
    { label: '调料类', icon: '🧂', items: [] },
  ];
  const fieldMap: Array<{ field: 'vegetables' | 'meat_eggs' | 'seasonings'; idx: number }> = [
    { field: 'vegetables', idx: 0 },
    { field: 'meat_eggs', idx: 1 },
    { field: 'seasonings', idx: 2 },
  ];

  const seen: Array<Record<string, boolean>> = [{}, {}, {}];

  for (const dish of dishes) {
    if (!dish.ingredients) continue;
    for (const { field, idx } of fieldMap) {
      const list = dish.ingredients[field];
      if (Array.isArray(list)) {
        for (const item of list) {
          const cleaned = item.replace(/[、，\s]/g, '').trim();
          if (cleaned && !seen[idx][cleaned]) {
            seen[idx][cleaned] = true;
            cats[idx].items.push(cleaned);
          }
        }
      }
    }
  }
  return cats;
}

function shoppingListToText(cats: IShoppingCategory[]): string {
  let text = '📋 买菜清单\n\n';
  for (const cat of cats) {
    if (cat.items.length > 0) {
      text += `${cat.icon} ${cat.label}：${cat.items.join('、')}\n`;
    }
  }
  return text;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [state, setState] = useState<IMenuState>(loadState);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [expandedDish, setExpandedDish] = useState<number | null>(null);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<IFavoriteDish[]>(loadFavorites);
  const [favOpen, setFavOpen] = useState(false);
  const [favExpanded, setFavExpanded] = useState<number | null>(null);
  const [historyNames, setHistoryNames] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return new Set<string>(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set<string>();
  });

  useEffect(() => {
    saveState(state);
  }, [
    state.diners, state.customDiners, state.customDishCount, state.dietType,
    state.taste, state.avoid, state.cookTime, state.apiKey, state.model, state.tasteCustom,
  ]);

  const update = useCallback(<K extends keyof IMenuState>(key: K, value: IMenuState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!state.apiKey) {
      toast.error('请先填写 API Key');
      return;
    }
    setState(prev => ({ ...prev, loading: true, dishes: [] }));
    const excludeNames = [...historyNames];
    const dishes = await callDeepSeek(buildPrompt(state, false, excludeNames), state.apiKey, state.model);
    if (dishes) {
      setState(prev => ({ ...prev, dishes, loading: false }));
      setHistoryNames(prev => {
        const next = new Set(prev);
        for (const d of dishes) next.add(d.name);
        if (next.size > HISTORY_MAX) {
          toast.info('历史记录已重置，新一轮菜品池已刷新');
          const fresh = new Set<string>();
          for (const d of dishes) fresh.add(d.name);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify([...fresh])); } catch { /* ignore */ }
          return fresh;
        }
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
      setTimeout(() => {
        document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state, historyNames]);

  const handleToggleFavorite = useCallback((dish: IDish) => {
    setFavorites(prev => {
      const exists = prev.findIndex(f => f.name === dish.name);
      if (exists >= 0) {
        toast.success('已取消收藏');
        const next = [...prev];
        next.splice(exists, 1);
        saveFavorites(next);
        return next;
      }
      toast.success('已加入收藏');
      const next = [{ ...dish, savedAt: Date.now() }, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleRemoveFavorite = useCallback((dish: IFavoriteDish) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.name !== dish.name);
      saveFavorites(next);
      return next;
    });
    toast.success('已取消收藏');
  }, []);

  const handleReplace = useCallback(async (idx: number) => {
    if (!state.apiKey) {
      toast.error('请先填写 API Key');
      return;
    }
    setReplacingIdx(idx);
    const excludeNames = [...new Set([...historyNames, ...state.dishes.map(d => d.name)])];
    const dishes = await callDeepSeek(buildPrompt(state, true, excludeNames), state.apiKey, state.model);
    if (dishes && dishes.length > 0) {
      const newDish = dishes[0];
      setState(prev => {
        const newDishes = [...prev.dishes];
        newDishes[idx] = newDish;
        return { ...prev, dishes: newDishes };
      });
      setHistoryNames(prev => {
        const next = new Set(prev);
        next.add(newDish.name);
        if (next.size > HISTORY_MAX) {
          toast.info('历史记录已重置，新一轮菜品池已刷新');
          const fresh = new Set<string>();
          fresh.add(newDish.name);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify([...fresh])); } catch { /* ignore */ }
          return fresh;
        }
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
    }
    setReplacingIdx(null);
  }, [state, historyNames]);

  const handleCopyShoppingList = useCallback(async () => {
    logger.info('handleCopyShoppingList called, dishes count:', String(state.dishes.length));
    if (state.dishes.length === 0) {
      logger.warn('No dishes to copy');
      return;
    }
    const cats = buildShoppingList(state.dishes);
    const text = shoppingListToText(cats);
    logger.info('Copy text length:', String(text.length));

    const doCopy = async (method: string, fn: () => Promise<void>): Promise<boolean> => {
      try {
        await fn();
        logger.info('Copy succeeded via', method);
        return true;
      } catch (err) {
        logger.warn('Copy failed via', method, ':', String(err));
        return false;
      }
    };

    if (await doCopy('navigator.clipboard', () => navigator.clipboard.writeText(text))) {
      toast.success('已复制，可粘贴到备忘录');
      return;
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '0';
    ta.style.top = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, 99999);

    const fallbackOk = await doCopy('execCommand', async () => {
      const ok = document.execCommand('copy');
      if (!ok) throw new Error('execCommand returned false');
    });

    document.body.removeChild(ta);

    if (fallbackOk) {
      toast.success('已复制，可粘贴到备忘录');
    } else {
      toast.error('复制失败，请尝试手动选中文字后 Ctrl+C 复制');
    }
  }, [state.dishes]);

  const hasResult = state.dishes.length > 0;
  const peopleLabel = (() => {
    if (state.diners === 'c') {
      const pc = parseInt(state.customDiners) || 2;
      return `${pc}`;
    }
    return DINER_OPTIONS.find(d => d.value === state.diners)?.label?.replace(/\s*人.*/, '') || '2';
  })();
  const totalCalories = state.dishes.reduce((sum, d) => sum + (parseInt(d.calories || '') || 0), 0);
  const shoppingCats = buildShoppingList(state.dishes);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <main className="max-w-[640px] mx-auto px-6 pt-12 pb-12 space-y-8">

        {/* ── TITLE ── */}
        <div className="border-b border-gray-200/60 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-3">
                每日 AI 菜单
              </h1>
              <p className="text-base text-gray-500 tracking-wide">
                智能生成营养均衡的家庭菜单
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFavOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-[#F0A060] hover:shadow-md transition-all text-sm font-semibold text-gray-700"
            >
              <BookmarkCheck className="size-4 text-[#F0A060]" />
              我的收藏
              {favorites.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#F0A060] text-white text-xs font-bold">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── DINERS ── */}
        <Card className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-4 text-[#F0A060]" />
              <span className="text-sm font-semibold text-gray-900">用餐人数</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DINER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('diners', opt.value)}
                  className={`flex-1 min-w-[64px] px-3 py-2.5 text-sm rounded-lg font-medium transition-all ${
                    state.diners === opt.value
                      ? 'bg-[#F0A060] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {state.diners === 'c' && (
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={state.customDiners}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => update('customDiners', e.target.value)}
                  placeholder="人数"
                  className="w-20 h-10 text-sm rounded-lg"
                />
                <span className="text-sm font-medium text-gray-600">人</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CUSTOM DISH COUNT ── */}
        <Card className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-colors">
          <CardContent className="p-6">
            <Label htmlFor="cdc" className="text-sm font-semibold text-gray-900 mb-2 block">
              自定义菜品数量
            </Label>
            <Input
              id="cdc"
              type="number"
              min={1}
              max={20}
              value={state.customDishCount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('customDishCount', e.target.value)}
              placeholder="留空则按人数自动匹配"
              className="h-11 text-sm rounded-lg"
            />
          </CardContent>
        </Card>

        {/* ── DIET TYPE ── */}
        <Card className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Salad className="size-4 text-[#F0A060]" />
              <span className="text-sm font-semibold text-gray-900">饮食模式</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('dietType', opt.value)}
                  className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm rounded-lg font-medium transition-all ${
                    state.dietType === opt.value
                      ? 'bg-[#F0A060] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── TASTE ── */}
        <Card className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="size-4 text-[#F0A060]" />
              <span className="text-sm font-semibold text-gray-900">口味倾向</span>
            </div>
            <div className="space-y-3">
              <Select value={state.taste} onValueChange={(v) => update('taste', v)}>
                <SelectTrigger className="h-11 text-sm rounded-lg bg-white">
                  <SelectValue placeholder="选择口味" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {TASTE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={state.tasteCustom}
                onChange={(e: ChangeEvent<HTMLInputElement>) => update('tasteCustom', e.target.value)}
                placeholder="今天想吃啥？如：想吃鸡"
                className="h-11 text-sm rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── MORE SETTINGS ── */}
        <Card className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-colors overflow-hidden">
          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings className="size-4 text-[#F0A060]" /> 更多设置
                </span>
                <ChevronDown className={`size-4 text-gray-400 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="avoid" className="text-sm font-semibold text-gray-900">
                  忌口食材（逗号分隔）
                </Label>
                <Input
                  id="avoid"
                  value={state.avoid}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => update('avoid', e.target.value)}
                  placeholder="如：香菜、海鲜"
                  className="h-11 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cookTime" className="text-sm font-semibold text-gray-900">
                  烹饪时长
                </Label>
                <Select value={state.cookTime} onValueChange={(v) => update('cookTime', v)}>
                  <SelectTrigger id="cookTime" className="h-11 text-sm rounded-lg bg-white">
                    <SelectValue placeholder="选择时长" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {COOK_TIME_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apiKey" className="text-sm font-semibold text-gray-900">
                  DeepSeek API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={state.apiKey}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => update('apiKey', e.target.value)}
                  placeholder="sk-..."
                  className="h-11 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model" className="text-sm font-semibold text-gray-900">
                  模型名称
                </Label>
                <Input
                  id="model"
                  value={state.model}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => update('model', e.target.value)}
                  placeholder="deepseek-chat"
                  className="h-11 text-sm rounded-lg"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* ── GENERATE BUTTON ── */}
        <button
          onClick={(e) => handleGenerate(e as unknown as FormEvent)}
          disabled={state.loading}
          className={`w-full h-14 text-base font-semibold rounded-xl shadow-sm transition-all ${
            state.loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#F0A060] text-white hover:bg-[#D4782A] hover:shadow-md'
          }`}
        >
          {state.loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="size-4" /> 随机生成今日菜单
            </span>
          )}
        </button>

        {/* ── RESULT AREA ── */}
        <AnimatePresence>
          {(hasResult || state.loading) && (
            <motion.div
              id="result-area"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Result Header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {peopleLabel} 人餐菜单
                  </h2>
                  {state.dietType === 'd' && totalCalories > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#F0A060]/10 text-[#D4782A] text-xs font-mono font-medium">
                      🔥 {totalCalories} kcal
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleGenerate(e as unknown as FormEvent)}
                    disabled={state.loading}
                    className="rounded-lg text-xs font-medium"
                  >
                    <RefreshCw className="size-3.5 mr-1" />
                    换一批
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShoppingOpen(true)}
                    className="rounded-lg text-xs font-medium bg-[#F0A060] hover:bg-[#D4782A] text-white"
                  >
                    <ShoppingCart className="size-3.5 mr-1" />
                    买菜清单
                  </Button>
                </div>
              </div>

              {/* Loading Skeletons */}
              {state.loading && (
                <div className="space-y-4">
                  {Array.from({ length: getDishCount(state.diners, state.customDishCount, state.customDiners) }).map((_, i) => (
                    <Card key={i} className="rounded-xl shadow-sm border border-transparent">
                      <CardContent className="p-6 space-y-3">
                        <Skeleton className="h-5 w-2/5 rounded-lg" />
                        <Skeleton className="h-4 w-3/5 rounded-lg" />
                        <Skeleton className="h-4 w-full rounded-lg" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Dish Cards */}
              {!state.loading && state.dishes.map((dish, idx) => (
                <motion.div
                  key={`${dish.name}-${idx}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.06 }}
                  className="space-y-3"
                >
                  <Card className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedDish(expandedDish === idx ? null : idx)}
                      className="w-full text-left"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">
                              {dish.name}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: getTypeColor(dish.type) }}
                              >
                                {getTypeLabel(dish.type)}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">
                                ⏱ {dish.cook_time}
                              </span>
                              {dish.calories && (
                                <span className="text-xs font-mono font-medium text-[#D4782A]">
                                  🔥 {dish.calories}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(dish);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              aria-label={isFavorited(favorites, dish) ? '取消收藏' : '加入收藏'}
                            >
                              <motion.div
                                key={isFavorited(favorites, dish) ? 'filled' : 'empty'}
                                initial={{ scale: 0.6 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                              >
                                <Heart
                                  className={`size-4 transition-colors ${
                                    isFavorited(favorites, dish)
                                      ? 'fill-[#F0A060] text-[#F0A060]'
                                      : 'text-gray-300 hover:text-[#F0A060]'
                                  }`}
                                />
                              </motion.div>
                            </button>
                            <ChevronDown
                              className={`size-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                                expandedDish === idx ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </button>

                    <AnimatePresence>
                      {expandedDish === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                            {dish.ingredients && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  📦 食材清单
                                </h4>
                                <div className="space-y-1.5 text-sm">
                                  {dish.ingredients.vegetables?.length > 0 && (
                                    <div className="flex flex-wrap items-baseline gap-1">
                                      <span className="text-xs text-gray-400">🥬 蔬菜：</span>
                                      <span className="text-gray-700">{dish.ingredients.vegetables.join('、')}</span>
                                    </div>
                                  )}
                                  {dish.ingredients.meat_eggs?.length > 0 && (
                                    <div className="flex flex-wrap items-baseline gap-1">
                                      <span className="text-xs text-gray-400">🥩 肉蛋：</span>
                                      <span className="text-gray-700">{dish.ingredients.meat_eggs.join('、')}</span>
                                    </div>
                                  )}
                                  {dish.ingredients.seasonings?.length > 0 && (
                                    <div className="flex flex-wrap items-baseline gap-1">
                                      <span className="text-xs text-gray-400">🧂 调料：</span>
                                      <span className="text-gray-700">{dish.ingredients.seasonings.join('、')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {dish.steps?.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  👨‍🍳 做法步骤
                                </h4>
                                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                                  {dish.steps.map((step, si) => (
                                    <li key={si}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Replace Button — outside card */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReplace(idx)}
                      disabled={replacingIdx === idx}
                      className="rounded-lg text-xs font-medium"
                    >
                      {replacingIdx === idx ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          替换中
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="size-3" />
                          换一道
                        </span>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SHOPPING LIST DIALOG ── */}
        <Dialog open={shoppingOpen} onOpenChange={setShoppingOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="size-5 text-[#F0A060]" /> 买菜清单
              </DialogTitle>
              <DialogClose />
            </DialogHeader>

            {state.dishes.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                请先生成菜单
              </div>
            ) : (
              <div className="space-y-5 mt-4">
                {shoppingCats.map((cat, ci) => (
                  <div key={ci}>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100">
                      {cat.icon} {cat.label}
                    </h4>
                    {cat.items.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {cat.items.map((item, ii) => (
                          <span
                            key={ii}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-50 text-sm text-gray-700 font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic">（无）</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleCopyShoppingList}
                disabled={state.dishes.length === 0}
                className="flex-1 h-11 text-sm font-medium rounded-lg bg-[#F0A060] hover:bg-[#D4782A] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Copy className="size-4" />
                一键复制
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── FAVORITES DIALOG ── */}
        <Dialog open={favOpen} onOpenChange={setFavOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookmarkCheck className="size-5 text-[#F0A060]" /> 我的收藏
              </DialogTitle>
              <DialogClose />
            </DialogHeader>

            {favorites.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                还没有收藏的菜品，点击菜单中的 ♡ 即可收藏
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {favorites.map((fav, fi) => (
                  <Card key={fi} className="rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-colors overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFavExpanded(favExpanded === fi ? null : fi)}
                      className="w-full text-left"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate text-sm">{fav.name}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-white"
                                style={{ backgroundColor: getTypeColor(fav.type) }}
                              >
                                {getTypeLabel(fav.type)}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">⏱ {fav.cook_time}</span>
                              {fav.calories && (
                                <span className="text-[10px] font-mono font-medium text-[#D4782A]">🔥 {fav.calories}</span>
                              )}
                            </div>
                          </div>
                          <ChevronDown
                            className={`size-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${favExpanded === fi ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </CardContent>
                    </button>

                    <AnimatePresence>
                      {favExpanded === fi && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                            {fav.ingredients && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">📦 食材清单</h4>
                                <div className="space-y-1 text-xs">
                                  {fav.ingredients.vegetables?.length > 0 && (
                                    <div className="flex flex-wrap items-baseline gap-1">
                                      <span className="text-[10px] text-gray-400">🥬 蔬菜：</span>
                                      <span className="text-gray-700">{fav.ingredients.vegetables.join('、')}</span>
                                    </div>
                                  )}
                                  {fav.ingredients.meat_eggs?.length > 0 && (
                                    <div className="flex flex-wrap items-baseline gap-1">
                                      <span className="text-[10px] text-gray-400">🥩 肉蛋：</span>
                                      <span className="text-gray-700">{fav.ingredients.meat_eggs.join('、')}</span>
                                    </div>
                                  )}
                                  {fav.ingredients.seasonings?.length > 0 && (
                                    <div className="flex flex-wrap items-baseline gap-1">
                                      <span className="text-[10px] text-gray-400">🧂 调料：</span>
                                      <span className="text-gray-700">{fav.ingredients.seasonings.join('、')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {fav.steps?.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">👨‍🍳 做法步骤</h4>
                                <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                                  {fav.steps.map((step, si) => (
                                    <li key={si}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveFavorite(fav)}
                              className="w-full h-9 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <Heart className="size-3 fill-red-500 text-red-500" />
                              取消收藏
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
