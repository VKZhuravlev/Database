// js/main.js
console.log('Loading main.js...');

let csvLoader;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    const urlParams = new URLSearchParams(window.location.search);
    const developerId = urlParams.get('developer');

    if (developerId) {
        setTimeout(() => {
            showDeveloperDetails(parseInt(developerId));
        }, 500);
    }
    csvLoader = new CSVLoader();
    
    try {
        await csvLoader.loadAll();
        
        console.log('Data loaded:', {
            developers: csvLoader.getDevelopers().length,
            projects: csvLoader.getProjects().length,
            financial: csvLoader.getFinancial().length
        });
        
        // Отображаем разработчиков
        loadDevelopers();
        setupSearch();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
});

function showError(message) {
    document.getElementById('developersBody').innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; color: red; padding: 20px;">
                <strong>Error loading data</strong><br>
                ${message}<br><br>
                <small>
                    Check browser console (F12) for details.<br>
                    Make sure CSV files are in the 'data' folder.
                </small>
            </td>
        </tr>
    `;
}

function loadDevelopers(developers = null) {
    const devs = developers || csvLoader.getDevelopers();
    
    document.getElementById('totalCount').textContent = devs.length;
    
    if (devs.length === 0) {
        document.getElementById('developersBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center;">No developers found</td></tr>';
        return;
    }
    
    const html = devs.map(dev => {
        const id = dev.id || '-';
        const nameEN = dev.Name_EN || '-';
        const nameSA = dev.Name_SA || '-';
        const headquarters = dev.Headquarters || '-';
        const employees = dev.Number_of_employees || '-';
        const projectsCount = countProjects(dev);
        
        return `
            <tr>
                <td>${id}</td>
                <td>${nameEN}</td>
                <td class="arabic-text">${nameSA}</td>
                <td>${headquarters}</td>
                <td>${employees}</td>
                <td>${projectsCount}</td>
                <td>
                    <button class="btn" onclick="showDeveloperDetails(${id})">
                        Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('developersBody').innerHTML = html;
}

function countProjects(dev) {
    const projects = csvLoader.getProjects();
    const devId = dev.id || dev.ID;
    
    return projects.filter(p => p.developer_id === devId).length;
}

function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        
        if (query) {
            const devs = csvLoader.getDevelopers();
            const filtered = devs.filter(d => {
                const name = (d.Name_EN || '').toLowerCase();
                const nameSA = (d.Name_SA || '');
                const id = String(d.id || '');
                return name.includes(query) || nameSA.includes(query) || id.includes(query);
            });
            loadDevelopers(filtered);
        } else {
            loadDevelopers();
        }
    });
}

function showDeveloperDetails(devId) {
    const developer = csvLoader.getDeveloperById(devId);
    
    if (!developer) {
        alert('Developer not found');
        return;
    }
    
    const projects = csvLoader.getProjectsByDeveloper(devId);
    const financial = csvLoader.getFinancialByDeveloper(devId);
    
    // Группируем финансовые данные по годам
    const financialByYear = {};
    financial.forEach(f => {
        const key = f.year;
        if (!financialByYear[key]) {
            financialByYear[key] = [];
        }
        financialByYear[key].push(f);
    });
    
    const html = `
        <h2>${developer.Name_EN || 'Unnamed Developer'}</h2>
        ${developer.Name_SA ? `<p class="arabic-text">${developer.Name_SA}</p>` : ''}
        
        <div class="detail-section">
            <h3>General Information</h3>
            <div class="info-grid">
                ${developer.Website ? `
                    <div class="info-item">
                        <strong>Website:</strong> 
                        <a href="${developer.Website}" target="_blank">${developer.Website}</a>
                    </div>
                ` : ''}
                ${developer.Rega_license ? `
                    <div class="info-item">
                        <strong>License:</strong> ${developer.Rega_license}
                    </div>
                ` : ''}
                ${developer.Headquarters ? `
                    <div class="info-item">
                        <strong>Headquarters:</strong> ${developer.Headquarters}
                    </div>
                ` : ''}
                ${developer.Number_of_employees ? `
                    <div class="info-item">
                        <strong>Employees:</strong> ${developer.Number_of_employees}
                    </div>
                ` : ''}
                ${developer.Cities ? `
                    <div class="info-item">
                        <strong>Cities:</strong> ${typeof developer.Cities === 'string' ? developer.Cities : developer.Cities}
                    </div>
                ` : ''}
                ${developer.Sales_office_Gmaps ? `
                    <div class="info-item">
                        <strong>Office Location:</strong> 
                        <a href="${developer.Sales_office_Gmaps}" target="_blank">📍 View on Google Maps</a>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Projects (${projects.length})</h3>
            ${projects.length > 0 ? `
                <div class="projects-list">
                    ${projects.map(p => `
                        <div class="project-card">
                            <h4>${p.Project_name_EN || 'Unnamed Project'}</h4>
                            ${p.Project_name_SA ? `<p class="arabic-text">${p.Project_name_SA}</p>` : ''}
                            <div class="project-meta">
                                <span class="badge badge-type">${p.Type || 'N/A'}</span>
                                <span class="badge badge-status status-${(p.Status || '').toLowerCase()}">${p.Status || 'N/A'}</span>
                            </div>
                            ${p.website ? `
                                <a href="${p.website}" target="_blank" class="btn btn-small">Visit Website</a>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p>No projects found for this developer</p>'}
        </div>
        
        <div class="detail-section">
            <h3>Financial Performance</h3>
            ${Object.keys(financialByYear).length > 0 ? `
                <div class="table-responsive">
                    <table class="financial-table">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Period</th>
                                <th>Revenue</th>
                                <th>Net Profit</th>
                                <th>Total Assets</th>
                                <th>Total Liabilities</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(financialByYear).sort().reverse().map(year => 
                                financialByYear[year].map(f => `
                                    <tr>
                                        <td>${f.year}</td>
                                        <td>${f.quarter ? 'Q' + f.quarter : 'Annual'}</td>
                                        <td>${formatCurrency(f.Revenue)}</td>
                                        <td style="color: ${f.Net_profit >= 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                                            ${formatCurrency(f.Net_profit)}
                                        </td>
                                        <td>${formatCurrency(f.Total_assets)}</td>
                                        <td>${formatCurrency(f.Total_liabilities)}</td>
                                    </tr>
                                `).join('')
                            ).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>No financial data available</p>'}
        </div>
    `;
    
    document.getElementById('developerDetails').innerHTML = html;
    document.getElementById('developerModal').style.display = 'block';
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return 'N/A';
    
    if (Math.abs(amount) >= 1000000000) {
        return (amount / 1000000000).toFixed(2) + 'B SAR';
    } else if (Math.abs(amount) >= 1000000) {
        return (amount / 1000000).toFixed(2) + 'M SAR';
    } else if (Math.abs(amount) >= 1000) {
        return (amount / 1000).toFixed(0) + 'K SAR';
    }
    
    return amount.toLocaleString() + ' SAR';
}

// Закрытие модального окна
document.addEventListener('click', function(event) {
    const modal = document.getElementById('developerModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.getElementById('developerModal').style.display = 'none';
    }
});

// Закрытие по кнопке
document.querySelector('.close')?.addEventListener('click', function() {
    document.getElementById('developerModal').style.display = 'none';
});