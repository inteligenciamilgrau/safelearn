document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-guide');
    const progressBar = document.getElementById('page-progress');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const firstSection = document.getElementById('intro');
            if (firstSection) {
                firstSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;

        if (progressBar) {
            progressBar.style.width = `${scrolled}%`;
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.phase-section').forEach((section) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.8s ease-out';
        observer.observe(section);
    });

    setupDataVerification();
});

function setupDataVerification() {
    const dataApi = window.StateIndicators || window.IbgePib;
    const panel = document.getElementById('pib-verification');
    const refreshButton = document.getElementById('refresh-pib');

    if (!dataApi || !panel || !refreshButton) {
        return;
    }

    const elements = {
        panel,
        refreshButton,
        status: document.getElementById('pib-status'),
        checkedAt: document.getElementById('pib-checked-at'),
        tableBody: document.getElementById('pib-table-body'),
        stateCount: document.getElementById('pib-state-count'),
        pibTotal: document.getElementById('pib-state-total'),
        pibDifference: document.getElementById('pib-difference'),
        populationTotal: document.getElementById('population-total'),
        populationDifference: document.getElementById('population-difference'),
        idhmSummary: document.getElementById('idhm-summary')
    };

    const setLoading = () => {
        panel.dataset.state = 'loading';
        refreshButton.disabled = true;
        refreshButton.textContent = 'Verificando...';
        elements.status.textContent = 'Consultando IBGE/SIDRA, aplicando a referência do IDHM 2021 e validando as 27 UFs.';
    };

    const setFailure = (error) => {
        panel.dataset.state = 'error';
        refreshButton.disabled = false;
        refreshButton.textContent = 'Tentar novamente';
        elements.status.textContent = `Falha na verificação: ${error.message}`;
        elements.checkedAt.textContent = 'As fontes oficiais não puderam ser validadas nesta tentativa.';
    };

    const loadVerification = async () => {
        setLoading();

        try {
            const verification = await dataApi.fetchStateIndicators();
            renderDataVerification(verification, elements);
        } catch (error) {
            setFailure(error);
        }
    };

    refreshButton.addEventListener('click', loadVerification);
    loadVerification();
}

function renderDataVerification(verification, elements) {
    const dataApi = window.StateIndicators || window.IbgePib;
    const formatter = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
    const idhmCategories = verification.checks.idhm.categories;

    elements.panel.dataset.state = verification.passed ? 'success' : 'warning';
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = 'Verificar novamente';

    elements.stateCount.textContent = `${verification.states.length}/27`;
    elements.pibTotal.textContent = dataApi.formatCompactCurrencyFromMilReais(verification.checks.pib.stateTotalMilReais);
    elements.pibDifference.textContent = `Diferença: ${dataApi.formatFullCurrencyFromMilReais(verification.checks.pib.absoluteDifferenceMilReais)}`;
    elements.populationTotal.textContent = dataApi.formatInteger(verification.checks.population.stateTotal);
    elements.populationDifference.textContent = `Diferença: ${dataApi.formatInteger(verification.checks.population.absoluteDifference)} pessoas`;
    elements.idhmSummary.textContent = `${idhmCategories['Muito alto']} / ${idhmCategories.Alto} / ${idhmCategories['Médio']}`;
    elements.checkedAt.textContent = `Verificado em ${formatter.format(new Date(verification.checkedAt))}.`;

    elements.status.textContent = verification.passed
        ? 'Verificação aprovada: PIB, população e IDHM cobrem as 27 UFs; PIB e população fecham com os totais Brasil; IDHM 2021 tem Brasil 0,766 e bate as faixas oficiais.'
        : 'Atenção: os dados chegaram, mas uma das regras de validação não passou. Confira as fontes oficiais antes de usar os números.';

    elements.tableBody.textContent = '';

    verification.states.forEach((state, index) => {
        const row = document.createElement('tr');
        const positionCell = document.createElement('td');
        const nameCell = document.createElement('td');
        const codeCell = document.createElement('td');
        const pibCell = document.createElement('td');
        const populationCell = document.createElement('td');
        const pibPerCapitaCell = document.createElement('td');
        const idhmCell = document.createElement('td');

        positionCell.textContent = String(index + 1);
        nameCell.textContent = state.name;
        codeCell.textContent = state.id;
        pibCell.textContent = dataApi.formatCompactCurrencyFromMilReais(state.pibMilReais);
        populationCell.textContent = dataApi.formatInteger(state.population);
        pibPerCapitaCell.textContent = dataApi.formatCurrency(state.pibPerCapita);
        idhmCell.textContent = `${dataApi.formatIdhm(state.idhm)} (${state.idhmCategory})`;

        row.append(positionCell, nameCell, codeCell, pibCell, populationCell, pibPerCapitaCell, idhmCell);
        elements.tableBody.appendChild(row);
    });
}
