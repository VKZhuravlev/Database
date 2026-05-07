// js/projects.js
console.log('Loading projects.js...');

let csvLoader;
let currentFilters = {
    status: '',
    type: '',
    developer: ''
};

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing projects page...');
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');

    if (projectId) {
        // Небольшая задержка чтобы данные загрузились
        setTimeout(() => {
            showProjectDetails(parseInt(projectId));
        }, 500);
    }
    
    csvLoader = new CSVLoader();
    
    try {
        // Загружаем основные данные
        await csvLoader.loadAll();
        
        // Загружаем Qualitative Characteristics отдельно
        await csvLoader.loadQC();
        
        console.log('Data loaded:', {
            developers: csvLoader.getDevelopers().length,
            projects: csvLoader.getProjects().length,
            qualitativeCharacteristics: csvLoader.getQC().length
        });
        
        // Заполняем фильтры
        populateFilters();
        
        // Отображаем проекты
        loadProjects();
        
        // Настраиваем поиск и фильтры
        setupSearch();
        setupFilters();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
});

function showError(message) {
    document.getElementById('projectsBody').innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; color: red; padding: 20px;">
                <strong>Error loading data</strong><br>
                ${message}
            </td>
        </tr>
    `;
}

function populateFilters() {
    // Заполняем фильтр типов
    const types = csvLoader.getProjectTypes();
    const typeFilter = document.getElementById('typeFilter');
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
    
    // Заполняем фильтр девелоперов
    const developers = csvLoader.getDevelopers();
    const developerFilter = document.getElementById('developerFilter');
    developers
        .sort((a, b) => (a.Name_EN || '').localeCompare(b.Name_EN || ''))
        .forEach(dev => {
            const option = document.createElement('option');
            option.value = dev.id;
            option.textContent = dev.Name_EN || `Developer ${dev.id}`;
            developerFilter.appendChild(option);
        });
}

function getFilteredProjects() {
    let projects = csvLoader.getProjects();
    
    if (currentFilters.status) {
        projects = projects.filter(p => p.Status && p.Status.toLowerCase() === currentFilters.status);
    }
    
    if (currentFilters.type) {
        projects = projects.filter(p => p.Type === currentFilters.type);
    }
    
    if (currentFilters.developer) {
        projects = projects.filter(p => p.developer_id === parseInt(currentFilters.developer));
    }
    
    return projects;
}

function loadProjects() {
    const projects = getFilteredProjects();
    
    document.getElementById('totalCount').textContent = projects.length;
    
    if (projects.length === 0) {
        document.getElementById('projectsBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center;">No projects found</td></tr>';
        return;
    }
    
    const html = projects.map(project => {
        const developerName = csvLoader.getDeveloperName(project.developer_id);
        
        return `
            <tr>
                <td>${project.project_id || '-'}</td>
                <td>${project.Project_name_EN || '-'}</td>
                <td class="arabic-text">${project.Project_name_SA || '-'}</td>
                <td>${developerName}</td>
                <td>
                    <span class="badge badge-type">${project.Type || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge badge-status status-${(project.Status || '').toLowerCase()}">
                        ${project.Status || 'N/A'}
                    </span>
                </td>
                <td>
                    <button class="btn" onclick="showProjectDetails(${project.project_id})">
                        Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('projectsBody').innerHTML = html;
}

function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        
        if (query) {
            const projects = getFilteredProjects();
            const filtered = projects.filter(p => {
                const nameEN = (p.Project_name_EN || '').toLowerCase();
                const nameSA = (p.Project_name_SA || '');
                const id = String(p.project_id || '');
                const devName = csvLoader.getDeveloperName(p.developer_id).toLowerCase();
                
                return nameEN.includes(query) || 
                       nameSA.includes(query) || 
                       id.includes(query) ||
                       devName.includes(query);
            });
            
            displayProjects(filtered);
        } else {
            loadProjects();
        }
    });
}

function setupFilters() {
    document.getElementById('statusFilter').addEventListener('change', function(e) {
        currentFilters.status = e.target.value;
        loadProjects();
    });
    
    document.getElementById('typeFilter').addEventListener('change', function(e) {
        currentFilters.type = e.target.value;
        loadProjects();
    });
    
    document.getElementById('developerFilter').addEventListener('change', function(e) {
        currentFilters.developer = e.target.value;
        loadProjects();
    });
}

function displayProjects(projects) {
    document.getElementById('totalCount').textContent = projects.length;
    
    if (projects.length === 0) {
        document.getElementById('projectsBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center;">No matching projects</td></tr>';
        return;
    }
    
    const html = projects.map(project => {
        const developerName = csvLoader.getDeveloperName(project.developer_id);
        
        return `
            <tr>
                <td>${project.project_id || '-'}</td>
                <td>${project.Project_name_EN || '-'}</td>
                <td class="arabic-text">${project.Project_name_SA || '-'}</td>
                <td>${developerName}</td>
                <td>
                    <span class="badge badge-type">${project.Type || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge badge-status status-${(project.Status || '').toLowerCase()}">
                        ${project.Status || 'N/A'}
                    </span>
                </td>
                <td>
                    <button class="btn" onclick="showProjectDetails(${project.project_id})">
                        Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('projectsBody').innerHTML = html;
}

function showProjectDetails(projectId) {
    const project = csvLoader.getProjectById(projectId);
    
    if (!project) {
        alert('Project not found');
        return;
    }
    
    const qcData = csvLoader.getQCByProject(projectId);
    const developerName = csvLoader.getDeveloperName(project.developer_id);
    
    let html = `
        <h2>${project.Project_name_EN || 'Unnamed Project'}</h2>
        ${project.Project_name_SA ? `<p class="arabic-text">${project.Project_name_SA}</p>` : ''}
        
        <div class="detail-tabs">
            <button class="tab-btn active" onclick="switchTab('general', this)">General Info</button>
            <button class="tab-btn" onclick="switchTab('qc', this)">Qualitative Characteristics</button>
        </div>
        
        <div id="tab-general" class="tab-content active">
            <div class="detail-section">
                <h3>Project Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Project ID</strong>
                        <span>${project.project_id || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Developer</strong>
                        <span>${developerName}</span>
                    </div>
                    <div class="info-item">
                        <strong>Type</strong>
                        <span>${project.Type || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Status</strong>
                        <span class="badge badge-status status-${(project.Status || '').toLowerCase()}">
                            ${project.Status || 'N/A'}
                        </span>
                    </div>
                    ${project.website ? `
                        <div class="info-item">
                            <strong>Website</strong>
                            <a href="${project.website}" target="_blank">Visit Website →</a>
                        </div>
                    ` : ''}
                    ${project.brochure ? `
                        <div class="info-item">
                            <strong>Brochure</strong>
                            <a href="${project.brochure}" target="_blank">Download PDF →</a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div id="tab-qc" class="tab-content">
            <div class="detail-section">
                <h3>Qualitative Characteristics</h3>
                ${qcData ? `
                    <div class="info-grid">
                        ${qcData.GFA ? `
                            <div class="info-item">
                                <strong>Gross Floor Area (GFA)</strong>
                                <span>${qcData.GFA.toLocaleString()} m²</span>
                            </div>
                        ` : ''}
                        ${qcData.NSA ? `
                            <div class="info-item">
                                <strong>Net Saleable Area (NSA)</strong>
                                <span>${qcData.NSA.toLocaleString()} m²</span>
                            </div>
                        ` : ''}
                        ${qcData.Floors ? `
                            <div class="info-item">
                                <strong>Number of Floors</strong>
                                <span>${qcData.Floors}</span>
                            </div>
                        ` : ''}
                        ${qcData.Units ? `
                            <div class="info-item">
                                <strong>Total Units</strong>
                                <span>${qcData.Units.toLocaleString()}</span>
                            </div>
                        ` : ''}
                        ${qcData.Average_unit_area ? `
                            <div class="info-item">
                                <strong>Average Unit Area</strong>
                                <span>${qcData.Average_unit_area} m²</span>
                            </div>
                        ` : ''}
                        ${qcData.Start_of_sales ? `
                            <div class="info-item">
                                <strong>Start of Sales</strong>
                                <span>${formatDate(qcData.Start_of_sales)}</span>
                            </div>
                        ` : ''}
                        ${qcData.End_of_sales ? `
                            <div class="info-item">
                                <strong>End of Sales</strong>
                                <span>${formatDate(qcData.End_of_sales)}</span>
                            </div>
                        ` : ''}
                        ${qcData.Handover ? `
                            <div class="info-item">
                                <strong>Handover Date</strong>
                                <span>${formatDate(qcData.Handover)}</span>
                            </div>
                        ` : ''}
                        ${qcData.percent_of_sold != null ? `
                            <div class="info-item">
                                <strong>Percentage Sold</strong>
                                <span style="font-size: 1.3em; font-weight: bold; color: ${qcData.percent_of_sold >= 80 ? '#27ae60' : qcData.percent_of_sold >= 50 ? '#f39c12' : '#e74c3c'}">
                                    ${qcData.percent_of_sold}%
                                </span>
                            </div>
                        ` : ''}
                    </div>
                ` : '<p style="padding: 20px; text-align: center; color: #999;">No qualitative characteristics data available for this project</p>'}
            </div>
        </div>
    `;
    
    document.getElementById('projectDetails').innerHTML = html;
    document.getElementById('projectModal').style.display = 'block';
}

function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

// Закрытие модального окна
document.addEventListener('click', function(event) {
    const modal = document.getElementById('projectModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.getElementById('projectModal').style.display = 'none';
    }
});

document.querySelector('.close')?.addEventListener('click', function() {
    document.getElementById('projectModal').style.display = 'none';
});