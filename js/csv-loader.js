// js/csv-loader.js
console.log('Loading csv-loader.js...');

class CSVLoader {
    constructor() {
        this.data = {};
        this.basePath = 'data/';
    }

    async loadAll() {
        const sheets = ['developers', 'projects', 'financial'];
        
        for (const sheet of sheets) {
            try {
                await this.loadCSV(sheet);
                console.log(`Loaded ${sheet}:`, this.data[sheet]?.length, 'records');
            } catch (error) {
                console.error(`Failed to load ${sheet}:`, error);
                this.data[sheet] = [];
            }
        }
        
        return true;
    }

    async loadQC() {
        try {
            await this.loadCSV('qc');
            console.log('Loaded qc:', this.data.qc?.length, 'records');
        } catch (error) {
            console.warn('QC data not available:', error.message);
            this.data.qc = [];
        }
        return this.data.qc;
    }

    async loadCSV(fileName) {
        console.log(`Fetching ${this.basePath}${fileName}.csv...`);
        
        const response = await fetch(`${this.basePath}${fileName}.csv`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${fileName}.csv`);
        }
        
        const text = await response.text();
        console.log(`Got ${fileName}.csv, length:`, text.length);
        
        this.data[fileName] = this.parseCSV(text);
        
        return this.data[fileName];
    }

    parseCSV(text) {
        // Убираем BOM
        text = text.replace(/^\uFEFF/, '');
        
        // Разбиваем на строки
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 1) {
            console.warn('CSV file is empty');
            return [];
        }
        
        // Определяем разделитель (запятая или точка с запятой)
        const firstLine = lines[0];
        const delimiter = this.detectDelimiter(firstLine);
        console.log('Detected delimiter:', delimiter === ';' ? 'semicolon (;)' : 'comma (,)');
        
        // Парсим заголовки с правильным разделителем
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        console.log('Headers:', headers);
        
        const result = [];
        
        // Парсим данные
        for (let i = 1; i < lines.length; i++) {
            const values = this.splitCSVLine(lines[i], delimiter);
            
            if (values.length === 0) continue;
            
            const obj = {};
            
            headers.forEach((header, index) => {
                let value = values[index] || '';
                
                // Очищаем значение
                value = value.trim().replace(/^"|"$/g, '');
                
                // Конвертируем в число если возможно
                if (value !== '' && !isNaN(value) && value !== 'null' && value !== 'NaN') {
                    value = Number(value);
                }
                
                // Пустые строки делаем null
                if (value === '' || value === undefined || value === 'null' || value === 'NaN') {
                    value = null;
                }
                
                obj[header] = value;
            });
            
            result.push(obj);
        }
        
        console.log(`Parsed ${result.length} records`);
        if (result.length > 0) {
            console.log('First record:', result[0]);
        }
        
        return result;
    }

    detectDelimiter(firstLine) {
        // Считаем количество точек с запятой и запятых
        const semicolons = (firstLine.match(/;/g) || []).length;
        const commas = (firstLine.match(/,/g) || []).length;
        
        // Используем тот разделитель, которого больше
        return semicolons > commas ? ';' : ',';
    }

    splitCSVLine(line, delimiter = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    // ========== Методы для получения данных ==========
    
    getDevelopers() {
        return this.data.developers || [];
    }

    getProjects() {
        return this.data.projects || [];
    }

    getFinancial() {
        return this.data.financial || [];
    }

    getQC() {
        return this.data.qc || [];
    }

    // ========== Методы для поиска по ID ==========
    
    getDeveloperById(id) {
        return this.data.developers?.find(d => d.id === id) || null;
    }

    getProjectById(projectId) {
        return this.data.projects?.find(p => p.project_id === projectId) || null;
    }

    // ========== Методы для получения связанных данных ==========
    
    getProjectsByDeveloper(devId) {
        return this.data.projects?.filter(p => p.developer_id === devId) || [];
    }

    getFinancialByDeveloper(devId) {
        return this.data.financial?.filter(f => f.developer_id === devId) || [];
    }

    getQCByProject(projectId) {
        return this.data.qc?.find(q => q.project_id === projectId) || null;
    }

    // ========== Методы для поиска ==========
    
    searchDevelopers(query) {
        const q = query.toLowerCase();
        return this.data.developers?.filter(d => 
            (d.Name_EN && d.Name_EN.toLowerCase().includes(q)) ||
            (d.Name_SA && d.Name_SA.includes(query)) ||
            (d.id && String(d.id).includes(q))
        ) || [];
    }

    searchProjects(query) {
        const q = query.toLowerCase();
        return this.data.projects?.filter(p => 
            (p.Project_name_EN && p.Project_name_EN.toLowerCase().includes(q)) ||
            (p.Project_name_SA && p.Project_name_SA.includes(query)) ||
            (p.project_id && String(p.project_id).includes(q))
        ) || [];
    }

    // ========== Вспомогательные методы ==========
    
    getDeveloperName(devId) {
        const developer = this.getDeveloperById(devId);
        return developer ? developer.Name_EN : `Developer #${devId}`;
    }

    getProjectTypes() {
        const projects = this.getProjects();
        return [...new Set(projects.map(p => p.Type).filter(Boolean))].sort();
    }

    getProjectStatuses() {
        const projects = this.getProjects();
        return [...new Set(projects.map(p => p.Status).filter(Boolean))].sort();
    }

// Методы для работы с plots (добавить в класс CSVLoader)

    getPlots() {
        return this.data.plots || [];
    }

    getPlotsWithLocation() {
        const plots = this.getPlots();
        return plots.filter(plot => plot.Location_Gmaps && plot.Location_Gmaps.trim());
    }
    
    getUnits() {
        return this.data.units || [];
    }

    getUnitsByProject(projectId) {
        return this.data.units?.filter(u => u.project_id === projectId) || [];
    }
    
}
console.log('CSVLoader class defined');