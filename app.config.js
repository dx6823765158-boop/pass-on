// ใช้ค่าจาก app.json + ตั้ง baseUrl ตอน build เว็บขึ้น GitHub Pages (เช่น /pass-on)
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments || {}),
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
