# 🌍 Air Quality Map – AMBA

A modern web application to visualize **real-time air quality** across the AMBA region (Buenos Aires).

The app combines **official monitoring stations** with **estimated data for uncovered areas**, delivering clear, human-friendly recommendations inspired by apps like Apple Weather.

---

## ✨ What it does

- 🗺️ Interactive map with neighborhoods and zones
- 📍 Real AQI data from official stations
- 📊 Estimated AQI for zones without sensors (distance-weighted interpolation)
- 🟢 Clear distinction between **Real** and **Estimated** data
- 💬 Simple recommendations:
  - “Good day to walk”
  - “Reduce outdoor activity”
  - “Better to stay indoors”
- 📱 Mobile-first UI with a bottom sheet layout

---

## 🧠 How it works (in short)

- **Real data**: WAQI / OpenAQ monitoring stations  
- **Geographic data**: GeoJSON zones  
- **Estimation**: Inverse Distance Weighting (IDW) using nearby stations  
- **Transparency**: estimated values always show a confidence level  

This approach allows meaningful insights even in areas without direct sensors (e.g. San Miguel).

---

## 🧱 Tech Stack

**React · TypeScript · Mapbox GL JS · Zustand · Tailwind · Framer Motion · GeoJSON**

---

## 🎯 Why this project

To demonstrate how **data visualization**, **UX design**, and **engineering** can work together to build a trustworthy, user-friendly product — even when real-world data is incomplete.

---

🚧 *Work in progress – architecture defined, estimation logic and UI under active development.*
