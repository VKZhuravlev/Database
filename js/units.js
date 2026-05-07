// js/units.js
console.log('Loading units.js...');

let csvLoader;
let currentFilters = {
    project: '',
    br: '',
    type: ''
};

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing units page...');
    
    csvLoader = new CSVLoader();
    
    try {
        // Загружаем все данные
        await csvLoader.loadAll();
        await csvLoader.loadCSV('units');
        
        console.log('Data loaded:', {
            developers: csvLoader.getDevelopers().length,
            projects: csvLoader.getProjects().length,
            units: csvLoader.getUnits().length
        });
        
        // Заполняем фильтры
        populateFilters();
        
        // Отображаем units
        loadUnits();
        
        // Настраиваем фильтры
        setupFilters();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
});

function showError(message) {
    document.getElementById('unitsBody').innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; color: red; padding: 20px;">
                <strong>Error loading data</strong><br>
                ${message}
            </td>
        </tr>
    `;
}

function populateFilters() {
    // Заполняем фильтр проектов
    const projects = csvLoader.getProjects();
    const projectFilter = document.getElementById('projectFilter');
    
    projects
        .sort((a, b) => (a.Project_name_EN || '').localeCompare(b.Project_name_EN || ''))
        .forEach(project => {
            if (csvLoader.getUnitsByProject(project.project_id).length > 0) {
                const option = document.createElement('option');
                option.value = project.project_id;
                option.textContent = `${project.Project_name_EN || 'Unnamed'} (ID: ${project.project_id})`;
                projectFilter.appendChild(option);
            }
        });
    
    // Заполняем фильтр типов проектов
    const types = csvLoader.getProjectTypes();
    const typeFilter = document.getElementById('typeFilter');
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

function getFilteredUnits() {
    let units = csvLoader.getUnits();
    
    // Фильтр по проекту
    if (currentFilters.project) {
        const projectId = parseInt(currentFilters.project);
        units = units.filter(u => u.project_id === projectId);
    }
    
    // Фильтр по количеству спален
    if (currentFilters.br) {
        const brValue = parseInt(currentFilters.br);
        if (brValue >= 4) {
            units = units.filter(u => u.BR >= 4);
        } else {
            units = units.filter(u => u.BR === brValue);
        }
    }
    
    // Фильтр по типу проекта
    if (currentFilters.type) {
        const projects = csvLoader.getProjects();
        const projectIds = projects
            .filter(p => p.Type === currentFilters.type)
            .map(p => p.project_id);
        
        units = units.filter(u => projectIds.includes(u.project_id));
    }
    
    return units;
}

function loadUnits() {
    const units = getFilteredUnits();
    const projects = csvLoader.getProjects();
    const developers = csvLoader.getDevelopers();
    
    // Обновляем статистику
    updateStats(units);
    
    if (units.length === 0) {
        document.getElementById('unitsBody').innerHTML = 
            '<tr><td colspan="8" style="text-align: center;">No units found</td></tr>';
        return;
    }
    
    // Сортируем по цене за метр (сначала с ценой, потом без)
    units.sort((a, b) => {
        const priceA = a.Sqm_price || 0;
        const priceB = b.Sqm_price || 0;
        return priceB - priceA;
    });
    
    const html = units.map(unit => {
        const project = projects.find(p => p.project_id === unit.project_id);
        const developer = project ? developers.find(d => d.id === project.developer_id) : null;
        
        const projectName = project ? project.Project_name_EN : 'Unknown';
        const developerName = developer ? developer.Name_EN : 'Unknown';
        const developerId = developer ? developer.id : null;
        
        return `
            <tr>
                <td>${unit.project_id || '-'}</td>
                <td>
                    <a href="projects.html?project=${unit.project_id}" class="project-link" title="View project details">
                        ${projectName}
                    </a>
                </td>
                <td>
                    <a href="index.html?developer=${developerId}" class="developer-link" title="View developer details">
                        ${developerName}
                    </a>
                </td>
                <td class="area-cell">${unit.Area ? unit.Area + ' m²' : '-'}</td>
                <td class="floor-cell">
                    ${unit.BR ? `<span class="br-badge">${unit.BR} BR</span>` : '-'}
                </td>
                <td class="floor-cell">${unit.Floor ? 'Floor ' + unit.Floor : 'N/A'}</td>
                <td class="price-cell">${formatPrice(unit.Total_price)}</td>
                <td class="price-per-sqm">${unit.Sqm_price ? formatPrice(unit.Sqm_price) + '/m²' : '-'}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('unitsBody').innerHTML = html;
}

function updateStats(units) {
    // Фильтруем только юниты с данными
    const unitsWithPrice = units.filter(u => u.Total_price && u.Total_price > 0);
    const unitsWithSqmPrice = units.filter(u => u.Sqm_price && u.Sqm_price > 0);
    const unitsWithArea = units.filter(u => u.Area && u.Area > 0);
    
    // Обновляем Total Units
    document.getElementById('statTotal').textContent = units.length;
    
    // Avg Price
    if (unitsWithPrice.length > 0) {
        const avgPrice = unitsWithPrice.reduce((sum, u) => sum + u.Total_price, 0) / unitsWithPrice.length;
        document.getElementById('statAvgPrice').textContent = formatPrice(avgPrice);
    } else {
        document.getElementById('statAvgPrice').textContent = '-';
    }
    
    // Avg Price/m²
    if (unitsWithSqmPrice.length > 0) {
        const avgSqm = unitsWithSqmPrice.reduce((sum, u) => sum + u.Sqm_price, 0) / unitsWithSqmPrice.length;
        document.getElementById('statAvgSqm').textContent = formatPrice(avgSqm) + '/m²';
    } else {
        document.getElementById('statAvgSqm').textContent = '-';
    }
    
    // Avg Area
    if (unitsWithArea.length > 0) {
        const avgArea = unitsWithArea.reduce((sum, u) => sum + u.Area, 0) / unitsWithArea.length;
        document.getElementById('statAvgArea').textContent = Math.round(avgArea) + ' m²';
    } else {
        document.getElementById('statAvgArea').textContent = '-';
    }
}

function setupFilters() {
    // Поиск по тексту
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        
        if (query) {
            const units = getFilteredUnits();
            const projects = csvLoader.getProjects();
            
            const filtered = units.filter(unit => {
                const project = projects.find(p => p.project_id === unit.project_id);
                if (!project) return false;
                
                const projectName = (project.Project_name_EN || '').toLowerCase();
                const projectId = String(unit.project_id || '');
                const developer = csvLoader.getDeveloperById(project.developer_id);
                const developerName = developer ? (developer.Name_EN || '').toLowerCase() : '';
                
                return projectName.includes(query) || 
                       projectId.includes(query) ||
                       developerName.includes(query);
            });
            
            displayUnits(filtered);
        } else {
            loadUnits();
        }
    });
    
    // Фильтр по проекту
    document.getElementById('projectFilter').addEventListener('change', function(e) {
        currentFilters.project = e.target.value;
        loadUnits();
    });
    
    // Фильтр по спальням
    document.getElementById('brFilter').addEventListener('change', function(e) {
        currentFilters.br = e.target.value;
        loadUnits();
    });
    
    // Фильтр по типу проекта
    document.getElementById('typeFilter').addEventListener('change', function(e) {
        currentFilters.type = e.target.value;
        loadUnits();
    });
}

function displayUnits(units) {
    // Обновляем статистику
    updateStats(units);
    
    if (units.length === 0) {
        document.getElementById('unitsBody').innerHTML = 
            '<tr><td colspan="8" style="text-align: center;">No matching units</td></tr>';
        return;
    }
    
    const projects = csvLoader.getProjects();
    const developers = csvLoader.getDevelopers();
    
    const html = units.map(unit => {
        const project = projects.find(p => p.project_id === unit.project_id);
        const developer = project ? developers.find(d => d.id === project.developer_id) : null;
        const developerId = developer ? developer.id : null;
        
        return `
            <tr>
                <td>${unit.project_id || '-'}</td>
                <td>
                    <a href="projects.html?project=${unit.project_id}" class="project-link" title="View project details">
                        ${project ? project.Project_name_EN : 'Unknown'}
                    </a>
                </td>
                <td>
                    <a href="index.html?developer=${developerId}" class="developer-link" title="View developer details">
                        ${developer ? developer.Name_EN : 'Unknown'}
                    </a>
                </td>
                <td class="area-cell">${unit.Area ? unit.Area + ' m²' : '-'}</td>
                <td class="floor-cell">
                    ${unit.BR ? `<span class="br-badge">${unit.BR} BR</span>` : '-'}
                </td>
                <td class="floor-cell">${unit.Floor ? 'Floor ' + unit.Floor : 'N/A'}</td>
                <td class="price-cell">${formatPrice(unit.Total_price)}</td>
                <td class="price-per-sqm">${unit.Sqm_price ? formatPrice(unit.Sqm_price) + '/m²' : '-'}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('unitsBody').innerHTML = html;
}

function formatPrice(price) {
    if (!price && price !== 0) return '-';
    
    if (price >= 1000000) {
        return (price / 1000000).toFixed(2) + 'M SAR';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(0) + 'K SAR';
    }
    
    return price.toLocaleString() + ' SAR';
}