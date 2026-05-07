// js/map.js
console.log('Loading map.js...');

let csvLoader;
let map;
let markers = [];
let currentProjectId = null;
let legendControl = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing map...');
    
    csvLoader = new CSVLoader();
    
    try {
        // Загружаем данные
        await csvLoader.loadAll();
        await csvLoader.loadCSV('plots');
        await csvLoader.loadQC();
        
        console.log('Data loaded:', {
            developers: csvLoader.getDevelopers().length,
            projects: csvLoader.getProjects().length,
            plots: csvLoader.getPlots().length,
            qc: csvLoader.getQC().length
        });
        
        // Инициализируем карту
        initMap();
        
        // Добавляем легенду
        addLegend();
        
        // Загружаем проекты на карту
        loadProjectsOnMap();
        
        // Заполняем фильтры
        populateMapFilters();
        
        // Настраиваем поиск и фильтры
        setupMapSearch();
        setupMapFilters();
        
        // Настраиваем переключение боковой панели
        setupSidebarToggle();
        
    } catch (error) {
        console.error('Error:', error);
        showMapError(error.message);
    }
});

function showMapError(message) {
    document.getElementById('map').innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
            <div style="text-align: center; color: red;">
                <h3>Error loading map data</h3>
                <p>${message}</p>
            </div>
        </div>
    `;
}

function initMap() {
    // Центр карты - Саудовская Аравия
    map = L.map('map').setView([24.0, 45.0], 6);
    
    // Добавляем слой OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

function addLegend() {
    // Создаем легенду
    const LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function(map) {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <h4>Project Status</h4>
                <div class="legend-item">
                    <span class="legend-dot ready"></span>
                    <span>Ready</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot ongoing"></span>
                    <span>Ongoing</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot planned"></span>
                    <span>Planned</span>
                </div>
            `;
            return div;
        }
    });
    
    legendControl = new LegendControl();
    legendControl.addTo(map);
}

function loadProjectsOnMap(filteredPlots = null) {
    // Очищаем существующие маркеры
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Получаем данные
    const plots = filteredPlots || csvLoader.getPlotsWithLocation();
    const projects = csvLoader.getProjects();
    
    console.log(`Loading ${plots.length} projects on map`);
    
    // Обновляем счетчик
    document.getElementById('projectsOnMap').textContent = plots.length;
    
    // Создаем маркеры
    const projectMarkers = [];
    
    plots.forEach(plot => {
        const coords = extractCoordinates(plot.Location_Gmaps);
        if (!coords) return;
        
        const project = projects.find(p => p.project_id === plot.project_id);
        if (!project) return;
        
        const marker = createMarker(coords, project, plot);
        marker.projectId = project.project_id;
        
        markers.push(marker);
        projectMarkers.push({
            project: project,
            plot: plot,
            marker: marker
        });
    });
    
    // Добавляем все маркеры на карту
    markers.forEach(marker => marker.addTo(map));
    
    // Отображаем список проектов в боковой панели
    updateProjectList(projectMarkers);
    
    // Подгоняем карту под маркеры
    if (projectMarkers.length > 0) {
        const allCoords = projectMarkers.map(p => p.marker.getLatLng());
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function extractCoordinates(gmapsUrl) {
    if (!gmapsUrl) return null;
    
    try {
        let coords = null;
        
        // Формат: https://maps.app.goo.gl/xxx
        if (gmapsUrl.includes('maps.app.goo.gl') || gmapsUrl.includes('goo.gl/maps')) {
            const match = gmapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (match) {
                coords = { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
            }
        }
        
        // Формат: https://www.google.com/maps?q=lat,lng
        const mapsMatch = gmapsUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (mapsMatch) {
            coords = { lat: parseFloat(mapsMatch[1]), lng: parseFloat(mapsMatch[2]) };
        }
        
        // Формат: https://www.google.com/maps/place/.../@lat,lng,zoom
        const placeMatch = gmapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)/);
        if (placeMatch) {
            coords = { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
        }
        
        // Проверяем что координаты в Саудовской Аравии
        if (coords && coords.lat > 15 && coords.lat < 35 && coords.lng > 30 && coords.lng < 60) {
            return coords;
        }
        
        return null;
    } catch (error) {
        console.warn('Could not parse coordinates from:', gmapsUrl);
        return null;
    }
}

function createMarker(coords, project, plot) {
    // Определяем цвет точки по статусу
    let markerColor = '#3498db'; // planned - blue
    if (project.Status === 'ready') markerColor = '#27ae60'; // green
    if (project.Status === 'ongoing') markerColor = '#f39c12'; // orange
    
    // Создаем круглый маркер-точку
    const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    });
    
    // Добавляем эффект при наведении
    marker.on('mouseover', function() {
        this.setRadius(12);
        this.setStyle({
            fillOpacity: 1,
            weight: 3
        });
    });
    
    marker.on('mouseout', function() {
        this.setRadius(8);
        this.setStyle({
            fillOpacity: 0.9,
            weight: 2
        });
    });
    
    // Добавляем попап с информацией
    const developer = csvLoader.getDeveloperById(project.developer_id);
    const developerName = developer ? developer.Name_EN : 'Unknown';
    
    marker.bindPopup(`
        <div class="map-popup">
            <h3>${project.Project_name_EN || 'Unnamed Project'}</h3>
            ${project.Project_name_SA ? `<p style="font-size: 14px; color: #2c3e50;">${project.Project_name_SA}</p>` : ''}
            <p><strong>Developer:</strong> ${developerName}</p>
            <p><strong>Type:</strong> ${project.Type || 'N/A'}</p>
            <p><strong>Status:</strong> ${project.Status || 'N/A'}</p>
            <button class="btn btn-small" onclick="showProjectDetailsOnMap(${project.project_id})">
                View Details
            </button>
        </div>
    `);
    
    // При клике на маркер показываем детали в боковой панели
    marker.on('click', function() {
        highlightProjectInList(project.project_id);
    });
    
    return marker;
}

function updateProjectList(projectMarkers) {
    const container = document.getElementById('sidebarProjectsList');
    
    if (projectMarkers.length === 0) {
        container.innerHTML = '<div class="no-projects">No projects found</div>';
        return;
    }
    
    // Сортируем по имени проекта
    projectMarkers.sort((a, b) => {
        const nameA = (a.project.Project_name_EN || '').toLowerCase();
        const nameB = (b.project.Project_name_EN || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    const developers = csvLoader.getDevelopers();
    
    container.innerHTML = projectMarkers.map(({ project }) => {
        const developer = developers.find(d => d.id === project.developer_id);
        const developerName = developer ? developer.Name_EN : 'Unknown';
        const statusColor = getStatusColor(project.Status);
        
        return `
            <div class="project-item" 
                 data-project-id="${project.project_id}"
                 onclick="focusProject(${project.project_id})">
                <div class="project-name">
                    <span class="status-dot" style="background-color: ${statusColor};"></span>
                    ${project.Project_name_EN || 'Unnamed'}
                </div>
                <div class="project-info">
                    ${project.Type || 'N/A'} · 
                    <span style="color: ${statusColor}; font-weight: 600;">${project.Status || 'N/A'}</span>
                </div>
                <div class="project-developer">${developerName}</div>
            </div>
        `;
    }).join('');
}

function highlightProjectInList(projectId) {
    // Убираем выделение со всех
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Выделяем нужный
    const item = document.querySelector(`[data-project-id="${projectId}"]`);
    if (item) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    currentProjectId = projectId;
}

function focusProject(projectId) {
    // Находим маркер проекта
    const marker = markers.find(m => m.projectId === projectId);
    
    if (marker) {
        // Центрируем карту на маркере
        map.setView(marker.getLatLng(), 15, {
            animate: true,
            duration: 0.5
        });
        
        // Открываем попап
        marker.openPopup();
        
        // Подсвечиваем в списке
        highlightProjectInList(projectId);
    }
}

function populateMapFilters() {
    const types = csvLoader.getProjectTypes();
    const typeFilter = document.getElementById('mapTypeFilter');
    
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

function setupMapSearch() {
    document.getElementById('mapSearch').addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        
        if (query) {
            const plots = csvLoader.getPlotsWithLocation();
            const projects = csvLoader.getProjects();
            
            const filteredPlots = plots.filter(plot => {
                const project = projects.find(p => p.project_id === plot.project_id);
                if (!project) return false;
                
                const nameEN = (project.Project_name_EN || '').toLowerCase();
                const nameSA = (project.Project_name_SA || '');
                const id = String(project.project_id || '');
                const developer = csvLoader.getDeveloperById(project.developer_id);
                const devName = developer ? (developer.Name_EN || '').toLowerCase() : '';
                
                return nameEN.includes(query) || 
                       nameSA.includes(query) || 
                       id.includes(query) ||
                       devName.includes(query);
            });
            
            loadProjectsOnMap(filteredPlots);
        } else {
            loadProjectsOnMap();
        }
    });
}

function setupMapFilters() {
    const applyFilters = () => {
        const statusFilter = document.getElementById('mapStatusFilter').value;
        const typeFilter = document.getElementById('mapTypeFilter').value;
        
        let plots = csvLoader.getPlotsWithLocation();
        const projects = csvLoader.getProjects();
        
        if (statusFilter || typeFilter) {
            plots = plots.filter(plot => {
                const project = projects.find(p => p.project_id === plot.project_id);
                if (!project) return false;
                
                if (statusFilter && project.Status?.toLowerCase() !== statusFilter) return false;
                if (typeFilter && project.Type !== typeFilter) return false;
                
                return true;
            });
        }
        
        loadProjectsOnMap(plots);
    };
    
    document.getElementById('mapStatusFilter').addEventListener('change', applyFilters);
    document.getElementById('mapTypeFilter').addEventListener('change', applyFilters);
}

function setupSidebarToggle() {
    const sidebar = document.getElementById('mapSidebar');
    const toggle = document.getElementById('sidebarToggle');
    
    if (toggle && sidebar) {
        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
            
            // Обновляем размер карты после анимации
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        });
    }
}

function getStatusColor(status) {
    switch ((status || '').toLowerCase()) {
        case 'ready': return '#27ae60';
        case 'ongoing': return '#f39c12';
        case 'planned': return '#3498db';
        default: return '#95a5a6';
    }
}

function showProjectDetailsOnMap(projectId) {
    // Открываем страницу проектов с фильтром по ID
    window.open(`projects.html?project=${projectId}`, '_blank');
}

// Закрытие модального окна
document.addEventListener('click', function(event) {
    const modal = document.getElementById('projectModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('projectModal');
        if (modal) modal.style.display = 'none';
    }
});