/* สี ธีม โลโก้ และสไตล์ทั้งแอป */
import { Platform, StyleSheet } from 'react-native';

/* ============================ brand ============================ */
export const LOGO = { uri: 'data:image/png;base64,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' };

export const LOGO_RATIO = 360 / 286;

/* ============================ theme (pastel) ============================ */
export const INK = '#111111';

export const PASTEL = {
  yellow: { tile: '#FFE7A3', dot: '#FFE59A', label: 'เหลือง' },
  pink:   { tile: '#F7C9CF', dot: '#FFB5C1', label: 'ชมพู' },
  mint:   { tile: '#BFE8D6', dot: '#B7E1D1', label: 'มิ้นต์' },
  blue:   { tile: '#C9E2FF', dot: '#A9D3FF', label: 'ฟ้า' },
  lilac:  { tile: '#D9D3FA', dot: '#CFC6FA', label: 'ม่วง' },
  peach:  { tile: '#F9DDBE', dot: '#F7CFA6', label: 'พีช' },
};

export const PASTEL_KEYS = Object.keys(PASTEL);

export const LIGHT = {
  bg: '#F4F0EA', surface: '#FFFDFA', surface2: '#EFEAE3', text: INK, muted: '#857E75',
  border: '#E6E0D8', ink: INK, onInk: '#FFFFFF', accent: '#FFD64D', danger: '#D94A5C',
  overlay: 'rgba(17,17,17,0.45)', dark: false,
};

export const DARK = {
  bg: '#141311', surface: '#1E1C1A', surface2: '#2A2724', text: '#F5F1EB', muted: '#A39B90',
  border: '#36322D', ink: '#F5F1EB', onInk: '#111111', accent: '#FFD64D', danger: '#F07A89',
  overlay: 'rgba(0,0,0,0.6)', dark: true,
};

/* ============================ styles ============================ */
export const FONT_BY_WEIGHT = {
  '300': 'Prompt_400Regular', '400': 'Prompt_400Regular', '500': 'Prompt_500Medium',
  '600': 'Prompt_600SemiBold', '700': 'Prompt_700Bold', '800': 'Prompt_700Bold',
};

/** ใส่ฟอนต์ Prompt ให้ทุก style ที่มี fontSize (Android ต้องใช้ฟอนต์แยกตามน้ำหนัก) */
export function applyFonts(styles, fontsOk) {
  if (!fontsOk) return styles;
  const out = {};
  Object.keys(styles).forEach((k) => {
    const st = styles[k];
    if (st && st.fontSize !== undefined) {
      const { fontWeight, ...rest } = st;
      out[k] = { ...rest, fontFamily: FONT_BY_WEIGHT[fontWeight || '400'] || 'Prompt_400Regular' };
    } else out[k] = st;
  });
  return out;
}

export function makeStyles(c, fontsOk) {
  const soft = Platform.select({
    android: { elevation: 1 },
    default: { shadowColor: '#000', shadowOpacity: c.dark ? 0.3 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  });
  const raw = {
    root: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
    main: { padding: 16, paddingBottom: 120 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
    icon: { color: c.text },
    danger: { color: c.danger },

    /* type */
    display: { fontSize: 36, lineHeight: 48, fontWeight: '600', color: c.text, letterSpacing: -0.5, marginTop: 6 },
    display2: { fontSize: 30, lineHeight: 41, fontWeight: '600', color: c.text, letterSpacing: -0.4 },
    hello: { fontSize: 14, fontWeight: '500', color: c.muted, marginTop: 4 },
    h1: { fontSize: 22, fontWeight: '600', color: c.text },
    h2: { fontSize: 18, fontWeight: '600', color: c.text, flexShrink: 1 },
    h3: { fontSize: 16, fontWeight: '600', color: c.text },
    body: { fontSize: 14.5, lineHeight: 23, color: c.text },
    smallMuted: { fontSize: 13, lineHeight: 20, color: c.muted },
    meta: { fontSize: 12, color: c.muted, marginRight: 10 },
    hint: { fontSize: 11.5, color: c.muted, marginTop: 5 },
    linkTxt: { fontSize: 13, fontWeight: '600', color: c.text, textDecorationLine: 'underline' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 },
    avatarTxt: { fontWeight: '700', color: INK, fontSize: 14 },

    /* surfaces */
    card: { backgroundColor: c.surface, borderRadius: 22, marginBottom: 12, borderWidth: c.dark ? 1 : 0, borderColor: c.border, ...soft },

    /* buttons */
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 12, paddingLeft: 22, paddingRight: 22, borderWidth: 1.5, borderColor: 'transparent' },
    btn_primary: { backgroundColor: c.ink },
    btn_outline: { backgroundColor: 'transparent', borderColor: c.ink },
    btn_soft: { backgroundColor: c.surface2 },
    btnSm: { paddingVertical: 7, paddingLeft: 14, paddingRight: 14 },
    btnBlock: { alignSelf: 'stretch' },
    btnTxt: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
    btnTxt_primary: { color: c.onInk },
    btnTxt_outline: { color: c.text },
    btnTxt_soft: { color: c.text },
    btnTxtSm: { fontSize: 13 },
    btnArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
    btnArrowSm: { width: 22, height: 22, borderRadius: 11, marginLeft: 6 },

    /* pills & chips */
    pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
    pillTxt: { fontSize: 11.5, fontWeight: '600', color: INK },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginRight: 8, marginBottom: 8 },
    chipSel: { backgroundColor: c.ink, borderColor: c.ink },
    chipTxt: { fontSize: 13, fontWeight: '500', color: c.text },
    chipTxtSel: { color: c.onInk },
    chipDot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
    termHead: { marginTop: 8, marginBottom: 10, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: c.accent },
    termHeadTitle: { fontSize: 16, fontWeight: '600', color: c.text },
    termHeadSub: { fontSize: 12, color: c.muted, marginTop: 1 },
    termLabel: { fontSize: 11.5, fontWeight: '600', color: c.muted, marginBottom: 6, marginTop: 4, letterSpacing: 0.4 },

    /* inputs */
    field: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 7 },
    input: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border, color: c.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
    textarea: { minHeight: 120 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 16, borderWidth: 1.5, borderColor: c.border },
    searchInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 11, marginLeft: 8 },
    formSection: { fontSize: 12, fontWeight: '600', color: c.muted, letterSpacing: 1, marginBottom: 10, marginTop: 6 },

    /* breadcrumb & sections */
    breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
    crumbLink: { fontSize: 12.5, color: c.muted },
    crumbCurrent: { fontSize: 12.5, color: c.text, fontWeight: '600', maxWidth: 200 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    seeAll: { fontSize: 12.5, fontWeight: '600', color: c.text, marginRight: 6 },
    seeAllDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    empty: { padding: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, borderRadius: 22, alignItems: 'center', marginBottom: 12 },
    emptyTxt: { color: c.muted, textAlign: 'center', fontSize: 13.5, lineHeight: 21 },

    /* decorative blobs (ตาม UI kit รูปที่ 2) */
    blob: { position: 'absolute', width: 140, height: 130, borderRadius: 70 },
    blobSm: { position: 'absolute', width: 54, height: 50, borderRadius: 27 },
    blobBig: { position: 'absolute', width: 230, height: 210, borderRadius: 115, opacity: 0.9 },

    /* auth */
    welcome: { flexGrow: 1, padding: 24, overflow: 'hidden' },
    authScroll: { padding: 20, paddingBottom: 48 },
    notice: { padding: 16, marginBottom: 14 },
    noticeTxt: { fontSize: 13.5, color: INK, lineHeight: 21 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    photoBtnTxt: { fontSize: 13, fontWeight: '600', color: c.onInk, marginLeft: 6 },
    swatch: { width: 42, height: 42, borderRadius: 21, marginRight: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    swatchOn: { borderColor: c.ink },
    emojiOpt: { width: 46, height: 46, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
    emojiOptOn: { borderColor: c.ink, backgroundColor: PASTEL.yellow.tile },

    /* profile */
    cover: { height: 120, overflow: 'hidden' },
    statusBubble: { position: 'absolute', left: 14, top: 12, maxWidth: '70%', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    statusTxt: { fontSize: 12.5, fontWeight: '500', color: INK },
    interestTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
    interestTxt: { fontSize: 12, fontWeight: '500', color: INK },
    miniHead: { fontSize: 11.5, fontWeight: '600', color: c.muted, letterSpacing: 0.4, marginBottom: 6 },
    favChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
    favTxt: { fontSize: 12.5, fontWeight: '600', color: INK, marginLeft: 5 },
    linkBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: PASTEL.yellow.tile, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    levelBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.accent, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
    levelNum: { fontSize: 22, fontWeight: '700', color: INK },
    xpTrack: { height: 12, borderRadius: 6, backgroundColor: c.surface2, marginTop: 14, overflow: 'hidden' },
    xpFill: { height: 12, borderRadius: 6, backgroundColor: PASTEL.mint.dot, borderRightWidth: 2, borderRightColor: INK },
    badge: { width: '23.5%', alignItems: 'center', backgroundColor: PASTEL.yellow.tile, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8 },
    badgeOff: { backgroundColor: c.surface2 },
    badgeLabel: { fontSize: 11, fontWeight: '600', color: c.dark ? c.text : INK, marginTop: 4, textAlign: 'center' },
    badgeDesc: { fontSize: 9.5, color: c.muted, textAlign: 'center', marginTop: 1, lineHeight: 13 },
    optTile: { width: '31%', marginRight: '2%', marginBottom: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 3, backgroundColor: c.surface },
    optTileOn: { borderColor: c.ink },
    optCover: { height: 46, borderRadius: 10, overflow: 'hidden' },
    optSmall: { alignItems: 'center', width: 64, paddingVertical: 6, marginRight: 8, marginBottom: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: c.surface },
    optLabel: { fontSize: 11, fontWeight: '500', color: c.text, textAlign: 'center', marginTop: 4 },
    coverEmoji: { position: 'absolute', right: 18, bottom: 10, fontSize: 34 },
    statsRow: { flexDirection: 'row', marginTop: 16, backgroundColor: c.surface2, borderRadius: 16, paddingVertical: 12 },
    statBox: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '600', color: c.text },
    statLabel: { fontSize: 11.5, color: c.muted },
    emojiBadge: { position: 'absolute', right: -3, bottom: -3, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
    menuTxt: { flex: 1, fontSize: 14.5, fontWeight: '500', color: c.text, marginLeft: 12 },

    /* top bar & banners */
    topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.bg },
    topTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    banner: { backgroundColor: PASTEL.yellow.tile, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, borderRadius: 14, marginBottom: 4 },
    bannerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2, paddingHorizontal: 14, paddingVertical: 7, marginHorizontal: 16, borderRadius: 999, marginBottom: 4 },
    bannerTxt: { fontSize: 12, color: c.dark ? c.text : INK, flexShrink: 1 },

    /* home */
    quick: { width: 150, height: 150, borderRadius: 24, padding: 14, marginRight: 10 },
    quickTitle: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 12 },
    quickSub: { fontSize: 12, color: 'rgba(17,17,17,0.6)', marginTop: 2 },
    quickArrow: { position: 'absolute', right: 12, bottom: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
    instructorBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, marginTop: 8, overflow: 'hidden' },
    bannerKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(17,17,17,0.6)' },
    bannerTitle: { fontSize: 19, lineHeight: 27, fontWeight: '600', color: INK, marginTop: 4 },
    bannerArrow: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

    /* course tiles */
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: { borderRadius: 22, padding: 14, marginBottom: 12, minHeight: 168, overflow: 'hidden' },
    tileHalf: { width: '48.5%' },
    tileWide: { width: '100%' },
    tileIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    tileTerm: { fontSize: 12, fontWeight: '600', color: INK, marginLeft: 7 },
    tileTitle: { fontSize: 16, lineHeight: 22, fontWeight: '500', color: INK, marginTop: 14, marginBottom: 12 },
    tileMeta: { fontSize: 11, color: 'rgba(17,17,17,0.65)', flexShrink: 1, marginRight: 4 },

    /* detail hero */
    hero: { borderRadius: 26, padding: 20, marginBottom: 12, overflow: 'hidden' },
    heroTitle: { fontSize: 23, lineHeight: 32, fontWeight: '600', color: INK, marginTop: 14 },
    heroMeta: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)' },
    authorRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    detailContent: { fontSize: 15, color: c.text, lineHeight: 26 },

    /* lists */
    qaItem: { padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
    qaTitle: { fontSize: 15, fontWeight: '500', color: c.text, lineHeight: 22 },
    personCard: { padding: 14, flexDirection: 'row', alignItems: 'center' },
    personName: { fontSize: 15, fontWeight: '600', color: c.text },
    instAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    postCard: { padding: 16 },
    postTitle: { fontSize: 16, fontWeight: '600', color: c.text, marginTop: 10, marginBottom: 4, lineHeight: 23 },
    snippet: { fontSize: 13, color: c.muted, lineHeight: 20 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface2 },
    likeBtnOn: { backgroundColor: PASTEL.pink.dot },
    likeTxt: { fontSize: 12.5, fontWeight: '600', color: c.muted },
    likeTxtOn: { color: INK },
    commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    commentAuthor: { fontSize: 13, fontWeight: '600', color: c.text },
    commentTime: { fontSize: 11, color: c.muted },
    commentText: { fontSize: 14, color: c.text, lineHeight: 21, marginTop: 2 },
    commentForm: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
    sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

    /* fab & tabs */
    fab: {
      position: 'absolute', right: 18, bottom: 96, width: 58, height: 58, borderRadius: 29, backgroundColor: c.accent,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: INK, elevation: 4,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    tabbar: {
      flexDirection: 'row', backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 10, borderRadius: 28,
      paddingVertical: 8, ...soft,
    },
    tab: { flex: 1, alignItems: 'center' },
    tabIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    tabIconOn: { backgroundColor: c.ink },
    tabLabel: { fontSize: 10.5, color: c.muted, fontWeight: '500', marginTop: 1 },
    tabLabelOn: { color: c.text, fontWeight: '600' },

    /* modal sheet */
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%',
      backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 10, paddingBottom: 28,
    },
    adminBtn: {
      position: 'absolute', right: 18, bottom: 98, flexDirection: 'row', alignItems: 'center', backgroundColor: c.ink,
      borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, elevation: 4,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    adminBtnTxt: { fontSize: 13, fontWeight: '600', color: c.onInk, marginLeft: 6 },
    announce: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 20, padding: 14, marginBottom: 12 },
    announceIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    announceKicker: { fontSize: 11, fontWeight: '600', color: 'rgba(17,17,17,0.6)', letterSpacing: 0.4 },
    announceTxt: { fontSize: 14, lineHeight: 21, color: INK, marginTop: 2 },
    countCard: { borderRadius: 28, padding: 18, overflow: 'hidden' },
    countKicker: { fontSize: 12.5, fontWeight: '600', color: 'rgba(17,17,17,0.7)', flexShrink: 1, marginRight: 8 },
    countTitle: { fontSize: 19, lineHeight: 26, fontWeight: '600', color: INK },
    countMeta: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)', marginTop: 2 },
    countRow: { flexDirection: 'row', marginTop: 14 },
    countBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, marginHorizontal: 3, alignItems: 'center', borderWidth: 1.5, borderColor: INK },
    countNum: { fontSize: 26, fontWeight: '700', color: INK },
    countUnit: { fontSize: 11, color: 'rgba(17,17,17,0.6)' },
    countNow: { backgroundColor: INK, borderRadius: 16, padding: 14, marginTop: 14, alignItems: 'center' },
    countNowTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
    nextRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    nextDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    nextTitle: { fontSize: 14, fontWeight: '500', color: c.text },
    weatherCard: { padding: 18, backgroundColor: PASTEL.blue.tile, borderWidth: 0 },
    weatherPlace: { fontSize: 12.5, fontWeight: '500', color: 'rgba(17,17,17,0.7)' },
    weatherTemp: { fontSize: 40, lineHeight: 46, fontWeight: '600', color: INK },
    weatherDesc: { fontSize: 13, color: 'rgba(17,17,17,0.75)' },
    weatherMeta: { fontSize: 12, color: 'rgba(17,17,17,0.75)', marginRight: 12 },
    envBox: { flex: 1, borderRadius: 18, padding: 12, borderWidth: 1.5, borderColor: 'rgba(17,17,17,0.12)' },
    envKicker: { fontSize: 11, fontWeight: '600', color: 'rgba(17,17,17,0.65)' },
    envVal: { fontSize: 24, fontWeight: '700', color: INK, marginTop: 2 },
    envUnit: { fontSize: 11, fontWeight: '400', color: 'rgba(17,17,17,0.6)' },
    envLabel: { fontSize: 13, fontWeight: '600', color: INK },
    envTip: { fontSize: 11, lineHeight: 16, color: 'rgba(17,17,17,0.75)', marginTop: 3 },
    weatherSrc: { fontSize: 10, color: c.muted, marginTop: 10, opacity: 0.8 },
    adminRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    statTile: { width: '48.5%', borderRadius: 22, padding: 14, marginBottom: 12 },
    statTileNum: { fontSize: 28, fontWeight: '700', color: INK, marginTop: 10 },
    statTileLabel: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)' },
    shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
    /* hero cheer */
    hero2: { paddingTop: 4, paddingBottom: 18 },
    heroBrand: { fontSize: 13, fontWeight: '700', color: c.text, letterSpacing: 0.5 },
    heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent, marginHorizontal: 8, borderWidth: 1, borderColor: INK },
    heroBrandSub: { fontSize: 13, fontWeight: '500', color: c.muted },
    cheer: { fontSize: 34, lineHeight: 50, fontWeight: '700', color: c.text, letterSpacing: -0.4, marginTop: 10, minHeight: 100 },
    cheerHl: { backgroundColor: c.accent, color: INK },
    cheerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border, marginRight: 5 },
    cheerDotOn: { width: 20, backgroundColor: c.ink },
    /* countdown v2 */
    kindPill: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
    kindPillTxt: { fontSize: 12.5, fontWeight: '600', color: INK },
    ownerTag: { fontSize: 11.5, fontWeight: '600', color: 'rgba(17,17,17,0.6)' },
    bigDays: { width: 100, height: 100, borderRadius: 28, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
    bigDaysNum: { fontSize: 44, lineHeight: 52, fontWeight: '700', color: '#fff' },
    bigDaysUnit: { fontSize: 12, fontWeight: '500', color: c.accent, marginTop: -4 },
    countCode: { fontSize: 12.5, fontWeight: '700', color: 'rgba(17,17,17,0.65)', letterSpacing: 0.6 },
    countSub: { fontSize: 12.5, color: 'rgba(17,17,17,0.72)', marginTop: 2 },
    timeStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 20, paddingVertical: 10, marginTop: 16 },
    timeCell: { alignItems: 'center', minWidth: 62 },
    timeNum: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: INK },
    timeLbl: { fontSize: 10.5, color: 'rgba(17,17,17,0.6)' },
    timeColon: { fontSize: 22, fontWeight: '700', color: 'rgba(17,17,17,0.35)', marginTop: -12 },
    timeStripNow: { fontSize: 15, fontWeight: '600', color: INK, paddingVertical: 6 },
    progLabel: { fontSize: 11.5, fontWeight: '600', color: 'rgba(17,17,17,0.65)' },
    progTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 6, overflow: 'hidden' },
    progFill: { height: 10, borderRadius: 5, backgroundColor: INK },
    countCheer: { fontSize: 13, fontWeight: '500', color: INK, marginTop: 12 },
    nextList: { backgroundColor: c.surface, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
    nextRowLine: { borderTopWidth: 1, borderTopColor: c.border },
    daysBadge: { alignItems: 'center', backgroundColor: c.surface2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, minWidth: 48 },
    daysBadgeNum: { fontSize: 16, fontWeight: '700', color: c.text },
    daysBadgeLbl: { fontSize: 10, color: c.muted, marginTop: -2 },
    addEventBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, paddingVertical: 11, marginTop: 10 },
    addEventTxt: { fontSize: 13.5, fontWeight: '600', color: c.text, marginLeft: 6 },
    /* weather v2 */
    wxEmpty: { padding: 24, alignItems: 'center' },
    wxCard: { borderRadius: 26, overflow: 'hidden', backgroundColor: c.surface, marginBottom: 14, borderWidth: c.dark ? 1 : 0, borderColor: c.border },
    wxTop: { backgroundColor: PASTEL.blue.tile, padding: 18, overflow: 'hidden' },
    wxRefresh: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    wxTemp: { fontSize: 60, lineHeight: 66, fontWeight: '700', color: INK, letterSpacing: -1.5 },
    wxDesc: { fontSize: 16, fontWeight: '600', color: INK },
    wxFeels: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)', marginTop: 2 },
    wxEmojiBox: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
    wxChip: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
    wxChipTxt: { fontSize: 12, fontWeight: '500', color: INK },
    wxBottom: { padding: 14 },
    gaugeCard: { flex: 1, backgroundColor: c.surface2, borderRadius: 20, padding: 12 },
    gaugeTitle: { fontSize: 11.5, fontWeight: '600', color: c.muted },
    gaugeVal: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: c.text },
    gaugeUnit: { fontSize: 11, color: c.muted, marginBottom: 5, marginLeft: 3 },
    levelChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, marginTop: 4 },
    levelChipTxt: { fontSize: 12, fontWeight: '600', color: INK },
    gaugeTrack: { flexDirection: 'row', height: 8, marginTop: 10, marginBottom: 2 },
    gaugeSeg: { flex: 1, marginHorizontal: 1 },
    gaugeSegFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
    gaugeSegLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    gaugeMarker: { position: 'absolute', top: -4, width: 6, height: 16, marginLeft: -3, borderRadius: 3, backgroundColor: c.ink, borderWidth: 1.5, borderColor: c.surface },
    gaugeTip: { fontSize: 11, lineHeight: 16, color: c.muted, marginTop: 8 },
    bringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: PASTEL.yellow.tile, borderRadius: 16, padding: 10 },
    bringLabel: { fontSize: 12, fontWeight: '700', color: INK, marginRight: 8 },
    bringChip: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginRight: 5, marginVertical: 2 },
    bringTxt: { fontSize: 11.5, fontWeight: '500', color: INK },
    attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(17,17,17,0.12)', borderStyle: 'dashed' },
    attachBtnTxt: { fontSize: 14, fontWeight: '600', color: INK, marginLeft: 8 },
    pendRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 8, marginBottom: 6, borderWidth: 1, borderColor: c.border },
    pendThumb: { width: 44, height: 44, borderRadius: 10 },
    fileExt: { fontSize: 11, fontWeight: '700', color: INK, letterSpacing: 0.4 },
    miniThumb: { width: 40, height: 40, borderRadius: 10, marginRight: 4, backgroundColor: c.surface2 },
    miniMore: { alignItems: 'center', justifyContent: 'center' },
    miniMoreTxt: { fontSize: 12, fontWeight: '600', color: c.text },
    gallery: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginBottom: 6 },
    galleryItem: { width: '33.333%', aspectRatio: 1, padding: 3 },
    galleryOne: { width: '100%', aspectRatio: 4 / 3 },
    galleryImg: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: c.surface2 },
    docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2, borderRadius: 18, padding: 10, marginTop: 8 },
    docIcon: { width: 48, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(17,17,17,0.15)' },
    docOpen: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
    viewer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    viewerImg: { width: '100%', height: '80%' },
    viewerTop: { position: 'absolute', top: 40, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    viewerTxt: { fontSize: 13, color: '#fff', flex: 1, marginRight: 10 },
    viewerNav: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 24 },
    calBox: { backgroundColor: c.surface, borderRadius: 20, padding: 12, borderWidth: 1.5, borderColor: c.border },
    calRow: { flexDirection: 'row' },
    calHead: { flex: 1, textAlign: 'center', fontSize: 11.5, color: c.muted, paddingVertical: 4 },
    calCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
    calDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    calToday: { borderWidth: 1.5, borderColor: c.ink },
    calSel: { backgroundColor: c.ink },
    calDayTxt: { fontSize: 14, color: c.text },
    timeTxt: { fontSize: 18, fontWeight: '600', color: c.text, marginHorizontal: 12, minWidth: 80, textAlign: 'center' },
    summaryBox: { backgroundColor: PASTEL.yellow.tile, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: INK },
    summaryKicker: { fontSize: 11, fontWeight: '600', color: 'rgba(17,17,17,0.6)' },
    summaryTxt: { fontSize: 15, fontWeight: '600', color: INK, marginTop: 2 },
    summaryDate: { fontSize: 13, color: INK, marginTop: 2 },
    formError: { fontSize: 13, color: c.danger, marginBottom: 10, fontWeight: '500' },
    dialogLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
    dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: 26, padding: 22 },
    dialogBtn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginLeft: 8, marginTop: 6, borderWidth: 1.5 },
    dialogBtnOk: { backgroundColor: c.ink, borderColor: c.ink },
    dialogBtnDanger: { backgroundColor: c.danger, borderColor: c.danger },
    dialogBtnCancel: { backgroundColor: 'transparent', borderColor: c.border },
    dialogBtnTxt: { fontSize: 14, fontWeight: '600' },
    dialogBtnTxtOk: { color: '#fff' },
    dialogBtnTxtCancel: { color: c.text },
    sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 12 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  };
  return StyleSheet.create(applyFonts(raw, fontsOk));
}
