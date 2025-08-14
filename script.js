// Simulador de Registros e Vetores de Registros - Módulo 2
// Estrutura de Dados - Prof. William Mendes

class RecordSimulator {
    constructor() {
        this.schema = null;
        this.records = [];
        this.currentPage = 1;
        this.recordsPerPage = 10;
        this.sortField = null;
        this.sortDirection = 'asc';
        this.editingIndex = -1;
        
        this.init();
        this.loadFromStorage();
    }

    init() {
        this.bindEvents();
        this.addInitialAttribute();
        this.updateTip("Bem-vindo ao Simulador! Comece definindo uma entidade no Designer de Registro.");
        this.initCodeTabs();
    }

    bindEvents() {
        // Designer de Registro
        document.getElementById('addAttributeBtn').addEventListener('click', () => this.addAttribute());
        document.getElementById('generateSimulatorBtn').addEventListener('click', () => this.generateSimulator());
        document.getElementById('entityName').addEventListener('input', () => this.validateSchema());

        // CRUD
        document.getElementById('recordForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('updateBtn').addEventListener('click', () => this.updateRecord());
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());
        
        // Busca e filtros
        document.getElementById('searchBtn').addEventListener('click', () => this.searchRecords());
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());
        document.getElementById('filterInput').addEventListener('input', (e) => this.filterRecords(e.target.value));
        
        // Controles da lista
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllRecords());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJson());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCsv());
        document.getElementById('importBtn').addEventListener('click', () => this.triggerImport());
        document.getElementById('importFile').addEventListener('change', (e) => this.importFile(e));
        
        // Paginação
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        
        // Memória
        document.getElementById('toggleMemoryBtn').addEventListener('click', () => this.toggleMemory());

        // Navegação suave
        document.querySelectorAll('nav a').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelector(anchor.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    }

    // === ABAS DE CÓDIGO ===
    
    initCodeTabs() {
        // Inicializar todas as abas de código
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                const tabContainer = e.target.closest('.code-tabs');
                
                // Remover classe active de todos os botões e conteúdos
                tabContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                tabContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Adicionar classe active ao botão clicado e conteúdo correspondente
                e.target.classList.add('active');
                tabContainer.querySelector(`#${tabName}`).classList.add('active');
            });
        });
    }

    // === DESIGNER DE REGISTRO ===
    
    addInitialAttribute() {
        this.addAttribute();
    }

    addAttribute() {
        const tbody = document.getElementById('attributesBody');
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <input type="text" class="attr-name" placeholder="Nome do atributo" required>
            </td>
            <td>
                <select class="attr-type" required>
                    <option value="">Selecione</option>
                    <option value="string">String/Cadeia</option>
                    <option value="integer">Inteiro</option>
                    <option value="real">Real</option>
                    <option value="boolean">Booleano</option>
                    <option value="date">Data</option>
                    <option value="enum">Enum (Lista)</option>
                </select>
            </td>
            <td>
                <div class="restrictions">
                    <label><input type="checkbox" class="required-check"> Obrigatório</label>
                    <label><input type="checkbox" class="unique-check"> Único</label>
                    <input type="number" class="min-val" placeholder="Mín" style="display:none;">
                    <input type="number" class="max-val" placeholder="Máx" style="display:none;">
                    <input type="text" class="enum-values" placeholder="Opções (sep. por vírgula)" style="display:none;">
                </div>
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm remove-attr">🗑</button>
            </td>
        `;

        tbody.appendChild(row);

        // Eventos para esta linha
        row.querySelector('.attr-type').addEventListener('change', (e) => this.handleTypeChange(e.target));
        row.querySelector('.remove-attr').addEventListener('click', () => this.removeAttribute(row));
        row.querySelector('.attr-name').addEventListener('input', () => this.validateSchema());

        this.validateSchema();
    }

    handleTypeChange(select) {
        const row = select.closest('tr');
        const type = select.value;
        const minVal = row.querySelector('.min-val');
        const maxVal = row.querySelector('.max-val');
        const enumValues = row.querySelector('.enum-values');

        // Esconder todos primeiro
        minVal.style.display = 'none';
        maxVal.style.display = 'none';
        enumValues.style.display = 'none';

        // Mostrar campos relevantes
        if (type === 'integer' || type === 'real') {
            minVal.style.display = 'inline-block';
            maxVal.style.display = 'inline-block';
        } else if (type === 'enum') {
            enumValues.style.display = 'inline-block';
        }

        this.validateSchema();
    }

    removeAttribute(row) {
        row.remove();
        this.validateSchema();
    }

    validateSchema() {
        const entityName = document.getElementById('entityName').value.trim();
        const rows = document.querySelectorAll('#attributesBody tr');
        
        let isValid = entityName.length > 0 && rows.length > 0;
        
        rows.forEach(row => {
            const name = row.querySelector('.attr-name').value.trim();
            const type = row.querySelector('.attr-type').value;
            
            if (!name || !type) {
                isValid = false;
            }
        });

        document.getElementById('generateSimulatorBtn').disabled = !isValid;
        return isValid;
    }

    generateSimulator() {
        if (!this.validateSchema()) return;

        const entityName = document.getElementById('entityName').value.trim();
        const rows = document.querySelectorAll('#attributesBody tr');
        
        this.schema = {
            entityName: entityName,
            attributes: []
        };

        rows.forEach(row => {
            const name = row.querySelector('.attr-name').value.trim();
            const type = row.querySelector('.attr-type').value;
            const required = row.querySelector('.required-check').checked;
            const unique = row.querySelector('.unique-check').checked;
            const minVal = row.querySelector('.min-val').value;
            const maxVal = row.querySelector('.max-val').value;
            const enumValues = row.querySelector('.enum-values').value;

            const attribute = {
                name: name,
                type: type,
                required: required,
                unique: unique
            };

            if (type === 'integer' || type === 'real') {
                if (minVal) attribute.min = parseFloat(minVal);
                if (maxVal) attribute.max = parseFloat(maxVal);
            } else if (type === 'enum' && enumValues) {
                attribute.options = enumValues.split(',').map(opt => opt.trim()).filter(opt => opt);
            }

            this.schema.attributes.push(attribute);
        });

        this.records = [];
        this.generateCrudForm();
        this.generateSearchFields();
        this.generateRecordsTable();
        this.updateRecordsList();
        this.updateMemoryDisplay();
        
        document.getElementById('crudPanel').style.display = 'block';
        
        this.saveToStorage();
        this.showToast(`Simulador gerado para a entidade "${entityName}"!`, 'success');
        this.updateTip(`Simulador criado! Agora você pode cadastrar registros da entidade "${entityName}". Cada registro é um agrupamento de dados heterogêneos.`);
    }

    // === CRUD OPERATIONS ===

    generateCrudForm() {
        const container = document.getElementById('dynamicFields');
        container.innerHTML = '';

        this.schema.attributes.forEach(attr => {
            const div = document.createElement('div');
            div.className = 'form-group';
            
            let input = '';
            switch (attr.type) {
                case 'string':
                    input = `<input type="text" id="field_${attr.name}" name="${attr.name}" ${attr.required ? 'required' : ''}>`;
                    break;
                case 'integer':
                    input = `<input type="number" step="1" id="field_${attr.name}" name="${attr.name}" ${attr.min !== undefined ? `min="${attr.min}"` : ''} ${attr.max !== undefined ? `max="${attr.max}"` : ''} ${attr.required ? 'required' : ''}>`;
                    break;
                case 'real':
                    input = `<input type="number" step="0.01" id="field_${attr.name}" name="${attr.name}" ${attr.min !== undefined ? `min="${attr.min}"` : ''} ${attr.max !== undefined ? `max="${attr.max}"` : ''} ${attr.required ? 'required' : ''}>`;
                    break;
                case 'boolean':
                    input = `<select id="field_${attr.name}" name="${attr.name}" ${attr.required ? 'required' : ''}>
                        <option value="">Selecione</option>
                        <option value="true">Verdadeiro</option>
                        <option value="false">Falso</option>
                    </select>`;
                    break;
                case 'date':
                    input = `<input type="date" id="field_${attr.name}" name="${attr.name}" ${attr.required ? 'required' : ''}>`;
                    break;
                case 'enum':
                    input = `<select id="field_${attr.name}" name="${attr.name}" ${attr.required ? 'required' : ''}>
                        <option value="">Selecione</option>
                        ${attr.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>`;
                    break;
            }

            div.innerHTML = `
                <label for="field_${attr.name}">
                    ${attr.name} ${attr.required ? '*' : ''} 
                    ${attr.unique ? '(único)' : ''}
                </label>
                ${input}
            `;

            container.appendChild(div);
        });
    }

    generateSearchFields() {
        const select = document.getElementById('searchField');
        select.innerHTML = '<option value="">Selecione um campo</option>';
        
        this.schema.attributes.forEach(attr => {
            const option = document.createElement('option');
            option.value = attr.name;
            option.textContent = attr.name;
            select.appendChild(option);
        });
    }

    generateRecordsTable() {
        const thead = document.getElementById('recordsTableHead');
        const headerRow = document.createElement('tr');
        
        // Cabeçalhos das colunas
        this.schema.attributes.forEach(attr => {
            const th = document.createElement('th');
            th.textContent = attr.name;
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => this.sortBy(attr.name));
            headerRow.appendChild(th);
        });

        // Coluna de ações
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Ações';
        headerRow.appendChild(actionsHeader);

        thead.innerHTML = '';
        thead.appendChild(headerRow);
    }

    handleSubmit(e) {
        e.preventDefault();
        
        if (this.editingIndex >= 0) {
            this.updateRecord();
        } else {
            this.createRecord();
        }
    }

    createRecord() {
        const formData = new FormData(document.getElementById('recordForm'));
        const record = {};
        
        // Validar e processar dados
        for (let attr of this.schema.attributes) {
            const value = formData.get(attr.name);
            
            // Validação de obrigatório
            if (attr.required && (!value || value.trim() === '')) {
                this.showToast(`O campo "${attr.name}" é obrigatório!`, 'error');
                return;
            }

            // Validação de unicidade
            if (attr.unique && value && this.records.some(r => r[attr.name] === value)) {
                this.showToast(`Violação de unicidade no campo "${attr.name}"!`, 'error');
                return;
            }

            // Conversão de tipos
            let processedValue = value;
            if (value) {
                switch (attr.type) {
                    case 'integer':
                        processedValue = parseInt(value);
                        if (isNaN(processedValue)) {
                            this.showToast(`Valor inválido para o campo "${attr.name}"!`, 'error');
                            return;
                        }
                        break;
                    case 'real':
                        processedValue = parseFloat(value);
                        if (isNaN(processedValue)) {
                            this.showToast(`Valor inválido para o campo "${attr.name}"!`, 'error');
                            return;
                        }
                        break;
                    case 'boolean':
                        processedValue = value === 'true';
                        break;
                }

                // Validação de faixas
                if ((attr.type === 'integer' || attr.type === 'real') && processedValue !== null) {
                    if (attr.min !== undefined && processedValue < attr.min) {
                        this.showToast(`Valor do campo "${attr.name}" deve ser maior ou igual a ${attr.min}!`, 'error');
                        return;
                    }
                    if (attr.max !== undefined && processedValue > attr.max) {
                        this.showToast(`Valor do campo "${attr.name}" deve ser menor ou igual a ${attr.max}!`, 'error');
                        return;
                    }
                }
            }

            record[attr.name] = processedValue || null;
        }

        // Verificar limite
        if (this.records.length >= this.recordsPerPage * 10) { // Limite de 100 registros
            this.showToast('Limite de registros atingido!', 'warning');
            return;
        }

        this.records.push(record);
        this.updateRecordsList();
        this.updateMemoryDisplay();
        this.clearForm();
        this.saveToStorage();
        
        this.showToast('Registro cadastrado com sucesso! Você criou um registro — um agrupamento de dados heterogêneos sob um único nome.', 'success');
        this.updateTip('Registro criado! Em memória, adicionamos um objeto ao vetor de registros. Cada linha da tabela representa um registro.');
    }

    updateRecord() {
        if (this.editingIndex < 0) return;

        const formData = new FormData(document.getElementById('recordForm'));
        const record = {};
        
        // Validar e processar dados (similar ao createRecord)
        for (let attr of this.schema.attributes) {
            const value = formData.get(attr.name);
            
            if (attr.required && (!value || value.trim() === '')) {
                this.showToast(`O campo "${attr.name}" é obrigatório!`, 'error');
                return;
            }

            // Validação de unicidade (excluindo o registro atual)
            if (attr.unique && value && this.records.some((r, i) => i !== this.editingIndex && r[attr.name] === value)) {
                this.showToast(`Violação de unicidade no campo "${attr.name}"!`, 'error');
                return;
            }

            let processedValue = value;
            if (value) {
                switch (attr.type) {
                    case 'integer':
                        processedValue = parseInt(value);
                        break;
                    case 'real':
                        processedValue = parseFloat(value);
                        break;
                    case 'boolean':
                        processedValue = value === 'true';
                        break;
                }
            }

            record[attr.name] = processedValue || null;
        }

        this.records[this.editingIndex] = record;
        this.editingIndex = -1;
        
        this.updateRecordsList();
        this.updateMemoryDisplay();
        this.clearForm();
        this.saveToStorage();
        
        document.getElementById('updateBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
        document.querySelector('#recordForm button[type="submit"]').style.display = 'inline-block';
        
        this.showToast('Registro atualizado com sucesso! Você alterou um campo de um registro específico.', 'success');
        this.updateTip('Atualização realizada! Isso simula a edição da "linha" na sua tabela lógica.');
    }

    editRecord(index) {
        this.editingIndex = index;
        const record = this.records[index];
        
        // Preencher formulário
        this.schema.attributes.forEach(attr => {
            const field = document.getElementById(`field_${attr.name}`);
            if (field) {
                if (attr.type === 'boolean') {
                    field.value = record[attr.name] === true ? 'true' : record[attr.name] === false ? 'false' : '';
                } else {
                    field.value = record[attr.name] || '';
                }
            }
        });

        // Mostrar botões de edição
        document.getElementById('updateBtn').style.display = 'inline-block';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        document.querySelector('#recordForm button[type="submit"]').style.display = 'none';
        
        this.updateTip('Modo de edição ativado! Modifique os campos e clique em "Atualizar".');
    }

    cancelEdit() {
        this.editingIndex = -1;
        this.clearForm();
        
        document.getElementById('updateBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
        document.querySelector('#recordForm button[type="submit"]').style.display = 'inline-block';
        
        this.updateTip('Edição cancelada. Você pode cadastrar novos registros ou editar existentes.');
    }

    deleteRecord(index) {
        if (confirm('Tem certeza que deseja remover este registro?')) {
            this.records.splice(index, 1);
            this.updateRecordsList();
            this.updateMemoryDisplay();
            this.saveToStorage();
            this.showToast('Registro removido com sucesso!', 'success');
            this.updateTip('Registro removido do vetor. A estrutura de dados foi atualizada.');
        }
    }

    clearForm() {
        document.getElementById('recordForm').reset();
    }

    clearAllRecords() {
        if (confirm('Tem certeza que deseja limpar todos os registros?')) {
            this.records = [];
            this.updateRecordsList();
            this.updateMemoryDisplay();
            this.saveToStorage();
            this.showToast('Todos os registros foram removidos!', 'success');
            this.updateTip('Vetor de registros limpo! Agora você pode começar novamente.');
        }
    }

    // === BUSCA E FILTROS ===

    searchRecords() {
        const field = document.getElementById('searchField').value;
        const value = document.getElementById('searchValue').value.trim();
        
        if (!field || !value) {
            this.showToast('Selecione um campo e digite um valor para buscar!', 'warning');
            return;
        }

        const results = this.records.filter(record => {
            const recordValue = record[field];
            if (recordValue === null || recordValue === undefined) return false;
            
            return recordValue.toString().toLowerCase().includes(value.toLowerCase());
        });

        this.displaySearchResults(results);
        this.updateTip(`Busca realizada! A busca percorre o vetor comparando o campo "${field}" — pense em percorrer a coleção sequencialmente.`);
    }

    clearSearch() {
        document.getElementById('searchField').value = '';
        document.getElementById('searchValue').value = '';
        document.getElementById('filterInput').value = '';
        this.updateRecordsList();
        this.updateTip('Busca limpa! Exibindo todos os registros novamente.');
    }

    filterRecords(filterText) {
        if (!filterText.trim()) {
            this.updateRecordsList();
            return;
        }

        const filtered = this.records.filter(record => {
            return this.schema.attributes.some(attr => {
                const value = record[attr.name];
                if (value === null || value === undefined) return false;
                return value.toString().toLowerCase().includes(filterText.toLowerCase());
            });
        });

        this.displaySearchResults(filtered);
    }

    displaySearchResults(results) {
        const tbody = document.getElementById('recordsTableBody');
        tbody.innerHTML = '';

        if (results.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="${this.schema.attributes.length + 1}" style="text-align: center; color: #666;">Nenhum registro encontrado</td>`;
            tbody.appendChild(row);
            return;
        }

        results.forEach((record, index) => {
            const row = this.createRecordRow(record, this.records.indexOf(record));
            tbody.appendChild(row);
        });

        // Atualizar informações de paginação
        document.getElementById('pageInfo').textContent = `${results.length} registro(s) encontrado(s)`;
    }

    // === LISTAGEM E PAGINAÇÃO ===

    updateRecordsList() {
        if (!this.schema) return;

        const tbody = document.getElementById('recordsTableBody');
        tbody.innerHTML = '';

        if (this.records.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="${this.schema.attributes.length + 1}" style="text-align: center; color: #666;">Nenhum registro cadastrado</td>`;
            tbody.appendChild(row);
            this.updatePaginationInfo();
            return;
        }

        // Aplicar ordenação
        let sortedRecords = [...this.records];
        if (this.sortField) {
            sortedRecords.sort((a, b) => {
                let aVal = a[this.sortField];
                let bVal = b[this.sortField];
                
                // Tratar valores nulos
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';
                
                // Comparação
                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Paginação
        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = startIndex + this.recordsPerPage;
        const pageRecords = sortedRecords.slice(startIndex, endIndex);

        pageRecords.forEach((record, pageIndex) => {
            const originalIndex = this.records.indexOf(record);
            const row = this.createRecordRow(record, originalIndex);
            tbody.appendChild(row);
        });

        this.updatePaginationInfo();
        this.updateSortIndicators();
        this.updateTip('Esta tabela representa o vetor; cada linha é um registro, cada coluna é um campo.');
    }

    createRecordRow(record, originalIndex) {
        const row = document.createElement('tr');
        
        // Dados do registro
        this.schema.attributes.forEach(attr => {
            const td = document.createElement('td');
            let value = record[attr.name];
            
            if (value === null || value === undefined) {
                value = '';
            } else if (attr.type === 'boolean') {
                value = value ? 'Verdadeiro' : 'Falso';
            }
            
            td.textContent = value;
            row.appendChild(td);
        });

        // Ações
        const actionsTd = document.createElement('td');
        actionsTd.innerHTML = `
            <button class="btn btn-warning btn-sm" onclick="simulator.editRecord(${originalIndex})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="simulator.deleteRecord(${originalIndex})">🗑️</button>
        `;
        row.appendChild(actionsTd);

        return row;
    }

    sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        this.updateRecordsList();
    }

    updateSortIndicators() {
        // Remover indicadores existentes
        document.querySelectorAll('#recordsTableHead th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });

        // Adicionar indicador atual
        if (this.sortField) {
            const headers = document.querySelectorAll('#recordsTableHead th');
            const fieldIndex = this.schema.attributes.findIndex(attr => attr.name === this.sortField);
            if (fieldIndex >= 0 && headers[fieldIndex]) {
                headers[fieldIndex].classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }

    updatePaginationInfo() {
        const totalPages = Math.ceil(this.records.length / this.recordsPerPage);
        document.getElementById('pageInfo').textContent = `Página ${this.currentPage} de ${totalPages || 1}`;
        
        document.getElementById('prevPageBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage >= totalPages;
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateRecordsList();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.records.length / this.recordsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateRecordsList();
        }
    }

    // === IMPORT/EXPORT ===

    exportJson() {
        const data = {
            schema: this.schema,
            records: this.records,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.schema.entityName}_registros.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Dados exportados em JSON!', 'success');
    }

    exportCsv() {
        if (this.records.length === 0) {
            this.showToast('Nenhum registro para exportar!', 'warning');
            return;
        }

        // Cabeçalho
        const headers = this.schema.attributes.map(attr => attr.name);
        let csv = headers.join(',') + '\n';

        // Dados
        this.records.forEach(record => {
            const row = this.schema.attributes.map(attr => {
                let value = record[attr.name];
                if (value === null || value === undefined) value = '';
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`;
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.schema.entityName}_registros.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Dados exportados em CSV!', 'success');
    }

    triggerImport() {
        document.getElementById('importFile').click();
    }

    importFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(e.target.result);
                    if (data.schema && data.records) {
                        this.schema = data.schema;
                        this.records = data.records;
                        this.generateCrudForm();
                        this.generateSearchFields();
                        this.generateRecordsTable();
                        this.updateRecordsList();
                        this.updateMemoryDisplay();
                        document.getElementById('crudPanel').style.display = 'block';
                        this.showToast('Dados importados com sucesso!', 'success');
                    }
                } else if (file.name.endsWith('.csv')) {
                    // Implementação básica de importação CSV
                    this.showToast('Importação CSV não implementada nesta versão.', 'warning');
                }
            } catch (error) {
                this.showToast('Erro ao importar arquivo!', 'error');
            }
        };
        reader.readAsText(file);
    }

    // === MEMÓRIA SIMULADA ===

    toggleMemory() {
        const display = document.getElementById('memoryDisplay');
        display.style.display = display.style.display === 'none' ? 'block' : 'none';
        
        if (display.style.display === 'block') {
            this.updateMemoryDisplay();
        }
    }

    updateMemoryDisplay() {
        const display = document.getElementById('memoryDisplay');
        const data = {
            schema: this.schema,
            records: this.records,
            totalRecords: this.records.length
        };
        
        display.textContent = JSON.stringify(data, null, 2);
    }

    // === DICAS E FEEDBACK ===

    updateTip(message) {
        const tipBox = document.getElementById('tipBox');
        if (tipBox) {
            tipBox.innerHTML = `<p><strong>💡 Dica:</strong></p><p>${message}</p>`;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // === PERSISTÊNCIA ===

    saveToStorage() {
        if (this.schema) {
            localStorage.setItem('recordSimulator_schema', JSON.stringify(this.schema));
            localStorage.setItem('recordSimulator_records', JSON.stringify(this.records));
        }
    }

    loadFromStorage() {
        try {
            const savedSchema = localStorage.getItem('recordSimulator_schema');
            const savedRecords = localStorage.getItem('recordSimulator_records');
            
            if (savedSchema && savedRecords) {
                this.schema = JSON.parse(savedSchema);
                this.records = JSON.parse(savedRecords);
                
                if (this.schema) {
                    // Restaurar interface
                    document.getElementById('entityName').value = this.schema.entityName;
                    
                    // Restaurar atributos
                    const tbody = document.getElementById('attributesBody');
                    tbody.innerHTML = '';
                    
                    this.schema.attributes.forEach(attr => {
                        this.addAttribute();
                        const lastRow = tbody.lastElementChild;
                        lastRow.querySelector('.attr-name').value = attr.name;
                        lastRow.querySelector('.attr-type').value = attr.type;
                        lastRow.querySelector('.required-check').checked = attr.required;
                        lastRow.querySelector('.unique-check').checked = attr.unique;
                        
                        if (attr.min !== undefined) lastRow.querySelector('.min-val').value = attr.min;
                        if (attr.max !== undefined) lastRow.querySelector('.max-val').value = attr.max;
                        if (attr.options) lastRow.querySelector('.enum-values').value = attr.options.join(', ');
                        
                        this.handleTypeChange(lastRow.querySelector('.attr-type'));
                    });
                    
                    this.generateCrudForm();
                    this.generateSearchFields();
                    this.generateRecordsTable();
                    this.updateRecordsList();
                    this.updateMemoryDisplay();
                    document.getElementById('crudPanel').style.display = 'block';
                    
                    this.updateTip(`Dados restaurados! Entidade "${this.schema.entityName}" com ${this.records.length} registro(s).`);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados salvos:', error);
        }
    }
}

// Inicializar simulador quando a página carregar
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new RecordSimulator();
});

