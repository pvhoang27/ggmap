// Initialize map
let map;
let currentLayer;
let markers = [];
let userLocationMarker = null;
let currentRoute = null;
let searchTimeout = null;
let currentMode = 'car';
let startPoint = null;
let endPoint = null;

// Initialize the map
function initMap() {
  map = L.map("map", {
    zoomControl: false,
  }).setView([16.0544, 108.2022], 6);

  currentLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }
  ).addTo(map);

  map.on("click", onMapClick);
  addSampleLocations();
}

// Add sample locations
function addSampleLocations() {
  const sampleLocations = [
    { name: "Hà Nội", lat: 21.0285, lng: 105.8542, info: "Thủ đô của Việt Nam" },
    { name: "TP Hồ Chí Minh", lat: 10.8231, lng: 106.6297, info: "Thành phố lớn nhất" },
    { name: "Đà Nẵng", lat: 16.0544, lng: 108.2022, info: "Thành phố đáng sống" },
    { name: "Hội An", lat: 15.8801, lng: 108.338, info: "Phố cổ nổi tiếng" },
    { name: "Huế", lat: 16.4637, lng: 107.5909, info: "Cố đô Việt Nam" },
  ];

  sampleLocations.forEach((loc) => {
    addMarker(loc.lat, loc.lng, loc.name, loc.info);
  });
}

// Add marker
function addMarker(lat, lng, title, description) {
  const marker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "custom-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    }),
  }).addTo(map);

  marker.bindPopup(`
    <div style="min-width: 200px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #202124;">${title}</h3>
      <p style="margin: 0; font-size: 14px; color: #5f6368;">${description}</p>
      <button onclick="openDirectionsTo(${lat}, ${lng}, '${title.replace(/'/g, "\\'")}')" 
              style="margin-top: 10px; padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
          Chỉ đường
      </button>
    </div>
  `);

  markers.push({ marker, lat, lng, title, description });
  return marker;
}

// Map click handler
function onMapClick(e) {
  const { lat, lng } = e.latlng;

  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then((response) => response.json())
    .then((data) => {
      const address = data.display_name || "Địa chỉ không xác định";
      showInfoPanel(`
        <h3>Vị trí đã chọn</h3>
        <p><strong>Tọa độ:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
        <p><strong>Địa chỉ:</strong> ${address}</p>
        <button onclick="addCustomMarker(${lat}, ${lng}, '${address.replace(/'/g, "\\'")}')" 
                style="margin-top: 10px; padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; width: 100%;">
            Thêm đánh dấu
        </button>
      `);
    })
    .catch(() => {
      showInfoPanel(`
        <h3>Vị trí đã chọn</h3>
        <p><strong>Tọa độ:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
      `);
    });
}

function addCustomMarker(lat, lng, address) {
  addMarker(lat, lng, "Vị trí đã lưu", address);
  closeInfoPanel();
}

// Search
function search() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  hideSuggestions();

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
    .then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        map.setView([lat, lng], 15);
        const marker = addMarker(lat, lng, result.display_name, "Kết quả tìm kiếm");
        marker.openPopup();

        showInfoPanel(`
          <h3>${result.display_name}</h3>
          <p><strong>Tọa độ:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
          <button onclick="openDirectionsTo(${lat}, ${lng}, '${result.display_name.replace(/'/g, "\\'")}')" 
                  style="margin-top: 10px; padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; width: 100%;">
              Chỉ đường đến đây
          </button>
        `);
      } else {
        alert("Không tìm thấy địa điểm");
      }
    })
    .catch(() => {
      alert("Lỗi khi tìm kiếm");
    });
}

// Search suggestions
function searchWithSuggestions(query) {
  if (!query || query.length < 3) {
    hideSuggestions();
    return;
  }

  if (searchTimeout) clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
      .then((response) => response.json())
      .then((data) => {
        showSuggestions(data);
      })
      .catch(() => {});
  }, 300);
}

function showSuggestions(results) {
  const suggestionsDiv = document.getElementById("searchSuggestions");

  if (results.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsDiv.innerHTML = results.map((result) => `
    <div class="suggestion-item" onclick="selectSuggestion(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">
      <div class="suggestion-icon">📍</div>
      <div class="suggestion-text">
        <div class="main">${result.display_name.split(",")[0]}</div>
        <div class="sub">${result.display_name}</div>
      </div>
    </div>
  `).join("");

  suggestionsDiv.classList.add("active");
}

function hideSuggestions() {
  document.getElementById("searchSuggestions").classList.remove("active");
}

function selectSuggestion(lat, lng, name) {
  document.getElementById("searchInput").value = name;
  hideSuggestions();

  map.setView([lat, lng], 15);
  const marker = addMarker(lat, lng, name, "Địa điểm đã chọn");
  marker.openPopup();

  showInfoPanel(`
    <h3>${name}</h3>
    <p><strong>Tọa độ:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
    <button onclick="openDirectionsTo(${lat}, ${lng}, '${name.replace(/'/g, "\\'")}')" 
            style="margin-top: 10px; padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; width: 100%;">
        Chỉ đường đến đây
    </button>
  `);
}

// User location
function getUserLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (userLocationMarker) {
          map.removeLayer(userLocationMarker);
        }

        userLocationMarker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: "#4285F4",
          color: "white",
          weight: 3,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map);

        const accuracy = position.coords.accuracy;
        L.circle([lat, lng], {
          radius: accuracy,
          fillColor: "#4285F4",
          fillOpacity: 0.1,
          color: "#4285F4",
          weight: 1,
        }).addTo(map);

        map.setView([lat, lng], 15);

        userLocationMarker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #202124;">Vị trí của bạn</h3>
            <p style="margin: 0; font-size: 14px; color: #5f6368;">Độ chính xác: ${Math.round(accuracy)}m</p>
          </div>
        `).openPopup();
      },
      () => {
        alert("Không thể lấy vị trí của bạn");
      }
    );
  } else {
    alert("Trình duyệt không hỗ trợ định vị");
  }
}

// Directions
function openDirectionsPanel() {
  document.getElementById("directionsPanel").classList.add("active");
  closeInfoPanel();
  const sidebar = document.getElementById("sidebar");
  if (sidebar.classList.contains("open")) {
    toggleSidebar();
  }
}

function closeDirectionsPanel() {
  document.getElementById("directionsPanel").classList.remove("active");
  clearRoute();
}

function openDirectionsTo(lat, lng, name) {
  openDirectionsPanel();
  endPoint = { lat, lng, name };
  document.getElementById("endPoint").value = name;
  closeInfoPanel();
}

function useCurrentLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        startPoint = { lat, lng, name: "Vị trí của bạn" };
        document.getElementById("startPoint").value = "Vị trí của bạn";

        if (endPoint) {
          calculateRoute();
        }
      },
      () => {
        alert("Không thể lấy vị trí của bạn");
      }
    );
  }
}

function calculateRoute() {
  if (!startPoint || !endPoint) {
    alert("Vui lòng chọn điểm xuất phát và điểm đến");
    return;
  }

  clearRoute();

  const profile = currentMode === 'car' ? 'driving' : currentMode === 'bike' ? 'cycling' : 'foot';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson&steps=true`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.routes && data.routes.length > 0) {
        displayRoute(data.routes[0]);
      } else {
        alert("Không tìm thấy đường đi");
      }
    })
    .catch(() => {
      alert("Lỗi khi tính toán đường đi");
    });
}

function displayRoute(route) {
  const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
  
  currentRoute = L.polyline(coords, {
    color: '#1a73e8',
    weight: 5,
    opacity: 0.7
  }).addTo(map);

  L.marker([startPoint.lat, startPoint.lng], {
    icon: L.divIcon({
      className: 'route-marker',
      html: '<div style="background: #34A853; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map).bindPopup(startPoint.name);

  L.marker([endPoint.lat, endPoint.lng], {
    icon: L.divIcon({
      className: 'route-marker',
      html: '<div style="background: #EA4335; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).addTo(map).bindPopup(endPoint.name);

  map.fitBounds(currentRoute.getBounds(), { padding: [50, 50] });
  displayRouteInfo(route);
}

function displayRouteInfo(route) {
  const distance = (route.distance / 1000).toFixed(2);
  const duration = Math.round(route.duration / 60);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  const timeStr = hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;

  const icons = { car: '🚗', bike: '🚴', walk: '🚶' };
  const names = { car: 'Ô tô', bike: 'Xe đạp', walk: 'Đi bộ' };
  
  let stepsHtml = '';
  if (route.legs && route.legs[0] && route.legs[0].steps) {
    stepsHtml = route.legs[0].steps.map((step, i) => {
      const dist = step.distance > 1000 
        ? `${(step.distance / 1000).toFixed(2)} km`
        : `${Math.round(step.distance)} m`;
      
      let text = step.maneuver ? getInstruction(step.maneuver) : 'Tiếp tục';
      if (step.name) text += ` vào ${step.name}`;
      
      return `
        <div class="route-step">
          <div class="step-icon">${i + 1}</div>
          <div class="step-content">
            <div class="step-instruction">${text}</div>
            <div class="step-distance">${dist}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById("directionsResults").innerHTML = `
    <div class="route-summary">
      <h4>${icons[currentMode]} ${names[currentMode]}</h4>
      <div class="route-info">
        <span>📏 ${distance} km</span>
        <span>⏱️ ${timeStr}</span>
      </div>
    </div>
    <div class="route-steps">${stepsHtml}</div>
  `;
}

function getInstruction(m) {
  const t = m.type;
  const d = m.modifier;
  
  if (t === 'depart') return 'Bắt đầu';
  if (t === 'arrive') return 'Đến nơi';
  if (t === 'turn') {
    if (d === 'left') return 'Rẽ trái';
    if (d === 'right') return 'Rẽ phải';
    if (d === 'sharp left') return 'Rẽ trái gấp';
    if (d === 'sharp right') return 'Rẽ phải gấp';
    if (d === 'slight left') return 'Rẽ trái nhẹ';
    if (d === 'slight right') return 'Rẽ phải nhẹ';
  }
  if (t === 'continue') return 'Tiếp tục';
  if (t === 'merge') return 'Nhập làn';
  if (t === 'roundabout') return 'Vào vòng xuyến';
  
  return 'Tiếp tục đi thẳng';
}

function clearRoute() {
  if (currentRoute) {
    map.removeLayer(currentRoute);
    currentRoute = null;
  }
  
  map.eachLayer((layer) => {
    if (layer.options && layer.options.icon && layer.options.icon.options.className === 'route-marker') {
      map.removeLayer(layer);
    }
  });
  
  document.getElementById("directionsResults").innerHTML = '';
}

function setTransportMode(mode) {
  currentMode = mode;
  
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
  
  if (startPoint && endPoint) {
    calculateRoute();
  }
}

// UI functions
function showInfoPanel(content) {
  document.getElementById("infoPanelContent").innerHTML = content;
  document.getElementById("infoPanel").classList.add("active");
}

function closeInfoPanel() {
  document.getElementById("infoPanel").classList.remove("active");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function changeLayer(type) {
  map.removeLayer(currentLayer);

  if (type === "satellite") {
    currentLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri" }
    ).addTo(map);
  } else if (type === "terrain") {
    currentLayer = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenTopoMap" }
    ).addTo(map);
  } else {
    currentLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap" }
    ).addTo(map);
  }

  document.getElementById("layerSelector").classList.remove("active");
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
  initMap();

  document.getElementById("searchBtn").addEventListener("click", search);
  
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") search();
  });
  searchInput.addEventListener("input", (e) => {
    searchWithSuggestions(e.target.value);
  });
  
  document.addEventListener("click", (e) => {
    if (!e.target.closest('.search-container')) {
      hideSuggestions();
    }
  });

  document.getElementById("menuBtn").addEventListener("click", toggleSidebar);
  document.getElementById("closeSidebar").addEventListener("click", toggleSidebar);
  document.getElementById("locateBtn").addEventListener("click", getUserLocation);
  document.getElementById("zoomInBtn").addEventListener("click", () => map.zoomIn());
  document.getElementById("zoomOutBtn").addEventListener("click", () => map.zoomOut());
  
  document.getElementById("layersBtn").addEventListener("click", () => {
    document.getElementById("layerSelector").classList.toggle("active");
  });

  document.querySelectorAll(".layer-option").forEach((opt) => {
    opt.addEventListener("click", function () {
      changeLayer(this.dataset.layer);
    });
  });

  document.getElementById("closeInfo").addEventListener("click", closeInfoPanel);
  document.getElementById("streetViewBtn").addEventListener("click", () => {
    alert("Chức năng Street View đang được phát triển");
  });

  document.getElementById("directionsBtn").addEventListener("click", openDirectionsPanel);
  document.getElementById("closeDirections").addEventListener("click", closeDirectionsPanel);
  document.getElementById("useCurrentLocation").addEventListener("click", useCurrentLocation);
  
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      setTransportMode(this.dataset.mode);
    });
  });
  
  const startInput = document.getElementById("startPoint");
  const endInput = document.getElementById("endPoint");
  
  startInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const q = startInput.value.trim();
      if (q) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`)
          .then(r => r.json())
          .then(d => {
            if (d.length > 0) {
              startPoint = {
                lat: parseFloat(d[0].lat),
                lng: parseFloat(d[0].lon),
                name: d[0].display_name
              };
              startInput.value = d[0].display_name;
              if (endPoint) calculateRoute();
            }
          });
      }
    }
  });
  
  endInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const q = endInput.value.trim();
      if (q) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`)
          .then(r => r.json())
          .then(d => {
            if (d.length > 0) {
              endPoint = {
                lat: parseFloat(d[0].lat),
                lng: parseFloat(d[0].lon),
                name: d[0].display_name
              };
              endInput.value = d[0].display_name;
              if (startPoint) calculateRoute();
            }
          });
      }
    }
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    alert("Chức năng lưu địa điểm đang được phát triển");
  });
});
