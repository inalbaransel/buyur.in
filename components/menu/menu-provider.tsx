"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { isValidHex, pickReadableOn, readableAccent, visibleFill } from "@/lib/color";
import { getThemeColor } from "@/lib/themes";
import { getSurface } from "@/lib/surfaces";
import { getFontStack } from "@/lib/fonts";
import { cartCount, lineKey, loadCart, saveCart, unitPriceFor, type CartLine, type CartSelection } from "@/lib/cart";
import {
  activeLocales,
  getStoredLocale,
  hasStoredLocale,
  isRTLLocale,
  localeCodes,
  localeLabels,
  mainLocale,
  storeLocale,
  tField,
  t as translate,
  type Locale,
  type Translatable,
  type TranslatableField,
  type UIKey,
} from "@/lib/i18n";
import type { TrackPayload } from "@/lib/analytics/events";
import { trackEvent, trackOnce } from "@/lib/analytics/track-client";
import type { Business, Category, Popup, Product, ProductOption } from "@/lib/types";
import { OptionPicker } from "@/components/menu/option-picker";
import { CartBar } from "@/components/menu/cart";
import { PopupModal } from "@/components/menu/popup-modal";
import { LanguageModal } from "@/components/menu/language-modal";
import { CategoryDrawer } from "@/components/menu/category-drawer";
import { UpsellSheet } from "@/components/menu/upsell-sheet";
import { upsellSuggestions } from "@/lib/upsell";
import { ArrowLeftIcon, MenuIcon, SearchIcon, ShoppingBagIcon } from "@/components/icons";

/** Sepete eklemenin nereden geldiği: menüdeki ürün kartı ya da "yanına içecek" önerisi. */
type AddSource = "menu" | "upsell";

interface MenuContextValue {
  business: Business;
  /** Link tabanı: subdomain'de "" (vezirhan.menuvaapp.com), path erişiminde "/vezirhan". */
  base: string;
  cartLines: CartLine[];
  addProduct: (product: Product) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  /** Analitik event gönderir; oturum/kaynak/cihaz sunucuda eklenir. */
  track: (payload: TrackPayload) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** İşletmenin aktif dilleri (Türkçe dahil). Dil seçici yalnızca bunları gösterir. */
  locales: Locale[];
  t: (key: UIKey, vars?: Record<string, string | number>) => string;
  tf: (entity: Translatable, field: TranslatableField) => string;
  categories: Category[];
  products: Product[];
  categoriesLoading: boolean;
  imageByCategory: Map<string, string>;
  productCountByCategory: Map<string, number>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu, MenuProvider içinde kullanılmalı");
  return ctx;
}

const PAGE_LABELS: Record<string, string> = {
  welcome: "Karşılama",
  menu: "Menü (kategoriler)",
  category: "Kategori sayfası",
  product: "Ürün sayfası",
  search: "Arama",
  cart: "Sepet",
  degerlendir: "Değerlendirme",
};

// Her rota değişiminde bir page_view kaydeder (aynı path'e art arda tekrar yazmaz).
function TrackPageViews({ business, base, locale }: { business: Business; base: string; locale: Locale }) {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    let kind = "welcome";
    if (pathname.startsWith(`${base}/categories/`)) kind = "category";
    else if (pathname.startsWith(`${base}/products/`)) kind = "product";
    else if (pathname.startsWith(`${base}/menu`)) kind = "menu";
    else if (pathname.startsWith(`${base}/search`)) kind = "search";
    else if (pathname.startsWith(`${base}/cart`)) kind = "cart";
    else if (pathname.startsWith(`${base}/review`)) kind = "degerlendir";

    trackEvent(business.slug, { type: "page_view", target: kind, label: PAGE_LABELS[kind] ?? kind, locale });
    // Sepet sayfası funnel'ın son adımı — ayrıca kendi event'iyle sayılır.
    if (kind === "cart") {
      trackEvent(business.slug, { type: "cart_view", target: "cart", label: PAGE_LABELS.cart, locale });
    }
  }, [pathname, business.slug, base, locale]);

  return null;
}

function isPopupInWindow(popup: Popup) {
  const now = Date.now();
  if (popup.starts_at && new Date(popup.starts_at).getTime() > now) return false;
  if (popup.ends_at && new Date(popup.ends_at).getTime() < now) return false;
  return true;
}

function MenuHeader({
  business,
  base,
  onOpenDrawer,
}: {
  business: Business;
  base: string;
  onOpenDrawer: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t, tf } = useMenu();
  const isProductPage = pathname.startsWith(`${base}/products/`);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(`${base}/menu`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="relative mx-auto flex h-[var(--header-h)] max-w-3xl items-center justify-between gap-3 px-4">
        {isProductPage ? (
          <button
            onClick={goBack}
            aria-label={t("back")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--brand)", color: "var(--brand-on)" }}
          >
            <ArrowLeftIcon size={20} className={isRTLLocale(locale) ? "rotate-180" : undefined} />
          </button>
        ) : (
          <button
            onClick={onOpenDrawer}
            aria-label={t("categoriesLabel")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-crema"
          >
            <MenuIcon size={22} />
          </button>
        )}

        <Link href={`${base}/welcome`} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          {business.logo_url ? (
            <span className="relative block h-9 w-9 overflow-hidden rounded-md border border-line bg-paper">
              <picture>
                <img src={business.logo_url} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover" />
              </picture>
            </span>
          ) : null}
          <span className="max-w-full truncate font-display text-sm font-bold leading-tight">
            {tf(business, "name")}
          </span>
        </Link>

        <LanguageSwitcher />
      </div>
    </header>
  );
}

function BottomNav({ base }: { base: string }) {
  const pathname = usePathname();
  const { t, cartLines } = useMenu();
  const count = cartCount(cartLines);

  const items = [
    {
      href: `${base}/menu`,
      Icon: MenuIcon,
      label: t("navMenu"),
      active:
        pathname.startsWith(`${base}/menu`) ||
        pathname.startsWith(`${base}/categories`) ||
        pathname.startsWith(`${base}/products`),
    },
    { href: `${base}/search`, Icon: SearchIcon, label: t("navSearch"), active: pathname.startsWith(`${base}/search`), badge: 0 },
    { href: `${base}/cart`, Icon: ShoppingBagIcon, label: t("cartTitle"), active: pathname.startsWith(`${base}/cart`), badge: count },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft transition-colors"
            style={item.active ? { color: "var(--brand-text)" } : undefined}
          >
            <span className="relative">
              <item.Icon size={22} strokeWidth={item.active ? 2.2 : 1.8} />
              {"badge" in item && item.badge ? (
                <span
                  className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-[var(--brand-on)]"
                  style={{ background: "var(--brand)" }}
                >
                  {item.badge}
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, locales, t } = useMenu();
  const [open, setOpen] = useState(false);

  // Tek dil (yalnızca Türkçe) aktifse seçiciyi gösterme.
  if (locales.length <= 1) return null;

  return (
    <div className="relative z-50 shrink-0">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("chooseLanguage")}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper font-mono text-[12px] font-bold uppercase tracking-wider text-ink shadow-sm"
      >
        {localeCodes[locale]}
      </button>
      {open && (
        <div className="absolute end-0 top-12 z-50 min-w-[10rem] overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm hover:bg-crema/60"
              style={l === locale ? { color: "var(--brand-text)", fontWeight: 600 } : undefined}
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">{localeCodes[l]}</span>
              <span>{localeLabels[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuProvider({
  business,
  popup,
  basePath,
  initialCategories,
  initialProducts,
  children,
}: {
  business: Business;
  popup: Popup | null;
  basePath: string;
  /** Sunucuda çekilen menü verisi — ilk boyamada hazır (bkz. app/[slug]/layout.tsx). */
  initialCategories: Category[];
  initialProducts: Product[];
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerOptions, setPickerOptions] = useState<ProductOption[]>([]);
  const [popupDismissed, setPopupDismissed] = useState(true);
  // İlk ziyarette (henüz dil seçilmemişken, birden çok dil varsa) dil modalı gösterilir.
  const [needsLangChoice, setNeedsLangChoice] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(() => mainLocale(business));
  const [categories] = useState<Category[]>(initialCategories);
  const [products] = useState<Product[]>(initialProducts);
  const categoriesLoading = false;
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Sepete ekleme sonrası "yanına içecek" önerisi — oturum başına bir kez.
  const [upsell, setUpsell] = useState<{ addedName: string; items: Product[] } | null>(null);
  // Seçenekli bir ürün öneriden eklenirse, seçim penceresi onaylanınca kaynak korunur.
  const [pickerSource, setPickerSource] = useState<AddSource>("menu");
  const closeUpsell = useCallback(() => setUpsell(null), []);

  useEffect(() => {
    setCart(loadCart(business.slug));
  }, [business.slug]);

  const imageByCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (!map.has(p.category) && p.images?.[0]) map.set(p.category, p.images[0]);
    }
    return map;
  }, [products]);

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  // Ürünü olmayan (ya da tüm ürünleri satış dışı) kategoriler müşteriye
  // gösterilmez: sektör şablonuyla açılıp henüz doldurulmamış kategoriler
  // menüyü yarım gibi göstermesin.
  const visibleCategories = useMemo(
    () => categories.filter((category) => (productCountByCategory.get(category.id) ?? 0) > 0),
    [categories, productCountByCategory]
  );

  const baseLocale = mainLocale(business);
  const locales = useMemo(() => activeLocales(business), [business]);

  // Ziyaretçinin kayıtlı dili artık aktif değilse (işletme dili kapatmış olabilir)
  // işletmenin ana diline düş. İlk ziyarette (kayıtlı dil yoksa ve birden çok
  // aktif dil varsa) dil seçim modalını aç.
  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(locales.includes(stored) ? stored : baseLocale);
    if (locales.length > 1 && !hasStoredLocale()) setNeedsLangChoice(true);
  }, [locales, baseLocale]);

  function setLocale(next: Locale) {
    if (next !== locale) {
      trackEvent(business.slug, {
        type: "language_change",
        target: next,
        label: `${locale} → ${next}`,
        locale: next,
        meta: { from: locale, to: next },
      });
    }
    setLocaleState(next);
    storeLocale(next);
  }

  function chooseLanguage(next: Locale) {
    setLocale(next);
    setNeedsLangChoice(false);
  }

  function t(key: UIKey, vars?: Record<string, string | number>) {
    return translate(locale, key, vars);
  }

  function tf(entity: Translatable, field: TranslatableField) {
    return tField(entity, field, locale, baseLocale);
  }

  useEffect(() => {
    if (!popup) return;
    const key = `menuva-popup-${business.slug}-${popup.id}`;
    if (!sessionStorage.getItem(key) && isPopupInWindow(popup)) {
      setPopupDismissed(false);
    }
  }, [popup, business.slug]);

  function dismissPopup() {
    if (popup) {
      sessionStorage.setItem(`menuva-popup-${business.slug}-${popup.id}`, "1");
      // Kampanya modalındaki tek aksiyon "menüyü gör" — kapatma bu yüzden
      // tıklama sayılıyor (gösterim campaign_view ile ayrı kaydediliyor).
      trackEvent(business.slug, {
        type: "campaign_click",
        target: popup.id,
        label: popup.title,
        popupId: popup.id,
        locale,
      });
    }
    setPopupDismissed(true);
  }

  // Kampanya gösterimi: modal gerçekten ekrana geldiğinde, oturum başına bir kez.
  const popupVisible = Boolean(popup) && !popupDismissed && !needsLangChoice;
  useEffect(() => {
    if (!popup || !popupVisible) return;
    trackOnce(`campaign_view:${popup.id}`, () => {
      trackEvent(business.slug, {
        type: "campaign_view",
        target: popup.id,
        label: popup.title,
        popupId: popup.id,
        locale,
      });
    });
  }, [popup, popupVisible, business.slug, locale]);

  function persistCart(next: CartLine[]) {
    setCart(next);
    saveCart(business.slug, next);
  }

  function addToCart(product: Product, selections: CartSelection[], quantity: number, source: AddSource = "menu") {
    const key = lineKey(product.id, selections);
    const unitPrice = unitPriceFor(product, selections);
    const existing = cart.find((l) => l.key === key);
    const next = existing
      ? cart.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l))
      : [...cart, { key, productId: product.id, name: tf(product, "name"), unitPrice, quantity, selections }];
    persistCart(next);
    trackEvent(business.slug, {
      type: "add_to_cart",
      target: product.id,
      label: product.name,
      productId: product.id,
      locale,
      // Öneriden gelen eklemeler ayrışsın: upsell'in işe yarayıp yaramadığı ölçülür.
      meta: source === "upsell" ? { quantity, source } : { quantity },
    });
    if (source === "menu") offerUpsell(product, next);
  }

  /** "Yanına içecek" önerisi: oturum başına en fazla bir kez, yalnızca menüde
   *  içecek kategorisi varsa ve sepette henüz içecek yoksa. */
  function offerUpsell(product: Product, lines: CartLine[]) {
    const storageKey = `menuva-upsell-${business.slug}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      /* sessionStorage kapalı: yine de bir kez göstermeyi deneriz */
    }
    const items = upsellSuggestions({
      added: product,
      categories,
      products,
      cartProductIds: lines.map((line) => line.productId),
    });
    if (items.length === 0) return;
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      /* yoksay */
    }
    setUpsell({ addedName: tf(product, "name"), items });
  }

  function track(payload: TrackPayload) {
    trackEvent(business.slug, { locale, ...payload });
  }

  async function addProduct(product: Product, source: AddSource = "menu") {
    const options = await pb.collection("menuva_product_options").getFullList<ProductOption>({
      filter: pb.filter("product = {:id}", { id: product.id }),
      requestKey: null,
      sort: "order,created",
    });
    if (options.length === 0) {
      addToCart(product, [], 1, source);
    } else {
      setPickerOptions(options);
      setPickerSource(source);
      setPickerProduct(product);
    }
  }

  function trackRemoval(key: string) {
    const line = cart.find((l) => l.key === key);
    if (!line) return;
    trackEvent(business.slug, {
      type: "remove_from_cart",
      target: line.productId,
      label: line.name,
      productId: line.productId,
      locale,
    });
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) trackRemoval(key);
    const next =
      quantity <= 0 ? cart.filter((l) => l.key !== key) : cart.map((l) => (l.key === key ? { ...l, quantity } : l));
    persistCart(next);
  }

  function removeLine(key: string) {
    trackRemoval(key);
    persistCart(cart.filter((l) => l.key !== key));
  }

  // Marka rengi: özel renk (theme_color) doluysa onu, değilse preset temayı kullan.
  const brand = isValidHex(business.theme_color) ? business.theme_color : getThemeColor(business.theme);
  // Menü arka planı / yüzey tonu — Tailwind renk token'larını menü kökünde ezer.
  const surface = getSurface(business.menu_bg);
  const brandFill = visibleFill(brand, surface.vars.paper);
  // İşletmenin seçtiği font hem gövde hem başlık ailesini değiştirir
  // (font-display/font-body utility'leri bu değişkenleri okur).
  const fontStack = getFontStack(business.font);
  const brandStyle = {
    "--brand": brandFill,
    "--brand-on": pickReadableOn(brandFill),
    "--brand-text": readableAccent(brand, surface.vars.paper),
    "--header-h": "4.75rem",
    "--font-body": fontStack,
    "--font-display": fontStack,
    // Seçilen arka plan tonu: temel renk token'larını menü kapsamında değiştirir.
    "--color-paper": surface.vars.paper,
    "--color-crema": surface.vars.crema,
    "--color-ink": surface.vars.ink,
    "--color-ink-soft": surface.vars.inkSoft,
    "--color-line": surface.vars.line,
    fontFamily: fontStack,
  } as CSSProperties;

  return (
    <MenuContext.Provider
      value={{
        business,
        base: basePath,
        cartLines: cart,
        addProduct,
        updateQuantity,
        removeLine,
        track,
        locale,
        setLocale,
        locales,
        t,
        tf,
        categories: visibleCategories,
        products,
        categoriesLoading,
        imageByCategory,
        productCountByCategory,
      }}
    >
      <div
        lang={locale}
        dir={isRTLLocale(locale) ? "rtl" : "ltr"}
        style={brandStyle}
        // text-ink şart: renk token'ları bu kökte ezildiği halde body'nin rengi
        // global (açık tema) mürekkepten hesaplanıp miras kalıyordu — koyu
        // yüzeylerde renk sınıfı olmayan her metin (kategori başlıkları, dil
        // listesi…) zemine gömülüyordu.
        className="min-h-screen bg-paper pb-24 text-ink"
      >
        <TrackPageViews business={business} base={basePath} locale={locale} />
        {/* İlk açılışta önce dil seçimi; dil modalı kapanınca kampanya popup'ı gösterilir. */}
        {needsLangChoice && <LanguageModal onPick={chooseLanguage} />}
        {popup && popupVisible && <PopupModal popup={popup} onClose={dismissPopup} />}
        {pickerProduct && (
          <OptionPicker
            product={pickerProduct}
            options={pickerOptions}
            onClose={() => setPickerProduct(null)}
            onConfirm={(selections, quantity) => {
              addToCart(pickerProduct, selections, quantity, pickerSource);
              setPickerProduct(null);
              setPickerSource("menu");
            }}
          />
        )}

        <MenuHeader business={business} base={basePath} onOpenDrawer={() => setDrawerOpen(true)} />
        {drawerOpen && <CategoryDrawer onClose={() => setDrawerOpen(false)} />}
        <main className="mx-auto max-w-3xl">{children}</main>

        <CartBar lines={cart} base={basePath} />
        {upsell && (
          <UpsellSheet
            addedName={upsell.addedName}
            items={upsell.items}
            onAdd={(product) => {
              setUpsell(null);
              addProduct(product, "upsell");
            }}
            onClose={closeUpsell}
          />
        )}
        <BottomNav base={basePath} />
      </div>
    </MenuContext.Provider>
  );
}
