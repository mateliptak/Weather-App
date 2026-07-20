if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

document.addEventListener("DOMContentLoaded", () => {
    const state = {
        unit: "metric",
        location: {
            name: "Budapest",
            country: "HU",
            latitude: 47.4979,
            longitude: 19.0402,
            timezone: "Europe/Budapest",
        },
        weather: null,
    };

    const els = {
        form: document.getElementById("searchForm"),
        input: document.getElementById("searchInput"),
        locationBtn: document.getElementById("locationBtn"),
        unitBtn: document.getElementById("unitBtn"),
        subtitle: document.getElementById("subtitle"),
        locationLabel: document.getElementById("locationLabel"),
        cityTitle: document.getElementById("cityTitle"),
        weatherDesc: document.getElementById("weatherDesc"),
        dayText: document.getElementById("dayText"),
        timeText: document.getElementById("timeText"),
        currentTemp: document.getElementById("currentTemp"),
        feelsLike: document.getElementById("feelsLike"),
        weatherIcon: document.getElementById("weatherIcon"),
        precipNow: document.getElementById("precipNow"),
        windNow: document.getElementById("windNow"),
        humidityNow: document.getElementById("humidityNow"),
        pressureNow: document.getElementById("pressureNow"),
        uvValue: document.getElementById("uvValue"),
        sunriseValue: document.getElementById("sunriseValue"),
        sunsetValue: document.getElementById("sunsetValue"),
        rainChance: document.getElementById("rainChance"),
        hourlyGrid: document.getElementById("hourlyGrid"),
        dailyList: document.getElementById("dailyList"),
        rainChart: document.getElementById("rainChart"),
        statusText: document.getElementById("statusText"),
        appShell: document.querySelector(".app-shell"),
    };

    const weatherMap = (code) => {
        const map = {
            0: ["☀️", "Tiszta ég"],
            1: ["🌤️", "Főként derült"],
            2: ["⛅", "Részben felhős"],
            3: ["☁️", "Borult"],
            45: ["🌫️", "Köd"],
            48: ["🌫️", "Zúzmarás köd"],
            51: ["🌦️", "Gyenge szitálás"],
            53: ["🌦️", "Szitálás"],
            55: ["🌧️", "Erősebb szitálás"],
            61: ["🌧️", "Gyenge eső"],
            63: ["🌧️", "Eső"],
            65: ["🌧️", "Záporos eső"],
            71: ["🌨️", "Hó"],
            73: ["🌨️", "Havazás"],
            75: ["❄️", "Erős havazás"],
            77: ["🌨️", "Hószemcsék"],
            80: ["🌦️", "Gyenge záporok"],
            81: ["🌧️", "Záporok"],
            82: ["⛈️", "Heves záporok"],
            85: ["🌨️", "Hószállingózás"],
            86: ["❄️", "Havas záporok"],
            95: ["⛈️", "Zivatar"],
            96: ["⛈️", "Zivatar jégesővel"],
            99: ["⛈️", "Erős zivatar jégesővel"],
        };

        return map[code] || ["⛅", "Változó idő"];
    };

    let map = null;
    let marker = null;

    function initMap(lat, lon) {
        if (!window.L) return;

        if (!map) {
            map = L.map("map", {
                zoomControl: true,
                scrollWheelZoom: false,
            }).setView([lat, lon], 10);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap",
                maxZoom: 19,
            }).addTo(map);

            marker = L.marker([lat, lon]).addTo(map);
        } else {
            map.setView([lat, lon], 10);
            if (marker) marker.setLatLng([lat, lon]);
        }

        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 100);
    }

    const formatTemp = (value) => `${Math.round(value)}°`;
    const formatWind = (value) => `${Math.round(value)} ${state.unit === "metric" ? "km/h" : "mph"}`;
    const formatPressure = (value) => `${Math.round(value)} hPa`;
    const formatRainChance = (value) => `${Math.round(value)}%`;

    const formatTime = (iso, timezone) => {
        return new Intl.DateTimeFormat("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
        }).format(new Date(iso));
    };

    const formatDay = (iso, timezone) => {
        return new Intl.DateTimeFormat("hu-HU", {
            weekday: "long",
            month: "short",
            day: "numeric",
            timeZone: timezone,
        }).format(new Date(iso));
    };

    const setStatus = (text) => {
        els.statusText.textContent = text;
    };

    const setLoading = (value) => {
        els.appShell.classList.toggle("loading", value);
    };

    async function geocodeCity(query) {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", query);
        url.searchParams.set("count", "1");
        url.searchParams.set("language", "hu");
        url.searchParams.set("format", "json");

        const res = await fetch(url);
        if (!res.ok) throw new Error("Nem sikerült elérni a geokódoló szolgáltatást.");

        const data = await res.json();

        if (!data.results || !data.results.length) {
            throw new Error("Nem található ilyen város.");
        }

        const result = data.results[0];
        return {
            name: result.name,
            country: result.country_code || result.country || "",
            latitude: result.latitude,
            longitude: result.longitude,
            timezone: result.timezone || "auto",
        };
    }

    async function fetchWeather(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            timezone: "auto",
            forecast_days: "7",
            language: "hu",
            temperature_unit: state.unit === "metric" ? "celsius" : "fahrenheit",
            windspeed_unit: state.unit === "metric" ? "kmh" : "mph",
            precipitation_unit: "mm",
            current:
                "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,weather_code,is_day,uv_index",
            hourly: "temperature_2m,precipitation_probability,weather_code",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        });

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error("Nem sikerült lekérni az időjárást.");
        return res.json();
    }

    function renderCurrent(location, data) {
        const current = data.current;
        const [icon, desc] = weatherMap(current.weather_code);

        els.locationLabel.textContent = `${location.name}, ${location.country}`;
        els.cityTitle.textContent = location.name;
        els.weatherDesc.textContent = desc;
        els.weatherIcon.textContent = icon;
        els.currentTemp.textContent = formatTemp(current.temperature_2m);
        els.feelsLike.textContent = formatTemp(current.apparent_temperature);
        els.precipNow.textContent = `${(current.precipitation ?? 0).toFixed(1)} mm`;
        els.windNow.textContent = formatWind(current.wind_speed_10m);
        els.humidityNow.textContent = `${Math.round(current.relative_humidity_2m)}%`;
        els.pressureNow.textContent = formatPressure(current.surface_pressure);

        els.dayText.textContent = new Intl.DateTimeFormat("hu-HU", {
            weekday: "long",
            timeZone: data.timezone,
        }).format(new Date());

        els.timeText.textContent = new Intl.DateTimeFormat("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: data.timezone,
        }).format(new Date());

        const today = data.daily;
        els.uvValue.textContent = current.uv_index != null ? current.uv_index.toFixed(1) : "--";
        els.sunriseValue.textContent = formatTime(today.sunrise[0], data.timezone);
        els.sunsetValue.textContent = formatTime(today.sunset[0], data.timezone);
        els.rainChance.textContent = formatRainChance(today.precipitation_probability_max[0] || 0);

        els.subtitle.textContent = `${desc} • frissítve most`;
    }

    function renderHourly(data) {
        const times = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const probs = data.hourly.precipitation_probability;
        const codes = data.hourly.weather_code;

        const nowIndex = Math.max(
            0,
            times.findIndex((t) => new Date(t) >= new Date())
        );

        const items = times.slice(nowIndex, nowIndex + 6).map((time, i) => {
            const idx = nowIndex + i;
            const [icon] = weatherMap(codes[idx]);

            return `
                <div class="hour-card">
                    <span>${new Intl.DateTimeFormat("hu-HU", {
                hour: "2-digit",
                timeZone: data.timezone,
            }).format(new Date(time))}</span>
                    <strong>${formatTemp(temps[idx])}</strong>
                    <div style="font-size: 1.4rem;">${icon}</div>
                    <span>${Math.round(probs[idx] || 0)}%</span>
                </div>
            `;
        });

        els.hourlyGrid.innerHTML = items.join("");
    }

    function renderDaily(data) {
        const daily = data.daily;

        const rows = daily.time.map((time, i) => {
            const [icon, desc] = weatherMap(daily.weather_code[i]);

            return `
                <div class="day-row">
                    <div class="left">
                        <div style="font-size: 1.35rem;">${icon}</div>
                        <div>
                            <strong>${formatDay(time, data.timezone)}</strong>
                            <span>${desc}</span>
                        </div>
                    </div>
                    <div class="center">${Math.round(daily.precipitation_probability_max[i] || 0)}%</div>
                    <div class="right">
                        <span class="temp-range">${formatTemp(daily.temperature_2m_min[i])} / ${formatTemp(daily.temperature_2m_max[i])}</span>
                    </div>
                </div>
            `;
        });

        els.dailyList.innerHTML = rows.join("");
    }

    function renderRainChart(data) {
        const times = data.hourly.time;
        const probs = data.hourly.precipitation_probability;

        const nowIndex = Math.max(
            0,
            times.findIndex((t) => new Date(t) >= new Date())
        );

        const slice = probs.slice(nowIndex, nowIndex + 12);
        const labels = times.slice(nowIndex, nowIndex + 12);

        els.rainChart.innerHTML = slice.map((value, i) => {
            const height = Math.max(8, value || 0);
            const label = new Intl.DateTimeFormat("hu-HU", {
                hour: "2-digit",
                timeZone: data.timezone,
            }).format(new Date(labels[i]));

            return `
                <div class="rain-column">
                    <div class="rain-bar-wrap">
                        <div class="rain-bar" style="height:${height}%"></div>
                    </div>
                    <div class="rain-label">${label}</div>
                    <div class="rain-label">${Math.round(value || 0)}%</div>
                </div>
            `;
        }).join("");
    }

    async function loadLocation(location) {
        try {
            setLoading(true);
            setStatus("Adatok betöltése...");

            state.location = location;

            const weather = await fetchWeather(location.latitude, location.longitude);
            state.weather = weather;

            renderCurrent(location, weather);
            renderHourly(weather);
            renderDaily(weather);
            renderRainChart(weather);
            initMap(location.latitude, location.longitude);

            setStatus(`Sikeres frissítés: ${location.name}, ${location.country}.`);
        } catch (error) {
            console.error(error);
            setStatus(error.message || "Hiba történt az időjárás betöltése közben.");
        } finally {
            setLoading(false);
        }
    }

    els.form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const query = els.input.value.trim();
        if (!query) return;

        try {
            setStatus("Város keresése...");
            const location = await geocodeCity(query);
            await loadLocation(location);
            els.input.value = "";
        } catch (error) {
            console.error(error);
            setStatus(error.message || "Nem sikerült megtalálni a várost.");
        }
    });

    els.unitBtn.addEventListener("click", async () => {
        state.unit = state.unit === "metric" ? "imperial" : "metric";
        els.unitBtn.textContent = state.unit === "metric" ? "°C" : "°F";
        els.unitBtn.classList.toggle("active", state.unit === "metric");

        if (state.location) {
            await loadLocation(state.location);
        }
    });

    els.locationBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            setStatus("A böngésző nem támogatja a helymeghatározást.");
            return;
        }

        setStatus("Saját hely meghatározása...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                await loadLocation({
                    name: "Saját hely",
                    country: "GPS",
                    latitude,
                    longitude,
                    timezone: "auto",
                });
            },
            (error) => {
                console.error(error);
                setStatus("Nem sikerült lekérni a saját helyet.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    const tick = () => {
        if (state.weather?.timezone) {
            els.dayText.textContent = new Intl.DateTimeFormat("hu-HU", {
                weekday: "long",
                timeZone: state.weather.timezone,
            }).format(new Date());

            els.timeText.textContent = new Intl.DateTimeFormat("hu-HU", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: state.weather.timezone,
            }).format(new Date());
        }
    };

    setInterval(tick, 1000);

    loadLocation(state.location);
});